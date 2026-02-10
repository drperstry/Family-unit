import mongoose, { Schema, Document, Model } from 'mongoose';
import { FamilyTreeVersion as FamilyTreeVersionType } from '@/types';

export interface FamilyTreeVersionDocument extends Omit<FamilyTreeVersionType, '_id'>, Document {}

const TreePositionSchema = new Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
}, { _id: false });

const TreeNodeSchema = new Schema({
  id: { type: String, required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'FamilyMember', required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'FamilyMember' },
  spouseId: { type: Schema.Types.ObjectId, ref: 'FamilyMember' },
  childrenIds: [{ type: Schema.Types.ObjectId, ref: 'FamilyMember' }],
  position: TreePositionSchema,
}, { _id: false });

const TreeMetadataSchema = new Schema({
  totalMembers: { type: Number, default: 0 },
  totalGenerations: { type: Number, default: 0 },
  rootMemberId: { type: Schema.Types.ObjectId, ref: 'FamilyMember' },
  lastUpdated: { type: Date, default: Date.now },
}, { _id: false });

const FamilyTreeSnapshotSchema = new Schema({
  members: { type: Schema.Types.Mixed, default: [] },
  structure: [TreeNodeSchema],
  metadata: TreeMetadataSchema,
}, { _id: false });

const FamilyTreeVersionSchema = new Schema<FamilyTreeVersionDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  version: {
    type: Number,
    required: true,
    default: 1,
  },
  snapshot: {
    type: FamilyTreeSnapshotSchema,
    required: true,
  },
  changeDescription: {
    type: String,
    required: true,
    maxlength: 500,
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
FamilyTreeVersionSchema.index({ familyId: 1, version: -1 });
FamilyTreeVersionSchema.index({ familyId: 1, isActive: 1 });
FamilyTreeVersionSchema.index({ familyId: 1, createdAt: -1 });

// Pre-save middleware to auto-increment version
FamilyTreeVersionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastVersion = await mongoose.models.FamilyTreeVersion.findOne(
      { familyId: this.familyId },
      { version: 1 },
      { sort: { version: -1 } }
    );
    this.version = lastVersion ? lastVersion.version + 1 : 1;
  }
  next();
});

// Static method to get active version
FamilyTreeVersionSchema.statics.getActiveVersion = function(familyId: string) {
  return this.findOne({ familyId, isActive: true }).sort({ version: -1 });
};

// Static method to compare versions
FamilyTreeVersionSchema.statics.compareVersions = async function(
  familyId: string,
  version1: number,
  version2: number
) {
  const [v1, v2] = await Promise.all([
    this.findOne({ familyId, version: version1 }),
    this.findOne({ familyId, version: version2 }),
  ]);

  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }

  return {
    version1: v1,
    version2: v2,
    membersDiff: {
      added: v2.snapshot.members.filter(
        (m2: { _id: string }) => !v1.snapshot.members.some((m1: { _id: string }) => m1._id === m2._id)
      ),
      removed: v1.snapshot.members.filter(
        (m1: { _id: string }) => !v2.snapshot.members.some((m2: { _id: string }) => m2._id === m1._id)
      ),
      modified: v2.snapshot.members.filter((m2: { _id: string; updatedAt?: Date }) => {
        const m1 = v1.snapshot.members.find((m: { _id: string }) => m._id === m2._id);
        return m1 && JSON.stringify(m1) !== JSON.stringify(m2);
      }),
    },
  };
};

export const FamilyTreeVersion: Model<FamilyTreeVersionDocument> =
  mongoose.models.FamilyTreeVersion || mongoose.model<FamilyTreeVersionDocument>('FamilyTreeVersion', FamilyTreeVersionSchema);

export default FamilyTreeVersion;
