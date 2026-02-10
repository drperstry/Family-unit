import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { AuditAction, UserRole } from '@/types';

export interface AuditLogDocument extends Document {
  familyId?: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: UserRole;
  action: AuditAction;
  entityId?: Types.ObjectId;
  entityType?: string;
  targetUserId?: Types.ObjectId;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    index: true,
  },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  actorRole: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
  },
  action: {
    type: String,
    enum: Object.values(AuditAction),
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  entityType: {
    type: String,
    index: true,
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes for efficient querying
AuditLogSchema.index({ familyId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entityId: 1, entityType: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ familyId: 1, action: 1, createdAt: -1 });

// TTL index - keep audit logs for 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Static methods for common queries
AuditLogSchema.statics.logAction = async function(data: {
  familyId?: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  entityId?: string;
  entityType?: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}) {
  return this.create(data);
};

AuditLogSchema.statics.getRecentActivity = function(
  familyId: string,
  limit: number = 20
) {
  return this.find({ familyId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'firstName lastName email avatar')
    .populate('targetUserId', 'firstName lastName email avatar');
};

AuditLogSchema.statics.getUserActivity = function(
  userId: string,
  options?: {
    familyId?: string;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    limit?: number;
  }
) {
  const query: Record<string, unknown> = { actorId: userId };

  if (options?.familyId) {
    query.familyId = options.familyId;
  }

  if (options?.action) {
    query.action = options.action;
  }

  if (options?.from || options?.to) {
    query.createdAt = {};
    if (options.from) {
      (query.createdAt as Record<string, unknown>).$gte = options.from;
    }
    if (options.to) {
      (query.createdAt as Record<string, unknown>).$lte = options.to;
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options?.limit || 50);
};

AuditLogSchema.statics.getEntityHistory = function(
  entityId: string,
  entityType: string
) {
  return this.find({ entityId, entityType })
    .sort({ createdAt: -1 })
    .populate('actorId', 'firstName lastName email avatar');
};

AuditLogSchema.statics.getActionStats = async function(
  familyId: string,
  from: Date,
  to: Date
) {
  return this.aggregate([
    {
      $match: {
        familyId: new mongoose.Types.ObjectId(familyId),
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

export const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);

export default AuditLog;
