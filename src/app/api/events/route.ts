import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Event } from '@/models/Event';
import { Family } from '@/models/Family';
import { Approval } from '@/models/Approval';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
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

// GET /api/events - List events (calendar)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

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

    // Date range filter (for calendar view)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (startDate && endDate) {
      query.$or = [
        {
          startDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
        {
          endDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) },
        },
      ];
    }

    // For non-members, only show approved and public events
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isFamilyMember && !isAdmin) {
      query.status = ContentStatus.APPROVED;
      query.visibility = VisibilityStatus.PUBLIC;
    } else if (!isAdmin) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { status: ContentStatus.APPROVED },
            { status: ContentStatus.PENDING, createdBy: user?._id },
          ],
        },
      ];
    }

    const pagination = parsePaginationQuery(searchParams);

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('organizers', 'firstName lastName photo')
        .populate('attendees.memberId', 'firstName lastName photo')
        .populate('createdBy', 'firstName lastName'),
      Event.countDocuments(query),
    ]);

    return successResponse(
      events,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List events error:', error);
    return errorResponse('Failed to list events', 500);
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const {
      familyId,
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      location,
      organizers,
      linkedEntityId,
      linkedEntityType,
      reminders,
      color,
      visibility,
    } = body;

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check if user belongs to this family
    if (user.familyId !== familyId && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('You cannot create events in this family');
    }

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string') {
      errors.title = 'Title is required';
    }

    if (!startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!endDate) {
      errors.endDate = 'End date is required';
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Determine approval status
    const isAdmin = user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN;
    const requiresApproval = family.settings.requireApprovalForContent && !isAdmin;
    const status = requiresApproval ? ContentStatus.PENDING : ContentStatus.APPROVED;

    const event = new Event({
      familyId,
      title: title.trim(),
      description: description?.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay: isAllDay || false,
      location,
      organizers: organizers || [user._id],
      attendees: [],
      linkedEntityId,
      linkedEntityType,
      reminders: reminders || [],
      color: color || '#3B82F6',
      status,
      visibility: visibility || family.settings.defaultContentVisibility,
      createdBy: user._id,
    });

    await event.save();

    // Create approval if needed
    if (requiresApproval) {
      await Approval.create({
        familyId,
        entityId: event._id,
        entityType: EntityType.EVENT,
        requesterId: user._id,
        status: 'pending',
        requestedAt: new Date(),
      });

      await Family.findByIdAndUpdate(familyId, {
        $inc: { 'stats.pendingApprovals': 1 },
      });
    }

    // Audit log
    await audit.create(
      { user, request },
      familyId,
      event._id.toString(),
      EntityType.EVENT,
      event.title
    );

    return successResponse(
      event,
      requiresApproval ? 'Event created and pending approval' : 'Event created successfully'
    );
  } catch (error) {
    console.error('Create event error:', error);
    return errorResponse('Failed to create event', 500);
  }
}
