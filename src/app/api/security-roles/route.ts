import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { SecurityRole, ENTITY_TYPES, ACCESS_LEVELS, PRIVILEGE_TYPES } from '@/models/SecurityRole';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';

// GET /api/security-roles - Get all security roles
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can view security roles
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can view security roles');
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {};

    // Family admins can only see roles for their family or system roles
    if (user.role === UserRole.FAMILY_ADMIN && user.familyId) {
      query.$or = [
        { familyId: user.familyId },
        { isSystemRole: true },
      ];
    }

    // Filter by system roles only
    const systemOnly = searchParams.get('systemOnly');
    if (systemOnly === 'true') {
      query.isSystemRole = true;
    }

    const [roles, total] = await Promise.all([
      SecurityRole.find(query)
        .sort({ isSystemRole: -1, name: 1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName'),
      SecurityRole.countDocuments(query),
    ]);

    return successResponse(
      roles,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Get security roles error:', error);
    return errorResponse('Failed to get security roles', 500);
  }
}

// POST /api/security-roles - Create a new security role
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can create security roles
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can create security roles');
    }

    const body = await request.json();
    const {
      name,
      description,
      entityPrivileges,
      specialPermissions,
    } = body;

    // Validate required fields
    if (!name) {
      return errorResponse('Role name is required', 400);
    }

    await connectDB();

    // Validate entity privileges
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

    const roleData: Record<string, unknown> = {
      name,
      description,
      entityPrivileges: entityPrivileges || [],
      specialPermissions: specialPermissions || {},
      isSystemRole: false,
      createdBy: user._id,
    };

    // Family admins can only create roles for their family
    if (user.role === UserRole.FAMILY_ADMIN) {
      if (!user.familyId) {
        return errorResponse('You must be a member of a family to create roles', 400);
      }
      roleData.familyId = user.familyId;
    }

    const securityRole = new SecurityRole(roleData);
    await securityRole.save();

    await securityRole.populate('createdBy', 'firstName lastName');

    return successResponse(securityRole, 'Security role created successfully');
  } catch (error) {
    console.error('Create security role error:', error);
    return errorResponse('Failed to create security role', 500);
  }
}

// POST /api/security-roles/initialize - Initialize system roles
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only system admins can initialize system roles
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system admins can initialize system roles');
    }

    await connectDB();

    await (SecurityRole as any).createSystemRoles(user._id.toString());

    return successResponse(null, 'System roles initialized successfully');
  } catch (error) {
    console.error('Initialize system roles error:', error);
    return errorResponse('Failed to initialize system roles', 500);
  }
}
