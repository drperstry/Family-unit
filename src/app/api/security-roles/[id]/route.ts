import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { SecurityRole, ENTITY_TYPES, ACCESS_LEVELS, PRIVILEGE_TYPES } from '@/models/SecurityRole';
import { User } from '@/models/User';
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
import { sanitizeObject } from '@/lib/security';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/security-roles/[id] - Get a specific security role
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid security role ID', 400);
    }

    await connectDB();

    const securityRole = await SecurityRole.findById(id)
      .populate('createdBy', 'firstName lastName');

    if (!securityRole) {
      return notFoundResponse('Security role');
    }

    // Check access - family admins can only see their family's roles or system roles
    if (user.role === UserRole.FAMILY_ADMIN) {
      const roleFamily = securityRole.familyId?.toString();
      if (!securityRole.isSystemRole && roleFamily !== user.familyId) {
        return forbiddenResponse('You do not have access to this security role');
      }
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can view security roles');
    }

    return successResponse(securityRole);
  } catch (error) {
    console.error('Get security role error:', error);
    return errorResponse('Failed to get security role', 500);
  }
}

// PATCH /api/security-roles/[id] - Update a security role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid security role ID', 400);
    }

    await connectDB();

    const securityRole = await SecurityRole.findById(id);

    if (!securityRole) {
      return notFoundResponse('Security role');
    }

    // System roles can only be modified by system admins
    if (securityRole.isSystemRole && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system admins can modify system roles');
    }

    // Check access - family admins can only modify their family's roles
    if (user.role === UserRole.FAMILY_ADMIN) {
      const roleFamily = securityRole.familyId?.toString();
      if (roleFamily !== user.familyId) {
        return forbiddenResponse('You do not have access to modify this security role');
      }
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can modify security roles');
    }

    const body = await request.json();
    const {
      name,
      description,
      entityPrivileges,
      specialPermissions,
    } = body;

    // Validate entity privileges if provided
    if (entityPrivileges) {
      for (const ep of entityPrivileges) {
        if (!ENTITY_TYPES.includes(ep.entity)) {
          return errorResponse(`Invalid entity type: ${ep.entity}`, 400);
        }
        for (const [privType, accessLevel] of Object.entries(ep.privileges || {})) {
          if (!PRIVILEGE_TYPES.includes(privType as any)) {
            return errorResponse(`Invalid privilege type: ${privType}`, 400);
          }
          if (!ACCESS_LEVELS.includes(accessLevel as any)) {
            return errorResponse(`Invalid access level: ${accessLevel}`, 400);
          }
        }
      }
    }

    // Update fields
    if (name !== undefined) securityRole.name = name;
    if (description !== undefined) securityRole.description = description;
    if (entityPrivileges !== undefined) securityRole.entityPrivileges = entityPrivileges;
    if (specialPermissions !== undefined) {
      // SECURITY FIX: Sanitize to prevent prototype pollution
      const sanitizedPermissions = sanitizeObject(specialPermissions);
      // Only allow known permission keys
      const allowedKeys = [
        'canManageUsers', 'canApproveContent', 'canViewReports',
        'canExportData', 'canImportData', 'canManageSettings',
        'canManageRoles', 'canViewAuditLogs', 'canBulkOperations'
      ];
      for (const key of Object.keys(sanitizedPermissions)) {
        if (allowedKeys.includes(key) && typeof sanitizedPermissions[key] === 'boolean') {
          (securityRole.specialPermissions as Record<string, boolean>)[key] = sanitizedPermissions[key] as boolean;
        }
      }
    }

    await securityRole.save();
    await securityRole.populate('createdBy', 'firstName lastName');

    return successResponse(securityRole, 'Security role updated successfully');
  } catch (error) {
    console.error('Update security role error:', error);
    return errorResponse('Failed to update security role', 500);
  }
}

// DELETE /api/security-roles/[id] - Delete a security role
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isValidObjectId(id)) {
      return errorResponse('Invalid security role ID', 400);
    }

    await connectDB();

    const securityRole = await SecurityRole.findById(id);

    if (!securityRole) {
      return notFoundResponse('Security role');
    }

    // System roles cannot be deleted
    if (securityRole.isSystemRole) {
      return forbiddenResponse('System roles cannot be deleted');
    }

    // Check access - family admins can only delete their family's roles
    if (user.role === UserRole.FAMILY_ADMIN) {
      const roleFamily = securityRole.familyId?.toString();
      if (roleFamily !== user.familyId) {
        return forbiddenResponse('You do not have access to delete this security role');
      }
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can delete security roles');
    }

    // Check if any users are using this role
    const usersWithRole = await User.countDocuments({ securityRoleId: id });
    if (usersWithRole > 0) {
      return errorResponse(
        `Cannot delete role: ${usersWithRole} user(s) are currently assigned to this role. Please reassign them first.`,
        400
      );
    }

    await SecurityRole.findByIdAndDelete(id);

    return successResponse(null, 'Security role deleted successfully');
  } catch (error) {
    console.error('Delete security role error:', error);
    return errorResponse('Failed to delete security role', 500);
  }
}
