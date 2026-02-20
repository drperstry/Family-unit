import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

export interface InvitationDocument extends Document {
  familyId: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'member' | 'guest';
  token: string;
  invitedBy: Types.ObjectId;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId;
  message?: string;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<InvitationDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true,
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'guest'],
    default: 'member',
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  acceptedAt: Date,
  acceptedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  message: {
    type: String,
    maxlength: 500,
  },
  reminderSentAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
InvitationSchema.index({ familyId: 1, status: 1 });
InvitationSchema.index({ email: 1, familyId: 1 });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for checking if expired
InvitationSchema.virtual('isExpired').get(function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
});

// Static method to generate unique token
InvitationSchema.statics.generateToken = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to find valid invitation by token
InvitationSchema.statics.findValidByToken = async function(token: string) {
  const invitation = await this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).populate('familyId', 'name slug logo');

  return invitation;
};

// Pre-save hook to auto-expire
InvitationSchema.pre('save', function(next) {
  if (this.status === 'pending' && new Date() > this.expiresAt) {
    this.status = 'expired';
  }
  next();
});

export const Invitation: Model<InvitationDocument> & {
  generateToken(): string;
  findValidByToken(token: string): Promise<InvitationDocument | null>;
} = mongoose.models.Invitation || mongoose.model<InvitationDocument>('Invitation', InvitationSchema);

export default Invitation;
