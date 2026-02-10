import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Family } from '@/models/Family';
import { SoftDeleteArchive } from '@/models/SoftDeleteArchive';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, FamilyStatus } from '@/types';
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

// GET /api/admin - System admin overview
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system admins can access this endpoint');
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    await connectDB();

    switch (resource) {
      case 'users':
        return getUsersList(searchParams);

      case 'families':
        return getFamiliesList(searchParams);

      case 'archive':
        return getArchivedItems(searchParams);

      default:
        // Return overview stats
        const [
          totalUsers,
          totalFamilies,
          pendingFamilies,
          archivedItems,
        ] = await Promise.all([
          User.countDocuments({}),
          Family.countDocuments({}),
          Family.countDocuments({ status: FamilyStatus.PENDING }),
          SoftDeleteArchive.countDocuments({}),
        ]);

        return successResponse({
          users: totalUsers,
          families: totalFamilies,
          pendingFamilies,
          archivedItems,
        });
    }
  } catch (error) {
    console.error('Admin GET error:', error);
    return errorResponse('Failed to get admin data', 500);
  }
}

async function getUsersList(searchParams: URLSearchParams) {
  const pagination = parsePaginationQuery(searchParams);

  const query: Record<string, unknown> = {};

  const role = searchParams.get('role');
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    query.role = role;
  }

  const search = searchParams.get('search');
  if (search) {
    query.$text = { $search: search };
  }

  const familyId = searchParams.get('familyId');
  if (familyId && isValidObjectId(familyId)) {
    query.familyId = familyId;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pagination.page! - 1) * pagination.limit!)
      .limit(pagination.limit!)
      .select('-passwordHash')
      .populate('familyId', 'name slug'),
    User.countDocuments(query),
  ]);

  return successResponse(
    users,
    undefined,
    buildPaginationInfo(pagination.page!, pagination.limit!, total)
  );
}

async function getFamiliesList(searchParams: URLSearchParams) {
  const pagination = parsePaginationQuery(searchParams);

  const query: Record<string, unknown> = { isDeleted: { $ne: true } };

  const status = searchParams.get('status');
  if (status && Object.values(FamilyStatus).includes(status as FamilyStatus)) {
    query.status = status;
  }

  const visibility = searchParams.get('visibility');
  if (visibility) {
    query.visibility = visibility;
  }

  const search = searchParams.get('search');
  if (search) {
    query.$text = { $search: search };
  }

  const [families, total] = await Promise.all([
    Family.find(query)
      .sort({ createdAt: -1 })
      .skip((pagination.page! - 1) * pagination.limit!)
      .limit(pagination.limit!)
      .populate('createdBy', 'firstName lastName email'),
    Family.countDocuments(query),
  ]);

  return successResponse(
    families,
    undefined,
    buildPaginationInfo(pagination.page!, pagination.limit!, total)
  );
}

async function getArchivedItems(searchParams: URLSearchParams) {
  const pagination = parsePaginationQuery(searchParams);

  const query: Record<string, unknown> = {};

  const collection = searchParams.get('collection');
  if (collection) {
    query.originalCollection = collection;
  }

  const familyId = searchParams.get('familyId');
  if (familyId && isValidObjectId(familyId)) {
    query.familyId = familyId;
  }

  const [archives, total] = await Promise.all([
    SoftDeleteArchive.find(query)
      .sort({ createdAt: -1 })
      .skip((pagination.page! - 1) * pagination.limit!)
      .limit(pagination.limit!)
      .populate('deletedBy', 'firstName lastName email'),
    SoftDeleteArchive.countDocuments(query),
  ]);

  return successResponse(
    archives,
    undefined,
    buildPaginationInfo(pagination.page!, pagination.limit!, total)
  );
}

// POST /api/admin - Admin actions
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system admins can perform this action');
    }

    const body = await request.json();
    const { action, ...params } = body;

    await connectDB();

    switch (action) {
      case 'changeUserRole':
        return changeUserRole(user, params, request);

      case 'suspendFamily':
        return suspendFamily(user, params, request);

      case 'activateFamily':
        return activateFamily(user, params, request);

      case 'restoreArchived':
        return restoreArchived(user, params, request);

      case 'permanentDelete':
        return permanentDelete(user, params, request);

      case 'resolveConflict':
        return resolveUserConflict(user, params, request);

      default:
        return errorResponse('Unknown admin action', 400);
    }
  } catch (error) {
    console.error('Admin POST error:', error);
    return errorResponse('Failed to perform admin action', 500);
  }
}

