import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/types';
import { getUserPermissions, buildPermissionContext } from '@/lib/permissions';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/permissions - Get user's effective permissions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorizedResponse();
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User');
    }

    // Users can view their own permissions, admins can view others
    const isOwnProfile = currentUser._id.toString() === id;
    const isAdmin = currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.FAMILY_ADMIN;

    if (!isOwnProfile && !isAdmin) {
      return forbiddenResponse('You do not have access to view this user\'s permissions');
    }

    // Family admins can only view users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN && !isOwnProfile) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only view permissions for users in your family');
      }
    }

    const permissions = await getUserPermissions(id);

    return successResponse({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      ...permissions,
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return errorResponse('Failed to get user permissions', 500);
  }
}

// PATCH /api/users/[id]/permissions - Update user's custom permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Only admins can modify custom permissions
    if (currentUser.role !== UserRole.FAMILY_ADMIN && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can modify custom permissions');
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    const body = await request.json();
    const { customPermissions } = body;

    if (!Array.isArray(customPermissions)) {
      return errorResponse('customPermissions must be an array', 400);
    }

    // Validate custom permissions format
    for (const perm of customPermissions) {
      if (typeof perm.permission !== 'string' || typeof perm.granted !== 'boolean') {
        return errorResponse('Each permission must have a permission string and granted boolean', 400);
      }
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User');
    }

    // Family admins can only modify users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only modify permissions for users in your family');
      }
    }

    (user as any).customPermissions = customPermissions;
    await user.save();

    return successResponse({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      customPermissions: (user as any).customPermissions,
    }, 'Custom permissions updated successfully');
  } catch (error) {
    console.error('Update custom permissions error:', error);
    return errorResponse('Failed to update custom permissions', 500);
  }
}

// PUT /api/users/[id]/permissions - Set a specific custom permission
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Only admins can modify custom permissions
    if (currentUser.role !== UserRole.FAMILY_ADMIN && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can modify custom permissions');
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    const body = await request.json();
    const { permission, granted } = body;

    if (typeof permission !== 'string' || !permission) {
      return errorResponse('Permission key is required', 400);
    }

    if (typeof granted !== 'boolean') {
      return errorResponse('Granted must be a boolean', 400);
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User');
    }

    // Family admins can only modify users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only modify permissions for users in your family');
      }
    }

    // Remove existing permission if present
    const userAny = user as any;
    userAny.customPermissions = (userAny.customPermissions || []).filter(
      (p: { permission: string }) => p.permission !== permission
    );

    // Add the new permission
    userAny.customPermissions.push({ permission, granted });
    await user.save();

    return successResponse({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      customPermissions: userAny.customPermissions,
    }, `Permission ${granted ? 'granted' : 'revoked'} successfully`);
  } catch (error) {
    console.error('Set custom permission error:', error);
    return errorResponse('Failed to set custom permission', 500);
  }
}
