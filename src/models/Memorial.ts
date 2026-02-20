import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface MemorialDocument extends Document {
  familyId: Types.ObjectId;
  memberId: Types.ObjectId; // The deceased family member
  title?: string; // Optional custom title
  biography: string;
  birthDate?: Date;
  deathDate?: Date;
  birthPlace?: string;
  deathPlace?: string;
  restingPlace?: string; // Cemetery/location
  epitaph?: string;
  lifeStory?: string;
  achievements?: string[];
  quotes?: string[]; // Memorable quotes from the person
  photos: Array<{
    url: string;
    caption?: string;
    year?: number;
    isMain: boolean;
  }>;
  videos?: Array<{
    url: string;
    title?: string;
    description?: string;
  }>;
  timeline?: Array<{
    year: number;
    title: string;
    description?: string;
    image?: string;
  }>;
  tributes: Array<{
    _id: Types.ObjectId;
    author: Types.ObjectId;
    relationship?: string;
    content: string;
    images?: string[];
    isApproved: boolean;
    createdAt: Date;
  }>;
  candles: Array<{
    userId: Types.ObjectId;
    message?: string;
    litAt: Date;
  }>;
  flowers: Array<{
    userId: Types.ObjectId;
    type: string;
    message?: string;
    sentAt: Date;
  }>;
  anniversaryReminders: boolean;
  status: ContentStatus;
  visibility: VisibilityStatus;
  views: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema({
  url: { type: String, required: true },
  caption: String,
  year: Number,
  isMain: { type: Boolean, default: false },
}, { _id: true });

const VideoSchema = new Schema({
  url: { type: String, required: true },
  title: String,
  description: String,
}, { _id: true });

const TimelineSchema = new Schema({
  year: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  image: String,
}, { _id: true });

const TributeSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relationship: String,
  content: { type: String, required: true, maxlength: 2000 },
  images: [String],
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const CandleSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, maxlength: 200 },
  litAt: { type: Date, default: Date.now },
}, { _id: false });

const FlowerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, maxlength: 200 },
  sentAt: { type: Date, default: Date.now },
}, { _id: false });

const MemorialSchema = new Schema<MemorialDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  memberId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
    unique: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  biography: {
    type: String,
    required: [true, 'Biography is required'],
    maxlength: 10000,
  },
  birthDate: Date,
  deathDate: Date,
  birthPlace: String,
  deathPlace: String,
  restingPlace: String,
  epitaph: {
    type: String,
    maxlength: 500,
  },
  lifeStory: {
    type: String,
    maxlength: 20000,
  },
  achievements: [String],
  quotes: [String],
  photos: [PhotoSchema],
  videos: [VideoSchema],
  timeline: [TimelineSchema],
  tributes: [TributeSchema],
  candles: [CandleSchema],
  flowers: [FlowerSchema],
  anniversaryReminders: {
    type: Boolean,
    default: true,
  },
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
  views: {
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
MemorialSchema.index({ familyId: 1, status: 1 });
MemorialSchema.index({ deathDate: 1 });

// Virtual for member's full name
MemorialSchema.virtual('displayName').get(function() {
  return this.title || 'In Loving Memory';
});

// Virtual for age at death
MemorialSchema.virtual('ageAtDeath').get(function() {
  if (!this.birthDate || !this.deathDate) return null;
  const birth = new Date(this.birthDate);
  const death = new Date(this.deathDate);
  let age = death.getFullYear() - birth.getFullYear();
  const monthDiff = death.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
    age--;
  }
  return age;
});

// Virtual for years since passing
MemorialSchema.virtual('yearsSincePassing').get(function() {
  if (!this.deathDate) return null;
  const death = new Date(this.deathDate);
  const now = new Date();
  return now.getFullYear() - death.getFullYear();
});

// Virtual for candle count
MemorialSchema.virtual('candleCount').get(function() {
  return this.candles?.length || 0;
});

// Virtual for approved tribute count
MemorialSchema.virtual('tributeCount').get(function() {
  return this.tributes?.filter(t => t.isApproved).length || 0;
});

// Virtual for main photo
MemorialSchema.virtual('mainPhoto').get(function() {
  return this.photos?.find(p => p.isMain) || this.photos?.[0];
});

// Virtual for is death anniversary today
MemorialSchema.virtual('isDeathAnniversaryToday').get(function() {
  if (!this.deathDate) return false;
  const death = new Date(this.deathDate);
  const today = new Date();
  return death.getMonth() === today.getMonth() && death.getDate() === today.getDate();
});

// Virtual for next anniversary
MemorialSchema.virtual('nextAnniversary').get(function() {
  if (!this.deathDate) return null;
  const death = new Date(this.deathDate);
  const today = new Date();
  const nextAnniversary = new Date(today.getFullYear(), death.getMonth(), death.getDate());
  if (nextAnniversary < today) {
    nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
  }
  return nextAnniversary;
});

export const Memorial: Model<MemorialDocument> =
  mongoose.models.Memorial || mongoose.model<MemorialDocument>('Memorial', MemorialSchema);

export default Memorial;
