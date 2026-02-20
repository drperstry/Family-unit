import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { Family } from '@/models/Family';
import { User } from '@/models/User';
import { SiteSettings } from '@/models/SiteSettings';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole } from '@/types';
import { getFamilyInviteSettings } from '@/lib/config';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  isValidEmail,
  isValidObjectId,
  parsePaginationQuery,
  buildPaginationInfo,
} from '@/lib/utils';

// GET /api/invitations - List invitations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to view invitations');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const pagination = parsePaginationQuery(searchParams, 'default');

    await connectDB();

    // Check if user is admin
    const isAdmin = user.role === UserRole.SYSTEM_ADMIN ||
                   user.role === UserRole.FAMILY_ADMIN;

    const query: Record<string, unknown> = {
      familyId: user.familyId,
    };

    // Non-admins can only see their own invitations
    if (!isAdmin) {
      query.invitedBy = user._id;
    }

    if (status && ['pending', 'accepted', 'expired', 'cancelled'].includes(status)) {
      query.status = status;
    }

    const [invitations, total] = await Promise.all([
      Invitation.find(query)
        .sort({ createdAt: -1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('invitedBy', 'firstName lastName email')
        .populate('acceptedBy', 'firstName lastName email')
        .lean(),
      Invitation.countDocuments(query),
    ]);

    return successResponse(
      invitations,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List invitations error:', error);
    return errorResponse('Failed to list invitations', 500);
  }
}

// POST /api/invitations - Create invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to send invitations');
    }

    const body = await request.json();
    const { email, firstName, lastName, role, message } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!email || !isValidEmail(email)) {
      errors.email = 'Valid email is required';
    }

    if (role && !['admin', 'member', 'guest'].includes(role)) {
      errors.role = 'Invalid role';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    // Get family and settings
    const family = await Family.findById(user.familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Get invite settings
    const inviteSettings = await getFamilyInviteSettings(user.familyId);

    // Check if user can invite
    const isAdmin = user.role === UserRole.SYSTEM_ADMIN ||
                   user.role === UserRole.FAMILY_ADMIN;

    if (!isAdmin && !inviteSettings.allowMemberInvites) {
      return forbiddenResponse('Only admins can send invitations in this family');
    }

    // Check invite limit for non-admins
    if (!isAdmin) {
      const userInviteCount = await Invitation.countDocuments({
        familyId: user.familyId,
        invitedBy: user._id,
        status: 'pending',
      });

      if (userInviteCount >= inviteSettings.maxInvitesPerMember) {
        return errorResponse(
          `You have reached the maximum of ${inviteSettings.maxInvitesPerMember} pending invitations`,
          400
        );
      }
    }

    // Check if email already has pending invitation
    const existingInvitation = await Invitation.findOne({
      familyId: user.familyId,
      email: email.toLowerCase(),
      status: 'pending',
    });

    if (existingInvitation) {
      return errorResponse('An invitation is already pending for this email', 409);
    }

    // Check if user already exists in family
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      familyId: user.familyId,
    });

    if (existingUser) {
      return errorResponse('This email is already registered to a family member', 409);
    }

    // Calculate expiry
    const expiryDays = inviteSettings.inviteLinkExpiryDays || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Create invitation
    const invitation = await Invitation.create({
      familyId: user.familyId,
      email: email.toLowerCase(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      role: role || 'member',
      token: (Invitation as typeof Invitation & { generateToken(): string }).generateToken(),
      invitedBy: new Types.ObjectId(user._id),
      status: inviteSettings.requireAdminApproval && !isAdmin ? 'pending' : 'pending',
      expiresAt,
      message: message?.trim(),
    });

    // Audit
    await audit.create(
      { user, request },
      user.familyId,
      invitation._id.toString(),
      'invitation',
      `Invitation to ${email}`
    );

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation, family);

    return successResponse({
      id: invitation._id.toString(),
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${invitation.token}`,
    }, 'Invitation sent successfully');
  } catch (error) {
    console.error('Create invitation error:', error);
    return errorResponse('Failed to create invitation', 500);
  }
}

// DELETE /api/invitations?id=xxx - Cancel invitation
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId || !isValidObjectId(invitationId)) {
      return errorResponse('Valid invitation ID is required', 400);
    }

    await connectDB();

    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      return notFoundResponse('Invitation');
    }

    // Check permission
    const isAdmin = user.role === UserRole.SYSTEM_ADMIN ||
                   user.role === UserRole.FAMILY_ADMIN;
    const isOwner = invitation.invitedBy.toString() === user._id;

    if (!isAdmin && !isOwner) {
      return forbiddenResponse('You cannot cancel this invitation');
    }

    if (invitation.status !== 'pending') {
      return errorResponse('Only pending invitations can be cancelled', 400);
    }

    invitation.status = 'cancelled';
    await invitation.save();

    await audit.delete(
      { user, request },
      invitation.familyId.toString(),
      invitation._id.toString(),
      'invitation',
      `Cancelled invitation to ${invitation.email}`,
      'User cancelled'
    );

    return successResponse(null, 'Invitation cancelled successfully');
  } catch (error) {
    console.error('Cancel invitation error:', error);
    return errorResponse('Failed to cancel invitation', 500);
  }
}
