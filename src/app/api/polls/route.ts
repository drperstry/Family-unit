import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Poll } from '@/models/Poll';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { VisibilityStatus, UserRole } from '@/types';
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

// GET /api/polls - List polls
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

    // Non-members can only see public polls
    const isFamilyMember = user?.familyId === familyId;
    if (!isFamilyMember) {
      query.visibility = VisibilityStatus.PUBLIC;
    }

    // Status filter
    const status = searchParams.get('status');
    if (status && ['draft', 'active', 'closed', 'cancelled'].includes(status)) {
      query.status = status;
    } else {
      // Default to active polls
      query.status = { $in: ['active', 'closed'] };
    }

    // Category filter
    const category = searchParams.get('category');
    if (category && ['event', 'decision', 'opinion', 'planning', 'fun', 'other'].includes(category)) {
      query.category = category;
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [polls, total] = await Promise.all([
      Poll.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .lean(),
      Poll.countDocuments(query),
    ]);

    // Add user vote status if authenticated
    const enrichedPolls = polls.map(poll => {
      const hasVoted = user ? poll.options.some((opt: { votes: Types.ObjectId[] }) =>
        opt.votes.some(v => v.toString() === user._id)
      ) : false;

      return {
        ...poll,
        hasVoted,
        userVotes: user ? poll.options
          .filter((opt: { votes: Types.ObjectId[] }) => opt.votes.some(v => v.toString() === user._id))
          .map((opt: { _id: Types.ObjectId }) => opt._id) : [],
      };
    });

    return successResponse(
      enrichedPolls,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List polls error:', error);
    return errorResponse('Failed to list polls', 500);
  }
}

// POST /api/polls - Create poll
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to create polls');
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      options,
      allowMultipleVotes,
      allowAddOptions,
      showResultsBeforeVoting,
      isAnonymous,
      startsAt,
      endsAt,
      visibility,
      requiredParticipants,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.title = 'Poll title must be at least 2 characters';
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      errors.options = 'At least two options are required';
    }

    if (options && options.some((opt: unknown) => typeof opt !== 'string' || (opt as string).trim().length === 0)) {
      errors.options = 'All options must be non-empty strings';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    const poll = new Poll({
      familyId: user.familyId,
      title: title.trim(),
      description: description?.trim(),
      category: category || 'decision',
      options: options.map((text: string) => ({
        text: text.trim(),
        votes: [],
      })),
      allowMultipleVotes: allowMultipleVotes || false,
      allowAddOptions: allowAddOptions || false,
      showResultsBeforeVoting: showResultsBeforeVoting !== false,
      isAnonymous: isAnonymous || false,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      status: 'active',
      visibility: visibility || VisibilityStatus.FAMILY,
      requiredParticipants: requiredParticipants?.map((id: string) => new Types.ObjectId(id)) || [],
      createdBy: user._id,
    });

    await poll.save();

    await audit.contentCreate(
      { user, request },
      user.familyId,
      poll._id.toString(),
      'poll',
      poll.title
    );

    return successResponse(poll, 'Poll created successfully');
  } catch (error) {
    console.error('Create poll error:', error);
    return errorResponse('Failed to create poll', 500);
  }
}
