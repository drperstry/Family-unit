import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { EntityType } from '@/types';

export interface ApprovalDocument extends Document {
  familyId: Types.ObjectId;
  entityId: Types.ObjectId;
  entityType: EntityType | 'family' | 'member';
  requesterId: Types.ObjectId;
  reviewerId?: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  comments?: string;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

const ApprovalChangeSchema = new Schema({
  field: { type: String, required: true },
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
}, { _id: false });

const ApprovalSchema = new Schema<ApprovalDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  entityType: {
    type: String,
    enum: [...Object.values(EntityType), 'family', 'member'],
    required: true,
    index: true,
  },
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  reviewedAt: Date,
  comments: {
    type: String,
    maxlength: 2000,
  },
  changes: [ApprovalChangeSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
ApprovalSchema.index({ familyId: 1, status: 1 });
ApprovalSchema.index({ familyId: 1, entityType: 1, status: 1 });
ApprovalSchema.index({ requesterId: 1, status: 1 });
ApprovalSchema.index({ reviewerId: 1, reviewedAt: -1 });
ApprovalSchema.index({ requestedAt: -1 });
ApprovalSchema.index({ status: 1, requestedAt: -1 });

// Virtual for time pending
ApprovalSchema.virtual('pendingDuration').get(function() {
  if (this.status !== 'pending') return null;
  return Date.now() - this.requestedAt.getTime();
});

// Static method to get pending approvals count
ApprovalSchema.statics.getPendingCount = function(familyId: string) {
  return this.countDocuments({ familyId, status: 'pending' });
};

// Static method to get pending approvals for a family
ApprovalSchema.statics.getPendingApprovals = function(familyId: string, options?: {
  entityType?: string;
  limit?: number;
  skip?: number;
}) {
  const query = this.find({ familyId, status: 'pending' });

  if (options?.entityType) {
    query.where('entityType', options.entityType);
  }

  query.sort({ requestedAt: 1 }); // Oldest first

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.skip) {
    query.skip(options.skip);
  }

  return query
    .populate('requesterId', 'firstName lastName email avatar')
    .populate('reviewerId', 'firstName lastName email avatar');
};

export const Approval: Model<ApprovalDocument> =
  mongoose.models.Approval || mongoose.model<ApprovalDocument>('Approval', ApprovalSchema);

export default Approval;
