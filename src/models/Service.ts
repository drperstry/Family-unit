import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface ServiceDocument extends Document {
  familyId: Types.ObjectId;
  title: string;
  description: string;
  category: 'legal' | 'financial' | 'medical' | 'education' | 'housing' | 'employment' | 'social' | 'religious' | 'other';
  icon?: string;
  image?: string;

  // Contact Information
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;

  // Service Details
  availability: 'always' | 'business_hours' | 'appointment' | 'limited';
  isExternal: boolean;
  externalUrl?: string;
  price?: {
    type: 'free' | 'paid' | 'donation' | 'varies';
    amount?: number;
    currency?: string;
  };

  // Requirements
  requirements?: string[];
  eligibility?: string;

  // Provider
  providedBy?: Types.ObjectId; // User who provides the service
  providerName?: string;

  status: ContentStatus;
  visibility: VisibilityStatus;
  order: number;

  // Statistics
  views: number;
  requests: number;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<ServiceDocument>({
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
    required: [true, 'Description is required'],
    maxlength: 5000,
  },
  category: {
    type: String,
    enum: ['legal', 'financial', 'medical', 'education', 'housing', 'employment', 'social', 'religious', 'other'],
    required: true,
    index: true,
  },
  icon: String,
  image: String,
  contactName: {
    type: String,
    maxlength: 100,
  },
  contactEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  contactPhone: String,
  contactAddress: {
    type: String,
    maxlength: 500,
  },
  availability: {
    type: String,
    enum: ['always', 'business_hours', 'appointment', 'limited'],
    default: 'business_hours',
  },
  isExternal: {
    type: Boolean,
    default: false,
  },
  externalUrl: String,
  price: {
    type: {
      type: String,
      enum: ['free', 'paid', 'donation', 'varies'],
      default: 'free',
    },
    amount: Number,
    currency: {
      type: String,
      default: 'USD',
    },
  },
  requirements: [String],
  eligibility: {
    type: String,
    maxlength: 1000,
  },
  providedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  providerName: {
    type: String,
    maxlength: 100,
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
  order: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  requests: {
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
ServiceSchema.index({ familyId: 1, status: 1, visibility: 1 });
ServiceSchema.index({ familyId: 1, category: 1 });
ServiceSchema.index({ familyId: 1, order: 1 });
ServiceSchema.index({ title: 'text', description: 'text' });

// Virtual for formatted price
ServiceSchema.virtual('formattedPrice').get(function() {
  if (!this.price || this.price.type === 'free') return 'Free';
  if (this.price.type === 'donation') return 'Donation';
  if (this.price.type === 'varies') return 'Varies';
  if (this.price.amount) {
    return `${this.price.currency} ${this.price.amount.toFixed(2)}`;
  }
  return 'Contact for pricing';
});

// Increment view count
ServiceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Increment request count
ServiceSchema.methods.incrementRequests = function() {
  this.requests += 1;
  return this.save();
};

export const Service: Model<ServiceDocument> =
  mongoose.models.Service || mongoose.model<ServiceDocument>('Service', ServiceSchema);

export default Service;
