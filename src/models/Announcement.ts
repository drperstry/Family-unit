import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface AnnouncementDocument extends Document {
  familyId: Types.ObjectId;
  title: string;
  content: string;
  type: 'announcement' | 'milestone' | 'achievement' | 'birthday' | 'anniversary' | 'birth' | 'wedding' | 'graduation' | 'memorial' | 'news' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  images: string[];
  video?: string;
  relatedMembers?: Types.ObjectId[];
  relatedEvent?: Types.ObjectId;
  date?: Date; // Date of the milestone/event
  isPinned: boolean;
  pinnedUntil?: Date;
  expiresAt?: Date;
  reactions: Array<{
    userId: Types.ObjectId;
    type: 'like' | 'love' | 'celebrate' | 'support' | 'sad';
    createdAt: Date;
  }>;
  readBy: Array<{
    userId: Types.ObjectId;
    readAt: Date;
  }>;
  status: ContentStatus;
  visibility: VisibilityStatus;
  commentsCount: number;
  notificationsSent: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'celebrate', 'support', 'sad'], required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ReadBySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, default: Date.now },
}, { _id: false });

const AnnouncementSchema = new Schema<AnnouncementDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: 5000,
  },
  type: {
    type: String,
    enum: ['announcement', 'milestone', 'achievement', 'birthday', 'anniversary', 'birth', 'wedding', 'graduation', 'memorial', 'news', 'other'],
    default: 'announcement',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  images: [String],
  video: String,
  relatedMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  }],
  relatedEvent: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
  },
  date: Date,
  isPinned: {
    type: Boolean,
    default: false,
    index: true,
  },
  pinnedUntil: Date,
  expiresAt: Date,
  reactions: [ReactionSchema],
  readBy: [ReadBySchema],
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PENDING,
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.FAMILY_ONLY,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  notificationsSent: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
AnnouncementSchema.index({ familyId: 1, status: 1, createdAt: -1 });
AnnouncementSchema.index({ familyId: 1, isPinned: 1 });
AnnouncementSchema.index({ expiresAt: 1 }, { sparse: true });
AnnouncementSchema.index({ title: 'text', content: 'text' });

// Virtual for reaction counts by type
AnnouncementSchema.virtual('reactionCounts').get(function() {
  const counts: Record<string, number> = {
    like: 0,
    love: 0,
    celebrate: 0,
    support: 0,
    sad: 0,
  };
  this.reactions?.forEach(r => {
    if (counts[r.type] !== undefined) {
      counts[r.type]++;
    }
  });
  return counts;
});

// Virtual for total reactions
AnnouncementSchema.virtual('totalReactions').get(function() {
  return this.reactions?.length || 0;
});

// Virtual for read count
AnnouncementSchema.virtual('readCount').get(function() {
  return this.readBy?.length || 0;
});

// Virtual for is expired
AnnouncementSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for should be pinned (considers pinnedUntil)
AnnouncementSchema.virtual('shouldBePinned').get(function() {
  if (!this.isPinned) return false;
  if (!this.pinnedUntil) return true;
  return new Date() <= this.pinnedUntil;
});

// Method to check if user has reacted
AnnouncementSchema.methods.hasUserReacted = function(userId: string): boolean {
  return this.reactions?.some((r: { userId: Types.ObjectId }) => r.userId.toString() === userId) ?? false;
};

// Method to get user's reaction
AnnouncementSchema.methods.getUserReaction = function(userId: string): string | null {
  const reaction = this.reactions?.find((r: { userId: Types.ObjectId }) => r.userId.toString() === userId);
  return reaction?.type ?? null;
};

export const Announcement: Model<AnnouncementDocument> =
  mongoose.models.Announcement || mongoose.model<AnnouncementDocument>('Announcement', AnnouncementSchema);

export default Announcement;
