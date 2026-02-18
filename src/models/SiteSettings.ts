import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface SiteSettingsDocument extends Document {
  familyId: Types.ObjectId;
  // General Settings
  siteName: string;
  siteDescription?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Content Settings
  aboutContent?: string;
  welcomeMessage?: string;
  footerText?: string;

  // Feature Toggles
  features: {
    familyTree: boolean;
    gallery: boolean;
    news: boolean;
    events: boolean;
    members: boolean;
    services: boolean;
    submissions: boolean;
    chat: boolean;
  };

  // Privacy Settings
  privacy: {
    isPublic: boolean;
    requireApproval: boolean;
    showMemberEmails: boolean;
    showMemberPhones: boolean;
    allowGuestViewing: boolean;
  };

  // Notification Settings
  notifications: {
    emailOnNewMember: boolean;
    emailOnNewSubmission: boolean;
    emailOnApproval: boolean;
    emailDigestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  };

  // Social Links
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;
  };

  // SEO Settings
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Custom Pages
  customPages?: Array<{
    slug: string;
    title: string;
    content: string;
    isPublished: boolean;
    order: number;
  }>;

  // Maintenance Mode
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedUsers?: Types.ObjectId[];
  };

  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomPageSchema = new Schema({
  slug: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: true });

const SiteSettingsSchema = new Schema<SiteSettingsDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    unique: true,
    index: true,
  },
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
    maxlength: 100,
  },
  siteDescription: {
    type: String,
    maxlength: 500,
  },
  logo: String,
  favicon: String,
  primaryColor: {
    type: String,
    default: '#f59e0b', // Amber-500
  },
  secondaryColor: {
    type: String,
    default: '#1f2937', // Gray-800
  },
  aboutContent: {
    type: String,
    maxlength: 10000,
  },
  welcomeMessage: {
    type: String,
    maxlength: 1000,
  },
  footerText: {
    type: String,
    maxlength: 500,
  },
  features: {
    familyTree: { type: Boolean, default: true },
    gallery: { type: Boolean, default: true },
    news: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    members: { type: Boolean, default: true },
    services: { type: Boolean, default: true },
    submissions: { type: Boolean, default: true },
    chat: { type: Boolean, default: false },
  },
  privacy: {
    isPublic: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    showMemberEmails: { type: Boolean, default: false },
    showMemberPhones: { type: Boolean, default: false },
    allowGuestViewing: { type: Boolean, default: false },
  },
  notifications: {
    emailOnNewMember: { type: Boolean, default: true },
    emailOnNewSubmission: { type: Boolean, default: true },
    emailOnApproval: { type: Boolean, default: true },
    emailDigestFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'never'],
      default: 'weekly',
    },
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String,
    linkedin: String,
    whatsapp: String,
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  customPages: [CustomPageSchema],
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: String,
    allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Static method to get or create settings for a family
SiteSettingsSchema.statics.getOrCreate = async function(familyId: string, familyName: string) {
  let settings = await this.findOne({ familyId });

  if (!settings) {
    settings = await this.create({
      familyId,
      siteName: familyName,
    });
  }

  return settings;
};

export const SiteSettings: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings || mongoose.model<SiteSettingsDocument>('SiteSettings', SiteSettingsSchema);

export default SiteSettings;
