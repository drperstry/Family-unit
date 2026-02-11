import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Entity } from '@/models/Entity';
import { Family } from '@/models/Family';
import { SoftDeleteArchive } from '@/models/SoftDeleteArchive';
import { getCurrentUser, canAccessFamily, canModifyContent } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  isValidObjectId,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ entityId: string }>;
}

// GET /api/entities/[entityId] - Get entity details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { entityId } = await params;

    if (!isValidObjectId(entityId)) {
      return errorResponse('Invalid entity ID', 400);
    }

    const user = await getCurrentUser(request);

    await connectDB();

    const entity = await Entity.findById(entityId)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('memberId', 'firstName lastName photo')
      .populate('participants', 'firstName lastName photo');

    if (!entity) {
      return notFoundResponse('Entity');
    }

    const family = await Family.findById(entity.familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC && family.status === FamilyStatus.ACTIVE;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      entity.familyId.toString(),
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this content');
    }

    // For non-members, check if content is public and approved
    const isFamilyMember = user?.familyId === entity.familyId.toString();
    if (!isFamilyMember && user?.role !== UserRole.SYSTEM_ADMIN) {
      if (entity.status !== ContentStatus.APPROVED || entity.visibility !== VisibilityStatus.PUBLIC) {
        return forbiddenResponse('This content is not publicly available');
      }
    }

    // Increment view count for news
    if (entity.entityType === 'news') {
      await Entity.findByIdAndUpdate(entityId, { $inc: { viewCount: 1 } });
    }

    return successResponse(entity);
  } catch (error) {
    console.error('Get entity error:', error);
    return errorResponse('Failed to get entity', 500);
  }
}

// PATCH /api/entities/[entityId] - Update entity
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { entityId } = await params;

    if (!isValidObjectId(entityId)) {
      return errorResponse('Invalid entity ID', 400);
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    await connectDB();

    const entity = await Entity.findById(entityId);

    if (!entity) {
      return notFoundResponse('Entity');
    }

    // Check if user can modify
    const canModify = canModifyContent(
      user.role,
      user._id,
      entity.createdBy.toString(),
      user.familyId,
      entity.familyId.toString()
    );

    if (!canModify) {
      return forbiddenResponse('You cannot modify this content');
    }

    const body = await request.json();

    // Fields that cannot be changed
    const protectedFields = ['familyId', 'entityType', 'createdBy', 'createdAt', '_id'];

    // Track changes for audit
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    for (const [key, value] of Object.entries(body)) {
      if (protectedFields.includes(key)) continue;

      const oldValue = entity.get(key);
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        changes[key] = { old: oldValue, new: value };
        entity.set(key, value);
      }
    }

    if (Object.keys(changes).length === 0) {
      return successResponse(entity, 'No changes made');
    }

    entity.updatedBy = user._id;
    await entity.save();

    // Audit log
    await audit.update(
      { user, request },
      entity.familyId.toString(),
      entityId,
      entity.entityType,
      changes
    );

    return successResponse(entity, 'Content updated successfully');
  } catch (error) {
    console.error('Update entity error:', error);
    return errorResponse('Failed to update entity', 500);
  }
}

// DELETE /api/entities/[entityId] - Soft delete entity
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { entityId } = await params;

    if (!isValidObjectId(entityId)) {
      return errorResponse('Invalid entity ID', 400);
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    await connectDB();

    const entity = await Entity.findById(entityId);

    if (!entity) {
      return notFoundResponse('Entity');
    }

    // Check if user can delete
    const canModify = canModifyContent(
      user.role,
      user._id,
      entity.createdBy.toString(),
      user.familyId,
      entity.familyId.toString()
    );

    if (!canModify) {
      return forbiddenResponse('You cannot delete this content');
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    // Archive the document
    await SoftDeleteArchive.create({
      originalCollection: 'Entity',
      originalId: entity._id.toString(),
      familyId: entity.familyId.toString(),
      data: entity.toObject(),
      deletedBy: user._id,
      reason,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    // Soft delete
    entity.isDeleted = true;
    entity.deletedAt = new Date();
    entity.deletedBy = user._id;
    entity.status = ContentStatus.ARCHIVED;
    await entity.save();

    // Update content count
    await Family.findByIdAndUpdate(entity.familyId, {
      $inc: { 'stats.contentCount': -1 },
    });

    // Audit log
    await audit.delete(
      { user, request },
      entity.familyId.toString(),
      entityId,
      entity.entityType,
      entity.title,
      reason
    );

    return successResponse(null, 'Content deleted successfully');
  } catch (error) {
    console.error('Delete entity error:', error);
    return errorResponse('Failed to delete entity', 500);
  }
}
