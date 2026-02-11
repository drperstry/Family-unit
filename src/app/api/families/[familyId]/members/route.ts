import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { Approval } from '@/models/Approval';
import { getCurrentUser, canAccessFamily, hasPermission } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole, ContentStatus, Gender } from '@/types';
import {
  errorResponse,
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ familyId: string }>;
}

// GET /api/families/[familyId]/members - List family members
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
    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

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

    // For non-members viewing public family, only show approved members
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isAdmin) {
      query.status = ContentStatus.APPROVED;
    } else {
      // Admin can filter by status
      const status = searchParams.get('status');
      if (status) {
        query.status = status;
      }
    }

    // Gender filter (for tree view)
    const gender = searchParams.get('gender');
    if (gender) {
      query.gender = gender;
    }

    // Generation filter
    const generation = searchParams.get('generation');
    if (generation) {
      query.generation = parseInt(generation, 10);
    }

    // Show females toggle
    const showFemales = searchParams.get('showFemales');
    if (showFemales === 'false' || (!showFemales && !family.settings.showFemalesInTree)) {
      // When viewing for tree purposes without female toggle
      const includeAll = searchParams.get('includeAll');
      if (!includeAll) {
        query.gender = Gender.MALE;
      }
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      query.$text = { $search: search };
    }

    const sortField = pagination.sortBy || 'generation';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [members, total] = await Promise.all([
      FamilyMember.find(query)
        .sort({ [sortField]: sortOrder, createdAt: 1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('userId', 'email avatar')
        .populate('parentId', 'firstName lastName')
        .populate('spouseId', 'firstName lastName'),
      FamilyMember.countDocuments(query),
    ]);

    return successResponse(
      members,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List members error:', error);
    return errorResponse('Failed to list members', 500);
  }
}

// POST /api/families/[familyId]/members - Add a new family member
export async function POST(
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

    // Check if user belongs to this family
    if (user.familyId !== familyId && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('You cannot add members to this family');
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      displayName,
      gender,
      dateOfBirth,
      dateOfDeath,
      isDeceased,
      photo,
      bio,
      parentId,
      spouseId,
      contactDetails,
      achievements,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!firstName || typeof firstName !== 'string') {
      errors.firstName = 'First name is required';
    }

    if (!lastName || typeof lastName !== 'string') {
      errors.lastName = 'Last name is required';
    }

    if (!gender || !Object.values(Gender).includes(gender)) {
      errors.gender = 'Valid gender is required';
    }

    if (parentId && !isValidObjectId(parentId)) {
      errors.parentId = 'Invalid parent ID';
    }

    if (spouseId && !isValidObjectId(spouseId)) {
      errors.spouseId = 'Invalid spouse ID';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Verify parent exists if provided
    let parentMember = null;
    if (parentId) {
      parentMember = await FamilyMember.findOne({ _id: parentId, familyId });
      if (!parentMember) {
        return errorResponse('Parent member not found in this family', 400);
      }
    }

    // Determine approval status
    const isAdmin = user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN;
    const requiresApproval = family.settings.requireApprovalForContent && !isAdmin;
    const status = requiresApproval ? ContentStatus.PENDING : ContentStatus.APPROVED;

    const member = new FamilyMember({
      familyId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: displayName?.trim(),
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
      isDeceased: isDeceased || false,
      photo,
      bio: bio?.trim(),
      parentId,
      spouseId,
      generation: parentMember ? parentMember.generation + 1 : 1,
      lineage: parentMember ? [...(parentMember.lineage || []), parentMember._id] : [],
      contactDetails,
      achievements,
      status,
      createdBy: user._id,
    });

    await member.save();

    // Update parent's children list
    if (parentId) {
      await FamilyMember.findByIdAndUpdate(parentId, {
        $push: { childrenIds: member._id },
      });
    }

    // Create approval if needed
    if (requiresApproval) {
      await Approval.create({
        familyId,
        entityId: member._id.toString(),
        entityType: 'member',
        requesterId: user._id,
        status: 'pending',
        requestedAt: new Date(),
      });

      // Update family stats
      await Family.findByIdAndUpdate(familyId, {
        $inc: { 'stats.pendingApprovals': 1 },
      });
    } else {
      // Update member count
      await Family.findByIdAndUpdate(familyId, {
        $inc: { 'stats.memberCount': 1 },
      });
    }

    // Audit log
    await audit.memberAdd(
      { user, request },
      familyId,
      member._id.toString(),
      `${member.firstName} ${member.lastName}`
    );

    return successResponse(
      member,
      requiresApproval ? 'Member added and pending approval' : 'Member added successfully'
    );
  } catch (error) {
    console.error('Add member error:', error);
    return errorResponse('Failed to add member', 500);
  }
}
