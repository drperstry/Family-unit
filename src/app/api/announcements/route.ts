import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Announcement } from '@/models/Announcement';
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

// Valid announcement types
const VALID_TYPES = [
  'announcement', 'milestone', 'achievement', 'birthday', 'anniversary',
  'birth', 'wedding', 'graduation', 'memorial', 'news', 'other'
];

// GET /api/announcements - List announcements
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

    // Check if user is a family member
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

    // Type filter
    const type = searchParams.get('type');
    if (type && VALID_TYPES.includes(type)) {
      query.type = type;
    }

    // Priority filter
    const priority = searchParams.get('priority');
    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
      query.priority = priority;
    }

    // Pinned only
    const pinnedOnly = searchParams.get('pinnedOnly') === 'true';
    if (pinnedOnly) {
      query.isPinned = true;
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      const sanitizedSearch = sanitizeStringValue(search);
      if (sanitizedSearch) {
        query.$text = { $search: sanitizedSearch };
      }
    }

    // Sort pinned announcements first, then by date
    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ isPinned: -1, [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('relatedMembers', 'firstName lastName photo')
        .lean(),
      Announcement.countDocuments(query),
    ]);

    return successResponse(
      announcements,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List announcements error:', error);
    return errorResponse('Failed to list announcements', 500);
  }
}

// POST /api/announcements - Create announcement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to create announcements');
    }

    const body = await request.json();
    const {
      title,
      content,
      type,
      priority,
      images,
      video,
      relatedMembers,
      relatedEvent,
      date,
      isPinned,
      pinnedUntil,
      expiresAt,
      visibility,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.title = 'Title must be at least 2 characters';
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      errors.content = 'Content must be at least 10 characters';
    }

    if (type && !VALID_TYPES.includes(type)) {
      errors.type = 'Invalid announcement type';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    const isAdmin = user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN;

    const announcement = new Announcement({
      familyId: user.familyId,
      title: title.trim(),
      content: content.trim(),
      type: type || 'announcement',
      priority: priority || 'normal',
      images: images || [],
      video,
      relatedMembers: relatedMembers?.map((id: string) => new Types.ObjectId(id)) || [],
      relatedEvent: relatedEvent ? new Types.ObjectId(relatedEvent) : undefined,
      date: date ? new Date(date) : undefined,
      isPinned: isAdmin ? (isPinned || false) : false, // Only admins can pin
      pinnedUntil: isPinned && pinnedUntil ? new Date(pinnedUntil) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      visibility: visibility || VisibilityStatus.FAMILY_ONLY,
      status: isAdmin ? ContentStatus.APPROVED : ContentStatus.PENDING,
      createdBy: user._id,
    });

    await announcement.save();

    // Create approval request if not admin
    if (!isAdmin) {
      await Approval.create({
        familyId: user.familyId,
        entityId: announcement._id.toString(),
        entityType: 'announcement',
        requesterId: user._id,
        status: 'pending',
        requestedAt: new Date(),
      });

      await Family.findByIdAndUpdate(user.familyId, {
        $inc: { 'stats.pendingApprovals': 1 },
      });
    }

    await audit.contentCreate(
      { user, request },
      user.familyId,
      announcement._id.toString(),
      'announcement',
      announcement.title
    );

    return successResponse(
      announcement,
      isAdmin ? 'Announcement created successfully' : 'Announcement submitted for approval'
    );
  } catch (error) {
    console.error('Create announcement error:', error);
    return errorResponse('Failed to create announcement', 500);
  }
}
