import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { generateToken, generateRefreshToken } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, JWTPayload, SafeUser } from '@/types';
import { errorResponse, successResponse, validationErrorResponse, isValidPassword } from '@/lib/utils';
import { checkRateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Rate limit: 5 registration attempts per hour per IP
    const rateLimitKey = `register:${clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return errorResponse('Too many registration attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!email || typeof email !== 'string') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required';
    } else {
      // SECURITY FIX: Enforce strong password policy
      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.errors.join('. ');
      }
    }

    if (!firstName || typeof firstName !== 'string') {
      errors.firstName = 'First name is required';
    }

    if (!lastName || typeof lastName !== 'string') {
      errors.lastName = 'Last name is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    // Create user - default to GUEST role unless becoming a family admin
    const userRole = role === UserRole.FAMILY_ADMIN ? UserRole.FAMILY_ADMIN : UserRole.GUEST;

    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: userRole,
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
    });

    await user.save();

    // Generate tokens
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
      familyId: user.familyId?.toString(),
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const safeUser: SafeUser = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role as UserRole,
      familyId: user.familyId?.toString(),
      preferences: user.preferences,
    };

    // Log the registration
    await audit.login(
      { user: safeUser, request },
    );

    // Set cookies and return response
    const response = successResponse(
      { user: safeUser, token, refreshToken },
      'Registration successful'
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}
