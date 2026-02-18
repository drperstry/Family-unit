import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User as UserType, UserRole, Gender } from '@/types';

export interface CustomPermission {
  permission: string;
  granted: boolean;
}

export interface UserDocument extends Omit<UserType, '_id'>, Document {
  securityRoleId?: Types.ObjectId;
  customPermissions?: CustomPermission[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

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
  youtube: String,
  tiktok: String,
  snapchat: String,
  whatsapp: String,
  telegram: String,
  pinterest: String,
  github: String,
  discord: String,
  website: String,
  other: [{
    platform: String,
    url: String,
  }],
}, { _id: false });

const NotificationPreferencesSchema = new Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  approvalAlerts: { type: Boolean, default: true },
  familyUpdates: { type: Boolean, default: true },
}, { _id: false });

const UserPreferencesSchema = new Schema({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  language: { type: String, default: 'en' },
  notifications: { type: NotificationPreferencesSchema, default: () => ({}) },
}, { _id: false });

const UserProfileSchema = new Schema({
  bio: String,
  phone: String,
  dateOfBirth: Date,
  gender: { type: String, enum: Object.values(Gender) },
  address: AddressSchema,
  socialLinks: SocialLinksSchema,
}, { _id: false });

const UserSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
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
  avatar: String,
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.GUEST,
    index: true,
  },
  // Security role for granular permissions (CRM-style RBAC)
  securityRoleId: {
    type: Schema.Types.ObjectId,
    ref: 'SecurityRole',
    index: true,
  },
  // Custom permission overrides (grants or denies specific permissions)
  customPermissions: [{
    permission: { type: String, required: true },
    granted: { type: Boolean, default: true },
  }],
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    index: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: Date,
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({}),
  },
  profile: {
    type: UserProfileSchema,
    default: () => ({}),
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
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
UserSchema.index({ email: 1, isDeleted: 1 });
UserSchema.index({ familyId: 1, role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

// Don't return deleted users by default
UserSchema.pre('find', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

UserSchema.pre('findOne', function() {
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
