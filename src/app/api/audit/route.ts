import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';
import { Family } from '@/models/Family';
import { getCurrentUser } from '@/lib/auth';
import { UserRole, AuditAction } from '@/types';
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

// GET /api/audit - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can view audit logs
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can view audit logs');
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    await connectDB();

    const query: Record<string, unknown> = {};

    // Family admin can only see their family's logs
    if (user.role === UserRole.FAMILY_ADMIN) {
      if (!user.familyId) {
        return errorResponse('You are not associated with a family', 400);
      }
      query.familyId = user.familyId;
    } else {
      // System admin can filter by family
      const familyId = searchParams.get('familyId');
      if (familyId) {
        if (!isValidObjectId(familyId)) {
          return errorResponse('Invalid family ID', 400);
        }
        query.familyId = familyId;
      }
    }

    // Action filter
    const action = searchParams.get('action');
    if (action && Object.values(AuditAction).includes(action as AuditAction)) {
      query.action = action;
    }

    // Actor filter
    const actorId = searchParams.get('actorId');
    if (actorId && isValidObjectId(actorId)) {
      query.actorId = actorId;
    }

    // Entity type filter
    const entityType = searchParams.get('entityType');
    if (entityType) {
      query.entityType = entityType;
    }

    // Date range filter
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('actorId', 'firstName lastName email avatar')
        .populate('targetUserId', 'firstName lastName email'),
      AuditLog.countDocuments(query),
    ]);

    // Enrich logs with family info if system admin
    let enrichedLogs = logs;
    if (user.role === UserRole.SYSTEM_ADMIN) {
      const familyIds = [...new Set(logs.map((l) => l.familyId?.toString()).filter(Boolean))];
      const families = await Family.find({ _id: { $in: familyIds } }).select('name slug');
      const familyMap = new Map(families.map((f) => [f._id.toString(), f]));

      enrichedLogs = logs.map((log) => {
        const logObj = log.toObject();
        if (log.familyId) {
          (logObj as Record<string, unknown>).family = familyMap.get(log.familyId.toString());
        }
        return logObj;
      });
    }

    return successResponse(
      enrichedLogs,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Get audit logs error:', error);
    return errorResponse('Failed to get audit logs', 500);
  }
}

// GET /api/audit/stats - Get audit statistics
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can view audit statistics');
    }

    const body = await request.json();
    const { familyId, dateFrom, dateTo } = body;

    await connectDB();

    const matchQuery: Record<string, unknown> = {};

    // Family admin can only see their family's stats
    if (user.role === UserRole.FAMILY_ADMIN) {
      if (!user.familyId) {
        return errorResponse('You are not associated with a family', 400);
      }
      matchQuery.familyId = user.familyId;
    } else if (familyId) {
      matchQuery.familyId = familyId;
    }

    // Date range
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    matchQuery.createdAt = { $gte: from, $lte: to };

    const [actionStats, dailyActivity, topActors, entityStats] = await Promise.all([
      // Actions by type
      AuditLog.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Daily activity
      AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Top actors
      AuditLog.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$actorId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            count: 1,
            user: {
              firstName: 1,
              lastName: 1,
              email: 1,
            },
          },
        },
      ]),

      // Entity type breakdown
      AuditLog.aggregate([
        { $match: { ...matchQuery, entityType: { $exists: true, $ne: null } } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return successResponse({
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      actionStats: actionStats.map((a) => ({
        action: a._id,
        count: a.count,
      })),
      dailyActivity: dailyActivity.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        count: d.count,
      })),
      topActors: topActors.map((a) => ({
        user: a.user,
        actionCount: a.count,
      })),
      entityStats: entityStats.map((e) => ({
        entityType: e._id,
        count: e.count,
      })),
      totalActions: actionStats.reduce((sum, a) => sum + a.count, 0),
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    return errorResponse('Failed to get audit statistics', 500);
  }
}
