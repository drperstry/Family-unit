import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!email || typeof email !== 'string') {
      errors.email = 'Email is required';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Authenticate user
    const result = await authenticateUser(email, password);

    if (!result) {
      return errorResponse('Invalid email or password', 401);
    }

    const { user, token, refreshToken } = result;

    // Log the login
    await audit.login({ user, request });

    // Set cookies and return response
    const response = successResponse(
      { user, token, refreshToken },
      'Login successful'
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
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
}
