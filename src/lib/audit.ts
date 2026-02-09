import { NextRequest } from 'next/server';
import { AuditLog } from '@/models/AuditLog';
import { AuditAction, UserRole, SafeUser } from '@/types';
import connectDB from './db';

interface AuditContext {
  user: SafeUser;
  request?: NextRequest;
  sessionId?: string;
}

interface AuditData {
  familyId?: string;
  entityId?: string;
  entityType?: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
}

// Create audit log entry
export async function createAuditLog(
  action: AuditAction,
  context: AuditContext,
  data: AuditData = {}
): Promise<void> {
  try {
    await connectDB();

    const logData = {
      familyId: data.familyId,
      actorId: context.user._id,
      actorRole: context.user.role as UserRole,
      action,
      entityId: data.entityId,
      entityType: data.entityType,
      targetUserId: data.targetUserId,
      details: data.details || {},
      ipAddress: context.request?.headers.get('x-forwarded-for') ||
        context.request?.headers.get('x-real-ip') ||
        'unknown',
      userAgent: context.request?.headers.get('user-agent') || 'unknown',
      sessionId: context.sessionId,
    };

    await AuditLog.create(logData);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

// Audit logging helper functions for common actions
export const audit = {
  // User actions
  login: async (context: AuditContext) => {
    await createAuditLog(AuditAction.LOGIN, context, {
      details: { method: 'password' },
    });
  },

  logout: async (context: AuditContext) => {
    await createAuditLog(AuditAction.LOGOUT, context);
  },

  // Family actions
  familyCreate: async (
    context: AuditContext,
    familyId: string,
    familyName: string,
    isPublic: boolean
  ) => {
    await createAuditLog(AuditAction.FAMILY_CREATE, context, {
      familyId,
      entityId: familyId,
      entityType: 'family',
      details: { familyName, isPublic },
    });
  },

  familyApprove: async (
    context: AuditContext,
    familyId: string,
    familyName: string,
    approved: boolean
  ) => {
    await createAuditLog(AuditAction.FAMILY_APPROVE, context, {
      familyId,
      entityId: familyId,
      entityType: 'family',
      details: { familyName, approved },
    });
  },

  // Member actions
  memberAdd: async (
    context: AuditContext,
    familyId: string,
    memberId: string,
    memberName: string
  ) => {
    await createAuditLog(AuditAction.MEMBER_ADD, context, {
      familyId,
      entityId: memberId,
      entityType: 'familyMember',
      details: { memberName },
    });
  },

  memberRemove: async (
    context: AuditContext,
    familyId: string,
    memberId: string,
    memberName: string,
    reason?: string
  ) => {
    await createAuditLog(AuditAction.MEMBER_REMOVE, context, {
      familyId,
      entityId: memberId,
      entityType: 'familyMember',
      details: { memberName, reason },
    });
  },

  // Content actions
  create: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    title: string
  ) => {
    await createAuditLog(AuditAction.CREATE, context, {
      familyId,
      entityId,
      entityType,
      details: { title },
    });
  },

  update: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    changes: Record<string, { old: unknown; new: unknown }>
  ) => {
    await createAuditLog(AuditAction.UPDATE, context, {
      familyId,
      entityId,
      entityType,
      details: { changes },
    });
  },

  delete: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    title: string,
    reason?: string
  ) => {
    await createAuditLog(AuditAction.DELETE, context, {
      familyId,
      entityId,
      entityType,
      details: { title, reason },
    });
  },

  restore: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    title: string
  ) => {
    await createAuditLog(AuditAction.RESTORE, context, {
      familyId,
      entityId,
      entityType,
      details: { title },
    });
  },

  // Approval actions
  approve: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    title: string,
    comments?: string
  ) => {
    await createAuditLog(AuditAction.APPROVE, context, {
      familyId,
      entityId,
      entityType,
      details: { title, comments },
    });
  },

  reject: async (
    context: AuditContext,
    familyId: string,
    entityId: string,
    entityType: string,
    title: string,
    reason: string
  ) => {
    await createAuditLog(AuditAction.REJECT, context, {
      familyId,
      entityId,
      entityType,
      details: { title, reason },
    });
  },

  // Role changes
  roleChange: async (
    context: AuditContext,
    targetUserId: string,
    oldRole: UserRole,
    newRole: UserRole,
    familyId?: string
  ) => {
    await createAuditLog(AuditAction.ROLE_CHANGE, context, {
      familyId,
      targetUserId,
      details: { oldRole, newRole },
    });
  },

  // Tree actions
  treeUpdate: async (
    context: AuditContext,
    familyId: string,
    version: number,
    changeDescription: string
  ) => {
    await createAuditLog(AuditAction.TREE_UPDATE, context, {
      familyId,
      entityType: 'familyTree',
      details: { version, changeDescription },
    });
  },

  // Export actions
  export: async (
    context: AuditContext,
    familyId: string,
    exportType: string,
    format: string
  ) => {
    await createAuditLog(AuditAction.EXPORT, context, {
      familyId,
      details: { exportType, format },
    });
  },

  // Import actions
  import: async (
    context: AuditContext,
    familyId: string,
    importType: string,
    itemCount: number
  ) => {
    await createAuditLog(AuditAction.IMPORT, context, {
      familyId,
      details: { importType, itemCount },
    });
  },
};

// Get audit logs with filters
export async function getAuditLogs(options: {
  familyId?: string;
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  await connectDB();

  const query: Record<string, unknown> = {};

  if (options.familyId) {
    query.familyId = options.familyId;
  }

  if (options.actorId) {
    query.actorId = options.actorId;
  }

  if (options.action) {
    query.action = options.action;
  }

  if (options.entityType) {
    query.entityType = options.entityType;
  }

  if (options.from || options.to) {
    query.createdAt = {};
    if (options.from) {
      (query.createdAt as Record<string, unknown>).$gte = options.from;
    }
    if (options.to) {
      (query.createdAt as Record<string, unknown>).$lte = options.to;
    }
  }

  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'firstName lastName email avatar')
      .populate('targetUserId', 'firstName lastName email avatar'),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
