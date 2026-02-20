import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Tradition } from '@/models/Tradition';
import { Approval } from '@/models/Approval';
import { Family } from '@/models/Family';
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
import { sanitizeStringValue } from '@/lib/security';

// Valid tradition categories
const VALID_CATEGORIES = [
  'holiday', 'celebration', 'ritual', 'food', 'gathering',
  'cultural', 'religious', 'seasonal', 'other'
];

// GET /api/traditions - List traditions
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

    // Category filter
    const category = searchParams.get('category');
    if (category && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }

    // Active filter
    const activeOnly = searchParams.get('activeOnly') === 'true';
    if (activeOnly) {
      query.isActive = true;
    }

    // Season filter
    const season = searchParams.get('season');
    if (season && ['spring', 'summer', 'fall', 'winter', 'any'].includes(season)) {
      query.season = season;
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      const sanitizedSearch = sanitizeStringValue(search);
      if (sanitizedSearch) {
        query.$text = { $search: sanitizedSearch };
      }
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [traditions, total] = await Promise.all([
      Tradition.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('originMember', 'firstName lastName photo')
        .lean(),
      Tradition.countDocuments(query),
    ]);

    return successResponse(
      traditions,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List traditions error:', error);
    return errorResponse('Failed to list traditions', 500);
  }
}

// POST /api/traditions - Create tradition
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to add traditions');
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      origin,
      originDate,
      originMember,
      frequency,
      season,
      month,
      dayOfMonth,
      dayOfWeek,
      images,
      videos,
      participants,
      supplies,
      instructions,
      visibility,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.title = 'Tradition title must be at least 2 characters';
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      errors.category = 'Valid category is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    const tradition = new Tradition({
      familyId: user.familyId,
      title: title.trim(),
      description: description.trim(),
      category,
      origin: origin?.trim(),
      originDate: originDate ? new Date(originDate) : undefined,
      originMember: originMember ? new Types.ObjectId(originMember) : undefined,
      frequency: frequency || 'yearly',
      season,
      month,
      dayOfMonth,
      dayOfWeek,
      images: images || [],
      videos: videos || [],
      participants: participants || [],
      supplies: supplies || [],
      instructions: instructions || [],
      isActive: true,
      status: ContentStatus.PENDING,
      visibility: visibility || VisibilityStatus.FAMILY_ONLY,
      createdBy: user._id,
    });

    await tradition.save();

    // Create approval request
    await Approval.create({
      familyId: user.familyId,
      entityId: tradition._id.toString(),
      entityType: 'tradition',
      requesterId: user._id,
      status: 'pending',
      requestedAt: new Date(),
    });

    await Family.findByIdAndUpdate(user.familyId, {
      $inc: { 'stats.pendingApprovals': 1 },
    });

    await audit.contentCreate(
      { user, request },
      user.familyId,
      tradition._id.toString(),
      'tradition',
      tradition.title
    );

    return successResponse(tradition, 'Tradition submitted for approval');
  } catch (error) {
    console.error('Create tradition error:', error);
    return errorResponse('Failed to create tradition', 500);
  }
}
