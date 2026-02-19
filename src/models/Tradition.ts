import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface TraditionDocument extends Document {
  familyId: Types.ObjectId;
  title: string;
  description: string;
  category: 'holiday' | 'celebration' | 'ritual' | 'food' | 'gathering' | 'cultural' | 'religious' | 'seasonal' | 'other';
  origin?: string; // How/when this tradition started
  originDate?: Date;
  originMember?: Types.ObjectId; // Who started the tradition
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'occasional' | 'once';
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'any';
  month?: number; // 1-12, for yearly traditions
  dayOfMonth?: number;
  dayOfWeek?: number; // 0-6, for weekly traditions
  images: string[];
  videos: string[];
  participants?: string[]; // Who typically participates
  supplies?: string[]; // What's needed
  instructions?: string[]; // How to perform the tradition
  memories: Array<{
    content: string;
    author: Types.ObjectId;
    year?: number;
    images?: string[];
    createdAt: Date;
  }>;
  isActive: boolean; // Is this tradition still practiced?
  discontinuedAt?: Date;
  discontinuedReason?: string;
  status: ContentStatus;
  visibility: VisibilityStatus;
  likes: Types.ObjectId[];
  commentsCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema({
  content: { type: String, required: true, maxlength: 2000 },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  year: Number,
  images: [String],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const TraditionSchema = new Schema<TraditionDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Tradition title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 5000,
  },
  category: {
    type: String,
    enum: ['holiday', 'celebration', 'ritual', 'food', 'gathering', 'cultural', 'religious', 'seasonal', 'other'],
    required: true,
  },
  origin: {
    type: String,
    maxlength: 2000,
  },
  originDate: Date,
  originMember: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'occasional', 'once'],
    default: 'yearly',
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'any'],
  },
  month: {
    type: Number,
    min: 1,
    max: 12,
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
  },
  images: [String],
  videos: [String],
  participants: [String],
  supplies: [String],
  instructions: [String],
  memories: [MemorySchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  discontinuedAt: Date,
  discontinuedReason: String,
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PENDING,
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.FAMILY,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
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
TraditionSchema.index({ familyId: 1, category: 1 });
TraditionSchema.index({ familyId: 1, isActive: 1 });
TraditionSchema.index({ title: 'text', description: 'text' });

// Virtual for memory count
TraditionSchema.virtual('memoryCount').get(function() {
  return this.memories?.length || 0;
});

// Virtual for years practiced
TraditionSchema.virtual('yearsPracticed').get(function() {
  if (!this.originDate) return null;
  const endDate = this.discontinuedAt || new Date();
  return Math.floor((endDate.getTime() - this.originDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

export const Tradition: Model<TraditionDocument> =
  mongoose.models.Tradition || mongoose.model<TraditionDocument>('Tradition', TraditionSchema);

export default Tradition;
