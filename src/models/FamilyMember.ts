import mongoose, { Schema, Document, Model } from 'mongoose';
import { FamilyMember as FamilyMemberType, Gender, ContentStatus } from '@/types';

export interface FamilyMemberDocument extends Omit<FamilyMemberType, '_id'>, Document {}

const AddressSchema = new Schema({
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
}, { _id: false });

const ContactDetailsSchema = new Schema({
  email: String,
  phone: String,
  address: AddressSchema,
}, { _id: false });

const TreePositionSchema = new Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
}, { _id: false });

const FamilyMemberSchema = new Schema<FamilyMemberDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: 50,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  gender: {
    type: String,
    enum: Object.values(Gender),
    required: true,
    index: true,
  },
  dateOfBirth: Date,
  dateOfDeath: Date,
  isDeceased: {
    type: Boolean,
    default: false,
  },
  photo: String,
  bio: {
    type: String,
    maxlength: 2000,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true,
  },
  spouseId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true,
  },
  childrenIds: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  }],
  generation: {
    type: Number,
    default: 1,
    index: true,
  },
  lineage: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  }],
  position: {
    type: TreePositionSchema,
    default: () => ({ x: 0, y: 0, level: 0 }),
  },
  contactDetails: ContactDetailsSchema,
  achievements: [String],
  role: {
    type: String,
    enum: ['admin', 'member', 'guest'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PENDING,
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
FamilyMemberSchema.index({ familyId: 1, status: 1 });
FamilyMemberSchema.index({ familyId: 1, gender: 1 });
FamilyMemberSchema.index({ familyId: 1, generation: 1 });
FamilyMemberSchema.index({ parentId: 1, familyId: 1 });
FamilyMemberSchema.index({ firstName: 'text', lastName: 'text', bio: 'text' });

// Virtual for full name
FamilyMemberSchema.virtual('fullName').get(function() {
  return this.displayName || `${this.firstName} ${this.lastName}`;
});

// Virtual for age
FamilyMemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const endDate = this.dateOfDeath || new Date();
  const age = Math.floor(
    (endDate.getTime() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return age;
});

// Pre-save middleware to update lineage
FamilyMemberSchema.pre('save', async function(next) {
  if (this.isModified('parentId') && this.parentId) {
    const parent = await mongoose.models.FamilyMember.findById(this.parentId);
    if (parent) {
      this.lineage = [...(parent.lineage || []), parent._id];
      this.generation = parent.generation + 1;
    }
  }
  next();
});

// Don't return deleted members by default
FamilyMemberSchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

FamilyMemberSchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const FamilyMember: Model<FamilyMemberDocument> =
  mongoose.models.FamilyMember || mongoose.model<FamilyMemberDocument>('FamilyMember', FamilyMemberSchema);

export default FamilyMember;
