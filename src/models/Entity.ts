import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  BaseEntity,
  EntityType,
  ContentStatus,
  VisibilityStatus,
  RequestType
} from '@/types';

export interface EntityDocument extends Omit<BaseEntity, '_id'>, Document {}

const AddressSchema = new Schema({
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
}, { _id: false });

const CoordinatesSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const LocationInfoSchema = new Schema({
  name: String,
  address: AddressSchema,
  coordinates: CoordinatesSchema,
  placeId: String,
}, { _id: false });

const MediaReferenceSchema = new Schema({
  id: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: String,
  type: { type: String, enum: ['image', 'video', 'document', 'audio'], required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
}, { _id: false });

const ProcedureStepSchema = new Schema({
  order: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  isRequired: { type: Boolean, default: true },
}, { _id: false });

const EntitySchema = new Schema<EntityDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 5000,
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
    default: VisibilityStatus.PRIVATE,
    index: true,
  },
  entityType: {
    type: String,
    enum: Object.values(EntityType),
    required: true,
    index: true,
  },
  tags: [{ type: String, trim: true }],
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [{ type: Schema.Types.ObjectId, ref: 'Entity' }],

  // Activity specific fields
  startDate: Date,
  endDate: Date,
  isRecurring: Boolean,
  recurrenceRule: String,

  // Ceremony specific fields
  ceremonyType: String,
  traditions: [String],

  // Request specific fields
  requestType: {
    type: String,
    enum: Object.values(RequestType),
  },
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  assigneeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
  },
  dueDate: Date,
  customFields: Schema.Types.Mixed,
  resolution: String,
  resolvedAt: Date,

  // Photo specific fields
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Entity',
  },
  url: String,
  thumbnailUrl: String,
  originalFileName: String,
  mimeType: String,
  size: Number,
  dimensions: {
    width: Number,
    height: Number,
  },
  takenAt: Date,
  taggedMembers: [{ type: Schema.Types.ObjectId, ref: 'FamilyMember' }],

  // Photo folder specific fields
  parentFolderId: {
    type: Schema.Types.ObjectId,
    ref: 'Entity',
  },
  coverPhotoId: {
    type: Schema.Types.ObjectId,
    ref: 'Entity',
  },
  photoCount: {
    type: Number,
    default: 0,
  },

  // News specific fields
  content: String,
  coverImage: String,
  publishedAt: Date,
  isPinned: {
    type: Boolean,
    default: false,
  },
  viewCount: {
    type: Number,
    default: 0,
  },

  // About Me specific fields
  memberId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  },
  highlights: [String],

  // Achievement specific fields
  achievementType: String,
  date: Date,
  recognition: String,

  // Offer specific fields
  offerType: {
    type: String,
    enum: ['service', 'product', 'skill', 'other'],
  },
  offeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  },
  expiresAt: Date,
  terms: String,

  // Location specific fields
  location: LocationInfoSchema,
  locationType: {
    type: String,
    enum: ['home', 'business', 'landmark', 'historical', 'other'],
  },
  isHeadquarters: Boolean,

  // Procedure specific fields
  procedureType: String,
  steps: [ProcedureStepSchema],
  applicableTo: [String],

  // Common fields
  participants: [{ type: Schema.Types.ObjectId, ref: 'FamilyMember' }],
  media: [MediaReferenceSchema],
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
  discriminatorKey: 'entityType',
});

// Indexes
EntitySchema.index({ familyId: 1, entityType: 1, status: 1 });
EntitySchema.index({ familyId: 1, entityType: 1, visibility: 1 });
EntitySchema.index({ familyId: 1, createdAt: -1 });
EntitySchema.index({ familyId: 1, entityType: 1, createdAt: -1 });
EntitySchema.index({ title: 'text', description: 'text', content: 'text' });
EntitySchema.index({ startDate: 1 });
EntitySchema.index({ tags: 1 });
EntitySchema.index({ folderId: 1 });
EntitySchema.index({ memberId: 1 });

// Don't return deleted entities by default
EntitySchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

EntitySchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

// Increment version on update
EntitySchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    this.version = (this.version || 1) + 1;
  }
  next();
});

export const Entity: Model<EntityDocument> =
  mongoose.models.Entity || mongoose.model<EntityDocument>('Entity', EntitySchema);

export default Entity;
