import mongoose, { Schema, Document as MongoDocument, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface FamilyDocumentDocument extends MongoDocument {
  familyId: Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  tags: string[];
  relatedMembers?: Types.ObjectId[];
  relatedEvents?: Types.ObjectId[];
  date?: Date; // Original document date
  documentType: 'certificate' | 'photo' | 'letter' | 'legal' | 'medical' | 'financial' | 'historical' | 'other';
  isImportant: boolean;
  expiresAt?: Date; // For documents that expire
  reminderDate?: Date;
  status: ContentStatus;
  visibility: VisibilityStatus;
  accessLog: Array<{
    userId: Types.ObjectId;
    accessedAt: Date;
    action: 'view' | 'download';
  }>;
  version: number;
  previousVersions?: Array<{
    fileUrl: string;
    uploadedAt: Date;
    uploadedBy: Types.ObjectId;
  }>;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccessLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  accessedAt: { type: Date, default: Date.now },
  action: { type: String, enum: ['view', 'download'], required: true },
}, { _id: false });

const PreviousVersionSchema = new Schema({
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: true });

const FamilyDocumentSchema = new Schema<FamilyDocumentDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  thumbnailUrl: String,
  tags: [{
    type: String,
    trim: true,
  }],
  relatedMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  }],
  relatedEvents: [{
    type: Schema.Types.ObjectId,
    ref: 'Event',
  }],
  date: Date,
  documentType: {
    type: String,
    enum: ['certificate', 'photo', 'letter', 'legal', 'medical', 'financial', 'historical', 'other'],
    default: 'other',
  },
  isImportant: {
    type: Boolean,
    default: false,
  },
  expiresAt: Date,
  reminderDate: Date,
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.APPROVED, // Documents are usually approved immediately
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.FAMILY,
  },
  accessLog: [AccessLogSchema],
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [PreviousVersionSchema],
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
FamilyDocumentSchema.index({ familyId: 1, category: 1 });
FamilyDocumentSchema.index({ familyId: 1, documentType: 1 });
FamilyDocumentSchema.index({ expiresAt: 1 }, { sparse: true });
FamilyDocumentSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for formatted file size
FamilyDocumentSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
});

// Virtual for is expired
FamilyDocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

export const FamilyDocument: Model<FamilyDocumentDocument> =
  mongoose.models.FamilyDocument || mongoose.model<FamilyDocumentDocument>('FamilyDocument', FamilyDocumentSchema);

export default FamilyDocument;
