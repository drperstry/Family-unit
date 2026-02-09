import mongoose, { Schema, Document, Model } from 'mongoose';
import { FamilyEvent, EntityType, ContentStatus, VisibilityStatus } from '@/types';

export interface EventDocument extends Omit<FamilyEvent, '_id'>, Document {}

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

const EventAttendeeSchema = new Schema({
  memberId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'maybe'],
    default: 'pending',
  },
  respondedAt: Date,
}, { _id: false });

const EventReminderSchema = new Schema({
  type: {
    type: String,
    enum: ['email', 'push'],
    required: true,
  },
  minutes: {
    type: Number,
    required: true,
  },
}, { _id: false });

const EventSchema = new Schema<EventDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
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
    default: EntityType.EVENT,
    immutable: true,
  },
  tags: [{ type: String, trim: true }],
  version: {
    type: Number,
    default: 1,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true,
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  isAllDay: {
    type: Boolean,
    default: false,
  },
  location: LocationInfoSchema,
  organizers: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
  }],
  attendees: [EventAttendeeSchema],
  linkedEntityId: {
    type: Schema.Types.ObjectId,
    ref: 'Entity',
  },
  linkedEntityType: {
    type: String,
    enum: Object.values(EntityType),
  },
  reminders: [EventReminderSchema],
  color: {
    type: String,
    default: '#3B82F6',
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
EventSchema.index({ familyId: 1, startDate: 1 });
EventSchema.index({ familyId: 1, startDate: 1, endDate: 1 });
EventSchema.index({ familyId: 1, status: 1, visibility: 1 });
EventSchema.index({ 'attendees.memberId': 1 });
EventSchema.index({ title: 'text', description: 'text' });

// Virtual for duration in minutes
EventSchema.virtual('durationMinutes').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  return Math.round((this.endDate.getTime() - this.startDate.getTime()) / 60000);
});

// Pre-save validation
EventSchema.pre('save', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Don't return deleted events by default
EventSchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

EventSchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const Event: Model<EventDocument> =
  mongoose.models.Event || mongoose.model<EventDocument>('Event', EventSchema);

export default Event;
