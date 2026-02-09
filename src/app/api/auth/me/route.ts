import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/utils';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // If user has a family, include family info
    let family = null;
    if (user.familyId) {
      await connectDB();
      family = await Family.findById(user.familyId).select('name slug logo status visibility');
    }

    return successResponse({
      user,
      family,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Failed to get user', 500);
  }
}
