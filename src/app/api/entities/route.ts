import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Entity } from '@/models/Entity';
import { Family } from '@/models/Family';
import { Approval } from '@/models/Approval';
import { getCurrentUser, canAccessFamily, canModifyContent } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole, ContentStatus, EntityType } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';

// GET /api/entities - List entities
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    const familyId = searchParams.get('familyId');

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC && family.status === FamilyStatus.ACTIVE;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    const query: Record<string, unknown> = { familyId };

    // Filter by entity type
    const entityType = searchParams.get('entityType');
    if (entityType && Object.values(EntityType).includes(entityType as EntityType)) {
      query.entityType = entityType;
    }

    // For non-members, only show approved and public content
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isFamilyMember && !isAdmin) {
      query.status = ContentStatus.APPROVED;
      query.visibility = VisibilityStatus.PUBLIC;
    } else if (!isAdmin) {
      // Family members see approved content or their own pending content
      query.$or = [
        { status: ContentStatus.APPROVED },
        { status: ContentStatus.PENDING, createdBy: user?._id },
      ];
    } else {
      // Admins can filter by status
      const status = searchParams.get('status');
      if (status) {
        query.status = status;
      }
    }

    // Visibility filter (for admins)
    const visibility = searchParams.get('visibility');
    if (visibility && isAdmin) {
      query.visibility = visibility;
    }

    // Tag filter
    const tag = searchParams.get('tag');
    if (tag) {
      query.tags = tag;
    }

    // Date range filter
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      query.$text = { $search: search };
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [entities, total] = await Promise.all([
      Entity.find(query)
        .sort({ isPinned: -1, [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('memberId', 'firstName lastName photo'),
      Entity.countDocuments(query),
    ]);

    return successResponse(
      entities,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List entities error:', error);
    return errorResponse('Failed to list entities', 500);
  }
}

// POST /api/entities - Create a new entity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { familyId, entityType, ...entityData } = body;

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    if (!entityType || !Object.values(EntityType).includes(entityType)) {
      return errorResponse('Valid entity type is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check if user belongs to this family
    if (user.familyId !== familyId && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('You cannot create content in this family');
    }

    // Check if module is enabled
    if (!family.settings.enabledModules.includes(entityType)) {
      return errorResponse(`${entityType} module is not enabled for this family`, 400);
    }

    // Validation
    const errors: Record<string, string> = {};

    if (!entityData.title || typeof entityData.title !== 'string') {
      errors.title = 'Title is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Determine approval status
    const isAdmin = user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN;
    const requiresApproval = family.settings.requireApprovalForContent && !isAdmin;
    const status = requiresApproval ? ContentStatus.PENDING : ContentStatus.APPROVED;

    // Set visibility
    const visibility = entityData.visibility || family.settings.defaultContentVisibility;

    const entity = new Entity({
      familyId,
      entityType,
      ...entityData,
      status,
      visibility,
      createdBy: user._id,
      version: 1,
    });

    await entity.save();

    // Create approval if needed
    if (requiresApproval) {
      await Approval.create({
        familyId,
        entityId: entity._id.toString(),
        entityType,
        requesterId: user._id,
        status: 'pending',
        requestedAt: new Date(),
      });

      await Family.findByIdAndUpdate(familyId, {
        $inc: { 'stats.pendingApprovals': 1 },
      });
    } else {
      // Update content count
      await Family.findByIdAndUpdate(familyId, {
        $inc: { 'stats.contentCount': 1 },
      });
    }

    // Audit log
    await audit.create(
      { user, request },
      familyId,
      entity._id.toString(),
      entityType,
      entity.title
    );

    return successResponse(
      entity,
      requiresApproval ? 'Content created and pending approval' : 'Content created successfully'
    );
  } catch (error) {
    console.error('Create entity error:', error);
    return errorResponse('Failed to create entity', 500);
  }
}
