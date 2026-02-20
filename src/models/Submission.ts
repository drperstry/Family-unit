import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus } from '@/types';

export interface SubmissionDocument extends Document {
  familyId: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'family_tree_update' | 'member_addition' | 'photo_upload' | 'news_post' | 'event_creation' | 'general_request' | 'service_request';
  title: string;
  description: string;
  data: Record<string, unknown>;
  attachments?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  completedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<SubmissionDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['family_tree_update', 'member_addition', 'photo_upload', 'news_post', 'event_creation', 'general_request', 'service_request'],
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 5000,
  },
  data: {
    type: Schema.Types.Mixed,
    default: {},
  },
  attachments: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewNotes: {
    type: String,
    maxlength: 2000,
  },
  completedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
SubmissionSchema.index({ familyId: 1, status: 1 });
SubmissionSchema.index({ familyId: 1, type: 1, status: 1 });
SubmissionSchema.index({ userId: 1, status: 1 });
SubmissionSchema.index({ assignedTo: 1, status: 1 });
SubmissionSchema.index({ createdAt: -1 });
SubmissionSchema.index({ priority: 1, createdAt: -1 });

// Virtual for age of submission
SubmissionSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Static methods
SubmissionSchema.statics.getPendingCount = function(familyId: string) {
  return this.countDocuments({ familyId, status: { $in: ['pending', 'under_review'] } });
};

SubmissionSchema.statics.getByFamily = function(familyId: string, options?: {
  status?: string;
  type?: string;
  limit?: number;
  skip?: number;
}) {
  const query = this.find({ familyId });

  if (options?.status) {
    query.where('status', options.status);
  }
  if (options?.type) {
    query.where('type', options.type);
  }

  query.sort({ createdAt: -1 });

  if (options?.skip) {
    query.skip(options.skip);
  }
  if (options?.limit) {
    query.limit(options.limit);
  }

  return query.populate('userId', 'firstName lastName avatar email')
    .populate('assignedTo', 'firstName lastName avatar')
    .populate('reviewedBy', 'firstName lastName');
};

export const Submission: Model<SubmissionDocument> =
  mongoose.models.Submission || mongoose.model<SubmissionDocument>('Submission', SubmissionSchema);

export default Submission;
