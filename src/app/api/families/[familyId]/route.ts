import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { getCurrentUser, canAccessFamily, canModifyContent } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole } from '@/types';
import {
  errorResponse,
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  isValidObjectId,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ familyId: string }>;
}

// GET /api/families/[familyId] - Get family details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { familyId } = await params;

    if (!isValidObjectId(familyId)) {
      return errorResponse('Invalid family ID', 400);
    }

    const user = await getCurrentUser(request);

    await connectDB();

    const family = await Family.findById(familyId)
      .populate('createdBy', 'firstName lastName email');

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access permissions
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      family.visibility === VisibilityStatus.PUBLIC && family.status === FamilyStatus.ACTIVE
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    // Get member count
    const memberCount = await FamilyMember.countDocuments({
      familyId,
      isDeleted: false,
    });

    // If not a family member, hide settings
    const isFamilyMember = user?.familyId === familyId;
    const familyData = family.toObject();

    if (!isFamilyMember && user?.role !== UserRole.SYSTEM_ADMIN) {
      delete (familyData as { settings?: unknown }).settings;
    }

    return successResponse({
      ...familyData,
      memberCount,
    });
  } catch (error) {
    console.error('Get family error:', error);
    return errorResponse('Failed to get family', 500);
  }
}

// PATCH /api/families/[familyId] - Update family details
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { familyId } = await params;

    if (!isValidObjectId(familyId)) {
      return errorResponse('Invalid family ID', 400);
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check if user can modify this family
    const canModify = canModifyContent(
      user.role,
      user._id,
      family.createdBy.toString(),
      user.familyId,
      familyId
    );

    if (!canModify) {
      return forbiddenResponse('You cannot modify this family');
    }

    const body = await request.json();
    const allowedFields = [
      'name',
      'origin',
      'description',
      'motto',
      'foundedYear',
      'contactDetails',
      'socialLinks',
      'logo',
      'banner',
    ];

    // Track changes for audit
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Update only allowed fields
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = family.get(field);
        const newValue = body[field];

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[field] = { old: oldValue, new: newValue };
          family.set(field, newValue);
        }
      }
    }

    // Handle visibility change (requires system admin for public families)
    if (body.visibility !== undefined && body.visibility !== family.visibility) {
      if (body.visibility === VisibilityStatus.PUBLIC && user.role !== UserRole.SYSTEM_ADMIN) {
        // If changing to public, set to pending status
        family.visibility = VisibilityStatus.PUBLIC;
        family.status = FamilyStatus.PENDING;
        changes.visibility = { old: family.visibility, new: VisibilityStatus.PUBLIC };
      } else if (user.role === UserRole.SYSTEM_ADMIN) {
        family.visibility = body.visibility;
        changes.visibility = { old: family.visibility, new: body.visibility };
      }
    }

    family.updatedBy = user._id;
    await family.save();

    // Audit log
    if (Object.keys(changes).length > 0) {
      await audit.update(
        { user, request },
        familyId,
        familyId,
        'family',
        changes
      );
    }

    return successResponse(family, 'Family updated successfully');
  } catch (error) {
    console.error('Update family error:', error);
    return errorResponse('Failed to update family', 500);
  }
}

// DELETE /api/families/[familyId] - Soft delete family
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { familyId } = await params;

    if (!isValidObjectId(familyId)) {
      return errorResponse('Invalid family ID', 400);
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Only family admin or system admin can delete
    const canDelete =
      user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.FAMILY_ADMIN && user.familyId === familyId);

    if (!canDelete) {
      return forbiddenResponse('You cannot delete this family');
    }

    // Soft delete
    family.isDeleted = true;
    family.deletedAt = new Date();
    family.deletedBy = user._id;
    family.status = FamilyStatus.ARCHIVED;
    await family.save();

    // Audit log
    await audit.delete(
      { user, request },
      familyId,
      familyId,
      'family',
      family.name,
      'Family deleted'
    );

    return successResponse(null, 'Family deleted successfully');
  } catch (error) {
    console.error('Delete family error:', error);
    return errorResponse('Failed to delete family', 500);
  }
}
