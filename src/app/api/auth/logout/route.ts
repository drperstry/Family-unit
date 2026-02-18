import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { successResponse } from '@/lib/utils';
import { blacklistToken } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Get current user before logging out
    const user = await getCurrentUser(request);

    // Get tokens to blacklist
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : request.cookies.get('auth-token')?.value;
    const refreshToken = request.cookies.get('refresh-token')?.value;

    // Blacklist tokens to prevent reuse
    if (accessToken) {
      blacklistToken(accessToken);
    }
    if (refreshToken) {
      blacklistToken(refreshToken);
    }

    if (user) {
      // Log the logout
      await audit.logout({ user, request });
    }

    // Clear cookies
    const response = successResponse(null, 'Logout successful');

    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even on error
    const response = successResponse(null, 'Logout successful');
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    return response;
  }
}
