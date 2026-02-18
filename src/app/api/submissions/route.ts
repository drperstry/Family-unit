import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Submission } from '@/models/Submission';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { UserRole, FamilyStatus, VisibilityStatus } from '@/types';
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

// Valid submission statuses and types for validation
const VALID_STATUSES = ['pending', 'in_progress', 'approved', 'rejected', 'closed'];
const VALID_TYPES = [
  'family_tree_update',
  'member_addition',
  'photo_upload',
  'news_post',
  'event_creation',
  'general_request',
  'service_request',
];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// GET /api/submissions - Get submissions for a family
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || user.familyId;

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
    const canAccess = canAccessFamily(user.role, user.familyId, familyId, isPublic);

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    const isFamilyMember = user.familyId === familyId;
    const isAdmin = user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    const pagination = parsePaginationQuery(searchParams, 'submission');

    // Build query
    const query: Record<string, unknown> = { familyId };

    // Non-admins can only see their own submissions
    if (!isAdmin) {
      query.userId = user._id;
    }

    // Filter by status - SECURITY FIX: Validate status value
    const status = searchParams.get('status');
    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }

    // Filter by type - SECURITY FIX: Validate type value
    const type = searchParams.get('type');
    if (type && VALID_TYPES.includes(type)) {
      query.type = type;
    }

    // Filter by priority - SECURITY FIX: Validate priority value
    const priority = searchParams.get('priority');
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query.priority = priority;
    }

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .sort({ createdAt: -1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('userId', 'firstName lastName avatar email')
        .populate('assignedTo', 'firstName lastName avatar')
        .populate('reviewedBy', 'firstName lastName'),
      Submission.countDocuments(query),
    ]);

    return successResponse(
      submissions,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Get submissions error:', error);
    return errorResponse('Failed to get submissions', 500);
  }
}

// POST /api/submissions - Create a new submission
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return errorResponse('You must be a member of a family to create submissions', 400);
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      data,
      attachments,
      priority,
    } = body;

    // Validate required fields
    if (!type || !title || !description) {
      return errorResponse('Type, title, and description are required', 400);
    }

    if (!VALID_TYPES.includes(type)) {
      return errorResponse('Invalid submission type', 400);
    }

    await connectDB();

    const family = await Family.findById(user.familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    const submission = new Submission({
      familyId: user.familyId,
      userId: user._id,
      type,
      title,
      description,
      data: data || {},
      attachments: attachments || [],
      priority: priority || 'medium',
      status: 'pending',
    });

    await submission.save();

    // Populate for response
    await submission.populate('userId', 'firstName lastName avatar email');

    return successResponse(submission, 'Submission created successfully');
  } catch (error) {
    console.error('Create submission error:', error);
    return errorResponse('Failed to create submission', 500);
  }
}
