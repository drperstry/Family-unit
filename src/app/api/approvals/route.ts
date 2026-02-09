import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Approval } from '@/models/Approval';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { Entity } from '@/models/Entity';
import { Event } from '@/models/Event';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, ContentStatus, FamilyStatus, EntityType } from '@/types';
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

// GET /api/approvals - Get pending approvals
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can view approvals
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can view approvals');
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    await connectDB();

    const query: Record<string, unknown> = {};

    // Family admin sees only their family's approvals
    if (user.role === UserRole.FAMILY_ADMIN) {
      if (!user.familyId) {
        return errorResponse('You are not associated with a family', 400);
      }
      query.familyId = user.familyId;
    } else {
      // System admin can filter by family
      const familyId = searchParams.get('familyId');
      if (familyId) {
        query.familyId = familyId;
      }
    }

    // Status filter
    const status = searchParams.get('status') || 'pending';
    if (status !== 'all') {
      query.status = status;
    }

    // Entity type filter
    const entityType = searchParams.get('entityType');
    if (entityType) {
      query.entityType = entityType;
    }

    const sortField = pagination.sortBy || 'requestedAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [approvals, total] = await Promise.all([
      Approval.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('requesterId', 'firstName lastName email avatar')
        .populate('reviewerId', 'firstName lastName email avatar')
        .populate('familyId', 'name slug'),
      Approval.countDocuments(query),
    ]);

    // Enrich with entity details
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const approvalObj = approval.toObject();

        // Get entity details based on type
        let entityDetails = null;
        try {
          switch (approval.entityType) {
            case 'family':
              entityDetails = await Family.findById(approval.entityId)
                .select('name slug visibility status');
              break;
            case 'member':
              entityDetails = await FamilyMember.findById(approval.entityId)
                .select('firstName lastName gender photo');
              break;
            default:
              if (Object.values(EntityType).includes(approval.entityType as EntityType)) {
                entityDetails = await Entity.findById(approval.entityId)
                  .select('title description entityType');
              }
          }
        } catch (e) {
          console.error('Error fetching entity details:', e);
        }

        return {
          ...approvalObj,
          entityDetails,
        };
      })
    );

    return successResponse(
      enrichedApprovals,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Get approvals error:', error);
    return errorResponse('Failed to get approvals', 500);
  }
}

// POST /api/approvals - Process approval (approve/reject)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can process approvals
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can process approvals');
    }

    const body = await request.json();
    const { approvalId, action, comments } = body;

    if (!approvalId || !isValidObjectId(approvalId)) {
      return errorResponse('Valid approval ID is required', 400);
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return errorResponse('Action must be "approve" or "reject"', 400);
    }

    await connectDB();

    const approval = await Approval.findById(approvalId);

    if (!approval) {
      return notFoundResponse('Approval');
    }

    if (approval.status !== 'pending') {
      return errorResponse('This approval has already been processed', 400);
    }

    // Family admin can only approve their family's items
    if (user.role === UserRole.FAMILY_ADMIN) {
      // For family approvals, system admin is required
      if (approval.entityType === 'family') {
        return forbiddenResponse('Only system admins can approve families');
      }

      if (user.familyId !== approval.familyId.toString()) {
        return forbiddenResponse('You can only approve items in your family');
      }
    }

    // Update approval status
    approval.status = action === 'approve' ? 'approved' : 'rejected';
    approval.reviewerId = user._id;
    approval.reviewedAt = new Date();
    approval.comments = comments;
    await approval.save();

    // Update the entity based on approval
    const newStatus = action === 'approve' ? ContentStatus.APPROVED : ContentStatus.REJECTED;
    let entityTitle = 'Unknown';

    switch (approval.entityType) {
      case 'family':
        const family = await Family.findByIdAndUpdate(
          approval.entityId,
          {
            status: action === 'approve' ? FamilyStatus.ACTIVE : FamilyStatus.SUSPENDED,
          },
          { new: true }
        );
        entityTitle = family?.name || entityTitle;

        // Audit family approval
        await audit.familyApprove(
          { user, request },
          approval.entityId.toString(),
          entityTitle,
          action === 'approve'
        );
        break;

      case 'member':
        const member = await FamilyMember.findByIdAndUpdate(
          approval.entityId,
          { status: newStatus },
          { new: true }
        );
        entityTitle = member ? `${member.firstName} ${member.lastName}` : entityTitle;

        // Update family member count if approved
        if (action === 'approve') {
          await Family.findByIdAndUpdate(approval.familyId, {
            $inc: { 'stats.memberCount': 1 },
          });
        }
        break;

      default:
        // Handle entity types
        if (Object.values(EntityType).includes(approval.entityType as EntityType)) {
          const entity = await Entity.findByIdAndUpdate(
            approval.entityId,
            { status: newStatus },
            { new: true }
          );
          entityTitle = entity?.title || entityTitle;
        } else if (approval.entityType === EntityType.EVENT) {
          const event = await Event.findByIdAndUpdate(
            approval.entityId,
            { status: newStatus },
            { new: true }
          );
          entityTitle = event?.title || entityTitle;
        }
    }

    // Update family pending approvals count
    await Family.findByIdAndUpdate(approval.familyId, {
      $inc: { 'stats.pendingApprovals': -1 },
    });

    // Audit the approval/rejection
    if (action === 'approve') {
      await audit.approve(
        { user, request },
        approval.familyId.toString(),
        approval.entityId.toString(),
        approval.entityType,
        entityTitle,
        comments
      );
    } else {
      await audit.reject(
        { user, request },
        approval.familyId.toString(),
        approval.entityId.toString(),
        approval.entityType,
        entityTitle,
        comments || 'No reason provided'
      );
    }

    return successResponse(
      approval,
      `${entityTitle} has been ${action === 'approve' ? 'approved' : 'rejected'}`
    );
  } catch (error) {
    console.error('Process approval error:', error);
    return errorResponse('Failed to process approval', 500);
  }
}
