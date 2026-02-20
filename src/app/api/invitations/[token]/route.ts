import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { Family } from '@/models/Family';
import { User } from '@/models/User';
import { FamilyMember } from '@/models/FamilyMember';
import { getCurrentUser, generateToken, generateRefreshToken } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, ContentStatus, Gender } from '@/types';
import { getSecurityConfig } from '@/lib/config';
import { isValidPassword } from '@/lib/utils';
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils';
import { cookies } from 'next/headers';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params;

    if (!token) {
      return errorResponse('Invitation token is required', 400);
    }

    await connectDB();

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
    }).populate('familyId', 'name slug logo description');

    if (!invitation) {
      return notFoundResponse('Invitation not found or expired');
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return errorResponse('This invitation has expired', 410);
    }

    return successResponse({
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      family: invitation.familyId,
      expiresAt: invitation.expiresAt,
      message: invitation.message,
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return errorResponse('Failed to get invitation details', 500);
  }
}

// POST /api/invitations/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params;

    if (!token) {
      return errorResponse('Invitation token is required', 400);
    }

    const body = await request.json();
    const {
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bio,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.errors[0];
      }
    }

    if (!firstName || firstName.trim().length < 1) {
      errors.firstName = 'First name is required';
    }

    if (!lastName || lastName.trim().length < 1) {
      errors.lastName = 'Last name is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    // Find and validate invitation
    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
    }).populate('familyId');

    if (!invitation) {
      return notFoundResponse('Invitation not found or already used');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return errorResponse('This invitation has expired', 410);
    }

    const family = await Family.findById(invitation.familyId);
    if (!family) {
      return errorResponse('Family no longer exists', 400);
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      // If user exists but in different family, link them
      if (existingUser.familyId && existingUser.familyId.toString() !== family._id.toString()) {
        return errorResponse('This email is already registered to another family', 409);
      }

      // If user exists without family, update them
      if (!existingUser.familyId) {
        existingUser.familyId = family._id;
        existingUser.role = invitation.role === 'admin' ? UserRole.FAMILY_ADMIN : UserRole.FAMILY_MEMBER;
        await existingUser.save();

        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        invitation.acceptedBy = existingUser._id;
        await invitation.save();

        return successResponse({
          message: 'Your account has been linked to the family',
          familyId: family._id.toString(),
        });
      }
    }

    // Get security config for bcrypt rounds
    let bcryptRounds = 12;
    try {
      const securityConfig = await getSecurityConfig();
      bcryptRounds = securityConfig.bcryptRounds || 12;
    } catch {
      // Use default
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Create user
    const user = await User.create({
      email: invitation.email,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: invitation.role === 'admin' ? UserRole.FAMILY_ADMIN : UserRole.FAMILY_MEMBER,
      familyId: family._id,
      isEmailVerified: true, // Email verified via invitation
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          approvalAlerts: true,
          familyUpdates: true,
        },
      },
      profile: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender: gender as Gender,
        bio: bio?.trim(),
      },
    });

    // Create family member record
    await FamilyMember.create({
      familyId: family._id,
      userId: user._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: gender as Gender || Gender.OTHER,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      bio: bio?.trim(),
      status: ContentStatus.APPROVED,
      role: invitation.role,
      generation: 1,
      position: { x: 0, y: 0, level: 1 },
      lineage: [],
      childrenIds: [],
      joinedAt: new Date(),
      createdBy: invitation.invitedBy,
    });

    // Update invitation
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = user._id;
    await invitation.save();

    // Update family stats
    await Family.findByIdAndUpdate(family._id, {
      $inc: { 'stats.memberCount': 1 },
    });

    // Generate auth tokens
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      familyId: family._id.toString(),
    };
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    // Audit
    await audit.memberAdd(
      { user: { ...user.toObject(), _id: user._id.toString() }, request },
      family._id.toString(),
      user._id.toString(),
      `${firstName} ${lastName}`
    );

    return successResponse({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      family: {
        id: family._id.toString(),
        name: family.name,
        slug: family.slug,
      },
      accessToken,
    }, 'Welcome to the family!');
  } catch (error) {
    console.error('Accept invitation error:', error);
    return errorResponse('Failed to accept invitation', 500);
  }
}
