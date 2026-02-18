import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/utils';
import { checkRateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and brute force protection
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Rate limit: 10 login attempts per minute per IP
    const rateLimitKey = `login:${clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 60 * 1000);
    if (!rateLimit.allowed) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

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

    // Authenticate user with brute force protection
    const result = await authenticateUser(email, password, clientIp);

    // Handle locked account response
    if (result && 'error' in result) {
      return errorResponse(result.error, 429);
    }

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
