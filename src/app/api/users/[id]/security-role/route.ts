import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { SecurityRole } from '@/models/SecurityRole';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/types';
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

// GET /api/users/[id]/security-role - Get user's security role
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

    const user = await User.findById(id)
      .populate({
        path: 'securityRoleId',
        select: 'name description entityPrivileges specialPermissions isSystemRole',
      })
      .select('firstName lastName email role securityRoleId customPermissions');

    if (!user) {
      return notFoundResponse('User');
    }

    // Users can view their own role, admins can view others
    const isOwnProfile = currentUser._id.toString() === id;
    const isAdmin = currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.FAMILY_ADMIN;

    if (!isOwnProfile && !isAdmin) {
      return forbiddenResponse('You do not have access to view this user\'s security role');
    }

    // Family admins can only view users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN && !isOwnProfile) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only view security roles for users in your family');
      }
    }

    return successResponse({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      securityRole: (user as any).securityRoleId,
      customPermissions: (user as any).customPermissions || [],
    });
  } catch (error) {
    console.error('Get user security role error:', error);
    return errorResponse('Failed to get user security role', 500);
  }
}

// PUT /api/users/[id]/security-role - Assign security role to user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Only admins can assign security roles
    if (currentUser.role !== UserRole.FAMILY_ADMIN && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can assign security roles');
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    const body = await request.json();
    const { securityRoleId } = body;

    if (!securityRoleId || !isValidObjectId(securityRoleId)) {
      return errorResponse('Valid security role ID is required', 400);
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User');
    }

    // Family admins can only modify users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only assign security roles to users in your family');
      }
    }

    const securityRole = await SecurityRole.findById(securityRoleId);
    if (!securityRole) {
      return notFoundResponse('Security role');
    }

    // Check if the role is accessible
    if (!securityRole.isSystemRole) {
      const roleFamily = securityRole.familyId?.toString();
      if (currentUser.role === UserRole.FAMILY_ADMIN && roleFamily !== currentUser.familyId) {
        return forbiddenResponse('You cannot assign roles from other families');
      }
    }

    (user as any).securityRoleId = new Types.ObjectId(securityRoleId);
    await user.save();

    await user.populate('securityRoleId', 'name description');

    return successResponse({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      securityRole: (user as any).securityRoleId,
    }, 'Security role assigned successfully');
  } catch (error) {
    console.error('Assign security role error:', error);
    return errorResponse('Failed to assign security role', 500);
  }
}

// DELETE /api/users/[id]/security-role - Remove security role from user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Only admins can remove security roles
    if (currentUser.role !== UserRole.FAMILY_ADMIN && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can remove security roles');
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User');
    }

    // Family admins can only modify users in their family
    if (currentUser.role === UserRole.FAMILY_ADMIN) {
      if (user.familyId?.toString() !== currentUser.familyId) {
        return forbiddenResponse('You can only remove security roles from users in your family');
      }
    }

    (user as any).securityRoleId = undefined;
    await user.save();

    return successResponse(null, 'Security role removed successfully');
  } catch (error) {
    console.error('Remove security role error:', error);
    return errorResponse('Failed to remove security role', 500);
  }
}
