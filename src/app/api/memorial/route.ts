import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Memorial } from '@/models/Memorial';
import { Approval } from '@/models/Approval';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { ContentStatus, VisibilityStatus, UserRole } from '@/types';
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

// GET /api/memorial - List memorials
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const pagination = parsePaginationQuery(searchParams, 'default');

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    const query: Record<string, unknown> = {
      familyId,
      isDeleted: false,
    };

    // Non-members only see approved public content
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
                   (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isFamilyMember) {
      query.status = ContentStatus.APPROVED;
      query.visibility = VisibilityStatus.PUBLIC;
    } else if (!isAdmin) {
      query.$or = [
        { status: ContentStatus.APPROVED },
        { createdBy: user._id },
      ];
    }

    const sortField = pagination.sortBy || 'deathDate';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [memorials, total] = await Promise.all([
      Memorial.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('memberId', 'firstName lastName photo dateOfBirth dateOfDeath')
        .populate('createdBy', 'firstName lastName avatar')
        .lean(),
      Memorial.countDocuments(query),
    ]);

    return successResponse(
      memorials,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List memorials error:', error);
    return errorResponse('Failed to list memorials', 500);
  }
}

// POST /api/memorial - Create memorial
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to create memorials');
    }

    const body = await request.json();
    const {
      memberId,
      title,
      biography,
      birthDate,
      deathDate,
      birthPlace,
      deathPlace,
      restingPlace,
      epitaph,
      lifeStory,
      achievements,
      quotes,
      photos,
      videos,
      timeline,
      anniversaryReminders,
      visibility,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!memberId || !isValidObjectId(memberId)) {
      errors.memberId = 'Valid family member ID is required';
    }

    if (!biography || typeof biography !== 'string' || biography.trim().length < 50) {
      errors.biography = 'Biography must be at least 50 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    // Verify member exists and belongs to the family
    const member = await FamilyMember.findOne({
      _id: memberId,
      familyId: user.familyId,
      isDeleted: false,
    });

    if (!member) {
      return notFoundResponse('Family member');
    }

    // Check if memorial already exists for this member
    const existingMemorial = await Memorial.findOne({
      memberId,
      isDeleted: false,
    });

    if (existingMemorial) {
      return errorResponse('A memorial already exists for this family member', 409);
    }

    const memorial = new Memorial({
      familyId: user.familyId,
      memberId: new Types.ObjectId(memberId),
      title: title?.trim(),
      biography: biography.trim(),
      birthDate: birthDate ? new Date(birthDate) : member.dateOfBirth,
      deathDate: deathDate ? new Date(deathDate) : member.dateOfDeath,
      birthPlace: birthPlace?.trim(),
      deathPlace: deathPlace?.trim(),
      restingPlace: restingPlace?.trim(),
      epitaph: epitaph?.trim(),
      lifeStory: lifeStory?.trim(),
      achievements: achievements || [],
      quotes: quotes || [],
      photos: photos || [],
      videos: videos || [],
      timeline: timeline || [],
      anniversaryReminders: anniversaryReminders !== false,
      status: ContentStatus.PENDING,
      visibility: visibility || VisibilityStatus.FAMILY,
      createdBy: user._id,
    });

    await memorial.save();

    // Create approval request
    await Approval.create({
      familyId: user.familyId,
      entityId: memorial._id.toString(),
      entityType: 'memorial',
      requesterId: user._id,
      status: 'pending',
      requestedAt: new Date(),
    });

    await Family.findByIdAndUpdate(user.familyId, {
      $inc: { 'stats.pendingApprovals': 1 },
    });

    const memberName = `${member.firstName} ${member.lastName}`;
    await audit.contentCreate(
      { user, request },
      user.familyId,
      memorial._id.toString(),
      'memorial',
      `Memorial for ${memberName}`
    );

    return successResponse(memorial, 'Memorial submitted for approval');
  } catch (error) {
    console.error('Create memorial error:', error);
    return errorResponse('Failed to create memorial', 500);
  }
}
