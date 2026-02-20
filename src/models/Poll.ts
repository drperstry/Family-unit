import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { VisibilityStatus } from '@/types';

export interface PollDocument extends Document {
  familyId: Types.ObjectId;
  title: string;
  description?: string;
  category: 'event' | 'decision' | 'opinion' | 'planning' | 'fun' | 'other';
  options: Array<{
    _id: Types.ObjectId;
    text: string;
    votes: Types.ObjectId[];
    color?: string;
  }>;
  allowMultipleVotes: boolean;
  allowAddOptions: boolean;
  showResultsBeforeVoting: boolean;
  isAnonymous: boolean;
  startsAt?: Date;
  endsAt?: Date;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  visibility: VisibilityStatus;
  requiredParticipants?: Types.ObjectId[]; // Members who must vote
  reminders: Array<{
    sentAt: Date;
    sentTo: Types.ObjectId[];
  }>;
  result?: {
    winningOptionId?: Types.ObjectId;
    totalVotes: number;
    decidedAt: Date;
    decidedBy?: Types.ObjectId;
    notes?: string;
  };
  commentsCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema({
  text: { type: String, required: true, maxlength: 200 },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  color: String,
}, { _id: true });

const ReminderSchema = new Schema({
  sentAt: { type: Date, required: true },
  sentTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const PollResultSchema = new Schema({
  winningOptionId: { type: Schema.Types.ObjectId },
  totalVotes: { type: Number, required: true },
  decidedAt: { type: Date, required: true },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { _id: false });

const PollSchema = new Schema<PollDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Poll title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  category: {
    type: String,
    enum: ['event', 'decision', 'opinion', 'planning', 'fun', 'other'],
    default: 'decision',
  },
  options: {
    type: [PollOptionSchema],
    required: true,
    validate: {
      validator: (v: unknown[]) => v.length >= 2,
      message: 'At least two options are required',
    },
  },
  allowMultipleVotes: {
    type: Boolean,
    default: false,
  },
  allowAddOptions: {
    type: Boolean,
    default: false,
  },
  showResultsBeforeVoting: {
    type: Boolean,
    default: true,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  startsAt: Date,
  endsAt: Date,
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'cancelled'],
    default: 'active',
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.FAMILY_ONLY,
  },
  requiredParticipants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  reminders: [ReminderSchema],
  result: PollResultSchema,
  commentsCount: {
    type: Number,
    default: 0,
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
PollSchema.index({ familyId: 1, status: 1 });
PollSchema.index({ endsAt: 1 }, { sparse: true });

// Virtual for total vote count
PollSchema.virtual('totalVotes').get(function() {
  return this.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
});

// Virtual for unique voter count
PollSchema.virtual('voterCount').get(function() {
  const voters = new Set<string>();
  this.options.forEach(opt => {
    opt.votes?.forEach(v => voters.add(v.toString()));
  });
  return voters.size;
});

// Virtual for is active
PollSchema.virtual('isActive').get(function() {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.startsAt && now < this.startsAt) return false;
  if (this.endsAt && now > this.endsAt) return false;
  return true;
});

// Virtual for time remaining
PollSchema.virtual('timeRemaining').get(function() {
  if (!this.endsAt) return null;
  const remaining = this.endsAt.getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
});

// Method to check if user has voted
PollSchema.methods.hasUserVoted = function(userId: string): boolean {
  return this.options.some((opt: { votes: Types.ObjectId[] }) =>
    opt.votes?.some(v => v.toString() === userId)
  );
};

// Method to get user's votes
PollSchema.methods.getUserVotes = function(userId: string): Types.ObjectId[] {
  const votes: Types.ObjectId[] = [];
  this.options.forEach((opt: { _id: Types.ObjectId; votes: Types.ObjectId[] }) => {
    if (opt.votes?.some(v => v.toString() === userId)) {
      votes.push(opt._id);
    }
  });
  return votes;
};

export const Poll: Model<PollDocument> =
  mongoose.models.Poll || mongoose.model<PollDocument>('Poll', PollSchema);

export default Poll;