async function changeUserRole(
  admin: { _id: string; role: UserRole },
  params: { userId: string; newRole: UserRole },
  request: NextRequest
) {
  const { userId, newRole } = params;

  if (!userId || !isValidObjectId(userId)) {
    return errorResponse('Valid user ID is required', 400);
  }

  if (!newRole || !Object.values(UserRole).includes(newRole)) {
    return errorResponse('Valid role is required', 400);
  }

  const targetUser = await User.findById(userId);

  if (!targetUser) {
    return notFoundResponse('User');
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;
  await targetUser.save();

  // Audit the role change
  await audit.roleChange(
    { user: { ...admin, email: '', firstName: '', lastName: '', preferences: {} as never } as never, request },
    userId,
    oldRole as UserRole,
    newRole,
    targetUser.familyId?.toString()
  );

  return successResponse(
    { userId, oldRole, newRole },
    `User role changed from ${oldRole} to ${newRole}`
  );
}

async function suspendFamily(
  admin: { _id: string },
  params: { familyId: string; reason?: string },
  request: NextRequest
) {
  const { familyId, reason } = params;

  if (!familyId || !isValidObjectId(familyId)) {
    return errorResponse('Valid family ID is required', 400);
  }

  const family = await Family.findById(familyId);

  if (!family) {
    return notFoundResponse('Family');
  }

  family.status = FamilyStatus.SUSPENDED;
  await family.save();

  return successResponse(
    { familyId, status: FamilyStatus.SUSPENDED },
    `Family "${family.name}" has been suspended`
  );
}

async function activateFamily(
  admin: { _id: string },
  params: { familyId: string },
  request: NextRequest
) {
  const { familyId } = params;

  if (!familyId || !isValidObjectId(familyId)) {
    return errorResponse('Valid family ID is required', 400);
  }

  const family = await Family.findById(familyId);

  if (!family) {
    return notFoundResponse('Family');
  }

  family.status = FamilyStatus.ACTIVE;
  await family.save();

  return successResponse(
    { familyId, status: FamilyStatus.ACTIVE },
    `Family "${family.name}" has been activated`
  );
}

async function restoreArchived(
  admin: { _id: string },
  params: { archiveId: string },
  request: NextRequest
) {
  const { archiveId } = params;

  if (!archiveId || !isValidObjectId(archiveId)) {
    return errorResponse('Valid archive ID is required', 400);
  }

  const archive = await SoftDeleteArchive.findById(archiveId);

  if (!archive) {
    return notFoundResponse('Archived item');
  }

  // Restore the document
  const mongoose = await import('mongoose');
  const Model = mongoose.default.model(archive.originalCollection);

  const restoredDoc = new Model(archive.data);
  restoredDoc.isDeleted = false;
  restoredDoc.deletedAt = undefined;
  restoredDoc.deletedBy = undefined;

  await restoredDoc.save();
  await SoftDeleteArchive.findByIdAndDelete(archiveId);

  return successResponse(
    { restoredId: restoredDoc._id.toString() },
    'Item restored successfully'
  );
}

async function permanentDelete(
  admin: { _id: string },
  params: { archiveId: string },
  request: NextRequest
) {
  const { archiveId } = params;

  if (!archiveId || !isValidObjectId(archiveId)) {
    return errorResponse('Valid archive ID is required', 400);
  }

  const archive = await SoftDeleteArchive.findByIdAndDelete(archiveId);

  if (!archive) {
    return notFoundResponse('Archived item');
  }

  return successResponse(null, 'Item permanently deleted');
}

async function resolveUserConflict(
  admin: { _id: string },
  params: { userId: string; newFamilyId?: string; removeFromFamily?: boolean },
  request: NextRequest
) {
  const { userId, newFamilyId, removeFromFamily } = params;

  if (!userId || !isValidObjectId(userId)) {
    return errorResponse('Valid user ID is required', 400);
  }

  const targetUser = await User.findById(userId);

  if (!targetUser) {
    return notFoundResponse('User');
  }

  if (removeFromFamily) {
    targetUser.familyId = undefined;
    targetUser.role = UserRole.GUEST;
  } else if (newFamilyId && isValidObjectId(newFamilyId)) {
    const newFamily = await Family.findById(newFamilyId);
    if (!newFamily) {
      return notFoundResponse('New family');
    }
    targetUser.familyId = newFamilyId;
  }

  await targetUser.save();

  return successResponse(
    { userId, familyId: targetUser.familyId },
    'User conflict resolved'
  );
}
