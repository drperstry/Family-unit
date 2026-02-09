import mongoose, { Schema, Document, Model } from 'mongoose';
import { Media as MediaType, EntityType } from '@/types';

export interface MediaDocument extends Omit<MediaType, '_id'>, Document {}

const MediaSchema = new Schema<MediaDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  entityType: {
    type: String,
    enum: Object.values(EntityType),
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
  },
  thumbnailUrl: String,
  blobPath: {
    type: String,
    required: [true, 'Blob path is required'],
  },
  originalFileName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true,
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
  },
  metadata: Schema.Types.Mixed,

  // Auditable fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  // Soft delete fields
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
MediaSchema.index({ familyId: 1, entityId: 1 });
MediaSchema.index({ familyId: 1, mimeType: 1 });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ originalFileName: 'text' });

// Virtual to determine media type
MediaSchema.virtual('type').get(function() {
  if (!this.mimeType) return 'other';
  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType.includes('pdf') || this.mimeType.includes('document')) return 'document';
  return 'other';
});

// Virtual to format file size
MediaSchema.virtual('formattedSize').get(function() {
  if (!this.size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Don't return deleted media by default
MediaSchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

MediaSchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const Media: Model<MediaDocument> =
  mongoose.models.Media || mongoose.model<MediaDocument>('Media', MediaSchema);

export default Media;
