import mongoose, { Schema, Document, Model } from 'mongoose';
import { Family as FamilyType, FamilyStatus, VisibilityStatus, EntityType, RequestType } from '@/types';

export interface FamilyDocument extends Omit<FamilyType, '_id'>, Document {}

const AddressSchema = new Schema({
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
}, { _id: false });

const SocialLinksSchema = new Schema({
  facebook: String,
  twitter: String,
  instagram: String,
  linkedin: String,
  website: String,
}, { _id: false });

const ContactDetailsSchema = new Schema({
  email: String,
  phone: String,
  address: AddressSchema,
}, { _id: false });

const CustomFieldSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'textarea', 'number', 'date', 'select', 'file'], required: true },
  required: { type: Boolean, default: false },
  options: [String],
}, { _id: false });

const RequestTypeConfigSchema = new Schema({
  type: { type: String, enum: Object.values(RequestType), required: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  fields: [CustomFieldSchema],
}, { _id: false });

const FamilySettingsSchema = new Schema({
  allowMemberInvites: { type: Boolean, default: true },
  requireApprovalForContent: { type: Boolean, default: true },
  enabledModules: [{
    type: String,
    enum: Object.values(EntityType),
  }],
  requestTypes: [RequestTypeConfigSchema],
  defaultContentVisibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.PRIVATE,
  },
  showFemalesInTree: { type: Boolean, default: false },
}, { _id: false });

const FamilyStatsSchema = new Schema({
  memberCount: { type: Number, default: 0 },
  contentCount: { type: Number, default: 0 },
  pendingApprovals: { type: Number, default: 0 },
}, { _id: false });

const FamilySchema = new Schema<FamilyDocument>({
  name: {
    type: String,
    required: [true, 'Family name is required'],
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  logo: String,
  banner: String,
  origin: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 2000,
  },
  motto: {
    type: String,
    maxlength: 200,
  },
  foundedYear: Number,
  contactDetails: {
    type: ContactDetailsSchema,
    default: () => ({}),
  },
  socialLinks: SocialLinksSchema,
  status: {
    type: String,
    enum: Object.values(FamilyStatus),
    default: FamilyStatus.PENDING,
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.PRIVATE,
    index: true,
  },
  settings: {
    type: FamilySettingsSchema,
    default: () => ({
      allowMemberInvites: true,
      requireApprovalForContent: true,
      enabledModules: Object.values(EntityType),
      requestTypes: [
        { type: RequestType.GENERAL, name: 'General Request', enabled: true, fields: [] },
        { type: RequestType.MEMBERSHIP, name: 'Membership Request', enabled: true, fields: [] },
        { type: RequestType.DOCUMENT, name: 'Document Request', enabled: true, fields: [] },
        { type: RequestType.SUPPORT, name: 'Support Request', enabled: true, fields: [] },
      ],
      defaultContentVisibility: VisibilityStatus.PRIVATE,
      showFemalesInTree: false,
    }),
  },
  stats: {
    type: FamilyStatsSchema,
    default: () => ({
      memberCount: 0,
      contentCount: 0,
      pendingApprovals: 0,
    }),
  },
  // Auditable fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
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
FamilySchema.index({ name: 'text', description: 'text', origin: 'text' });
FamilySchema.index({ status: 1, visibility: 1 });
FamilySchema.index({ createdAt: -1 });
FamilySchema.index({ 'stats.memberCount': -1 });

// Generate slug from name before validation
FamilySchema.pre('validate', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Ensure unique slug
FamilySchema.pre('save', async function(next) {
  if (this.isModified('slug')) {
    const existingFamily = await mongoose.models.Family.findOne({
      slug: this.slug,
      _id: { $ne: this._id },
    });
    if (existingFamily) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  next();
});

// Don't return deleted families by default
FamilySchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

FamilySchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const Family: Model<FamilyDocument> = mongoose.models.Family || mongoose.model<FamilyDocument>('Family', FamilySchema);

export default Family;
