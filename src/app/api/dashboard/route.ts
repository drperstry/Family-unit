import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { Entity } from '@/models/Entity';
import { Event } from '@/models/Event';
import { Approval } from '@/models/Approval';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { UserRole, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
} from '@/lib/utils';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || user.familyId;

    await connectDB();

    // System admin dashboard (all families overview)
    if (user.role === UserRole.SYSTEM_ADMIN && !familyId) {
      return getSystemAdminDashboard(request);
    }

    // Family admin/member dashboard
    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const canAccess = user.role === UserRole.SYSTEM_ADMIN || user.familyId === familyId;

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this dashboard');
    }

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel
    const [
      totalMembers,
      membersLastMonth,
      membersPrevMonth,
      totalContent,
      contentLastMonth,
      contentPrevMonth,
      pendingApprovals,
      upcomingEvents,
      recentActivity,
      contentByType,
      membersByGeneration,
      contentGrowth,
    ] = await Promise.all([
      // Total members
      FamilyMember.countDocuments({ familyId, status: ContentStatus.APPROVED }),

      // Members added last 30 days
      FamilyMember.countDocuments({
        familyId,
        status: ContentStatus.APPROVED,
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Members added 30-60 days ago
      FamilyMember.countDocuments({
        familyId,
        status: ContentStatus.APPROVED,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      // Total content
      Entity.countDocuments({ familyId, status: ContentStatus.APPROVED }),

      // Content created last 30 days
      Entity.countDocuments({
        familyId,
        status: ContentStatus.APPROVED,
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Content created 30-60 days ago
      Entity.countDocuments({
        familyId,
        status: ContentStatus.APPROVED,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      // Pending approvals
      Approval.countDocuments({ familyId, status: 'pending' }),

      // Upcoming events (next 30 days)
      Event.find({
        familyId,
        status: ContentStatus.APPROVED,
        startDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      })
        .sort({ startDate: 1 })
        .limit(5)
        .select('title startDate endDate'),

      // Recent activity
      AuditLog.find({ familyId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actorId', 'firstName lastName avatar'),

      // Content by type
      Entity.aggregate([
        { $match: { familyId: family._id, isDeleted: false, status: ContentStatus.APPROVED } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Members by generation
      FamilyMember.aggregate([
        { $match: { familyId: family._id, isDeleted: false, status: ContentStatus.APPROVED } },
        { $group: { _id: '$generation', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Content growth (last 6 months)
      Entity.aggregate([
        {
          $match: {
            familyId: family._id,
            isDeleted: false,
            createdAt: { $gte: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const membersChange = calculateChange(membersLastMonth, membersPrevMonth);
    const contentChange = calculateChange(contentLastMonth, contentPrevMonth);

    return successResponse({
      family: {
        id: family._id,
        name: family.name,
        status: family.status,
        visibility: family.visibility,
      },
      stats: {
        members: {
          value: totalMembers,
          change: membersChange,
          changeType: membersChange > 0 ? 'increase' : membersChange < 0 ? 'decrease' : 'neutral',
          period: 'last 30 days',
        },
        content: {
          value: totalContent,
          change: contentChange,
          changeType: contentChange > 0 ? 'increase' : contentChange < 0 ? 'decrease' : 'neutral',
          period: 'last 30 days',
        },
        pendingApprovals: {
          value: pendingApprovals,
          change: 0,
          changeType: 'neutral',
          period: 'current',
        },
        upcomingEvents: {
          value: upcomingEvents.length,
          change: 0,
          changeType: 'neutral',
          period: 'next 30 days',
        },
      },
      upcomingEvents,
      recentActivity: recentActivity.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        actor: log.actorId,
        entityType: log.entityType,
        timestamp: log.createdAt,
        details: log.details,
      })),
      charts: {
        contentByType: contentByType.map((item) => ({
          label: item._id,
          value: item.count,
        })),
        membersByGeneration: membersByGeneration.map((item) => ({
          label: `Gen ${item._id}`,
          value: item.count,
        })),
        contentGrowth: contentGrowth.map((item) => ({
          label: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          value: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse('Failed to get dashboard data', 500);
  }
}

// System admin dashboard
async function getSystemAdminDashboard(request: NextRequest) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalFamilies,
    activeFamilies,
    pendingFamilies,
    totalUsers,
    totalMembers,
    recentFamilies,
    pendingApprovals,
    recentActivity,
    familiesByStatus,
  ] = await Promise.all([
    Family.countDocuments({}),
    Family.countDocuments({ status: 'active' }),
    Family.countDocuments({ status: 'pending' }),
    User.countDocuments({}),
    FamilyMember.countDocuments({}),
    Family.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status visibility createdAt'),
    Approval.find({ entityType: 'family', status: 'pending' })
      .sort({ requestedAt: 1 })
      .limit(10)
      .populate('requesterId', 'firstName lastName email'),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('actorId', 'firstName lastName avatar'),
    Family.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return successResponse({
    stats: {
      totalFamilies: {
        value: totalFamilies,
        change: 0,
        changeType: 'neutral',
        period: 'all time',
      },
      activeFamilies: {
        value: activeFamilies,
        change: 0,
        changeType: 'neutral',
        period: 'current',
      },
      pendingFamilies: {
        value: pendingFamilies,
        change: 0,
        changeType: 'neutral',
        period: 'current',
      },
      totalUsers: {
        value: totalUsers,
        change: 0,
        changeType: 'neutral',
        period: 'all time',
      },
      totalMembers: {
        value: totalMembers,
        change: 0,
        changeType: 'neutral',
        period: 'all time',
      },
    },
    recentFamilies,
    pendingApprovals: pendingApprovals.map((approval) => ({
      id: approval._id.toString(),
      entityId: approval.entityId,
      requester: approval.requesterId,
      requestedAt: approval.requestedAt,
    })),
    recentActivity: recentActivity.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      actor: log.actorId,
      familyId: log.familyId,
      entityType: log.entityType,
      timestamp: log.createdAt,
    })),
    charts: {
      familiesByStatus: familiesByStatus.map((item) => ({
        label: item._id,
        value: item.count,
      })),
    },
  });
}
