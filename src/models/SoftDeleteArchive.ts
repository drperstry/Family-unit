import mongoose, { Schema, Document, Model } from 'mongoose';
import { SoftDeleteArchive as SoftDeleteArchiveType } from '@/types';

export interface SoftDeleteArchiveDocument extends Omit<SoftDeleteArchiveType, '_id'>, Document {}

const SoftDeleteArchiveSchema = new Schema<SoftDeleteArchiveDocument>({
  originalCollection: {
    type: String,
    required: [true, 'Original collection name is required'],
    index: true,
  },
  originalId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Original document ID is required'],
    index: true,
  },
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    index: true,
  },
  data: {
    type: Schema.Types.Mixed,
    required: [true, 'Document data is required'],
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Deleter ID is required'],
    index: true,
  },
  reason: {
    type: String,
    maxlength: 500,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
SoftDeleteArchiveSchema.index({ originalCollection: 1, originalId: 1 });
SoftDeleteArchiveSchema.index({ familyId: 1, createdAt: -1 });
SoftDeleteArchiveSchema.index({ deletedBy: 1, createdAt: -1 });
SoftDeleteArchiveSchema.index({ createdAt: -1 });

// TTL index - auto-delete archived items after expiration
SoftDeleteArchiveSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to archive a document
SoftDeleteArchiveSchema.statics.archiveDocument = async function(
  collection: string,
  document: Document,
  deletedBy: string,
  reason?: string,
  retentionDays: number = 90
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);

  return this.create({
    originalCollection: collection,
    originalId: document._id,
    familyId: document.get('familyId'),
    data: document.toObject(),
    deletedBy,
    reason,
    expiresAt,
  });
};

// Static method to restore a document
SoftDeleteArchiveSchema.statics.restoreDocument = async function(
  archiveId: string
) {
  const archive = await this.findById(archiveId);
  if (!archive) {
    throw new Error('Archived document not found');
  }

  const Model = mongoose.model(archive.originalCollection);
  const restoredDoc = new Model(archive.data);
  restoredDoc.isDeleted = false;
  restoredDoc.deletedAt = undefined;
  restoredDoc.deletedBy = undefined;

  await restoredDoc.save();
  await this.findByIdAndDelete(archiveId);

  return restoredDoc;
};

// Static method to get archived items for a family
SoftDeleteArchiveSchema.statics.getArchivedItems = function(
  familyId: string,
  options?: {
    collection?: string;
    limit?: number;
    skip?: number;
  }
) {
  const query = this.find({ familyId });

  if (options?.collection) {
    query.where('originalCollection', options.collection);
  }

  query.sort({ createdAt: -1 });

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.skip) {
    query.skip(options.skip);
  }

  return query.populate('deletedBy', 'firstName lastName email');
};

// Static method to permanently delete expired archives
SoftDeleteArchiveSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({
    expiresAt: { $lte: new Date() },
  });
};

export const SoftDeleteArchive: Model<SoftDeleteArchiveDocument> =
  mongoose.models.SoftDeleteArchive || mongoose.model<SoftDeleteArchiveDocument>('SoftDeleteArchive', SoftDeleteArchiveSchema);

export default SoftDeleteArchive;
