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
  accentColor?: string;
  fontFamily?: string;

  // Hero Section (Landing Page)
  hero: {
    title?: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
    backgroundVideo?: string; // YouTube video URL or direct video URL
    showVideo: boolean;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
  };

  // About Section
  about: {
    title?: string;
    description?: string;
    image?: string;
    features: Array<{
      icon?: string;
      title: string;
      description: string;
    }>;
  };

  // Achievements/Stats Section
  achievements: Array<{
    icon?: string;
    value: number;
    label: string;
    suffix?: string; // e.g., "+", "%"
  }>;

  // Services/Offerings Section
  services: Array<{
    icon?: string;
    title: string;
    description: string;
    color?: string;
    link?: string;
  }>;

  // Board Members/Leadership Section
  boardMembers: Array<{
    name: string;
    position: string;
    image?: string;
    bio?: string;
    order: number;
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      email?: string;
    };
  }>;

  // Media/Videos Section
  media: {
    featuredVideos: Array<{
      title: string;
      description?: string;
      youtubeUrl?: string;
      thumbnailUrl?: string;
      order: number;
    }>;
    youtubeChannelUrl?: string;
    showYoutubeSection: boolean;
  };

  // Content Settings
  aboutContent?: string;
  welcomeMessage?: string;
  footerText?: string;
  copyrightText?: string;

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
    recipes: boolean;
    documents: boolean;
    traditions: boolean;
    polls: boolean;
    memorial: boolean;
    announcements: boolean;
  };

  // Privacy Settings
  privacy: {
    isPublic: boolean;
    requireApproval: boolean;
    showMemberEmails: boolean;
    showMemberPhones: boolean;
    allowGuestViewing: boolean;
    showBirthDates: boolean;
    showDeathDates: boolean;
    showAddresses: boolean;
  };

  // Notification Settings
  notifications: {
    emailOnNewMember: boolean;
    emailOnNewSubmission: boolean;
    emailOnApproval: boolean;
    emailOnNewContent: boolean;
    emailOnMention: boolean;
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
    tiktok?: string;
    pinterest?: string;
  };

  // SEO Settings
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };

  // Content Limits (per-family overrides)
  contentLimits: {
    maxPhotosPerAlbum: number;
    maxMembersPerFamily: number;
    maxEventsPerMonth: number;
    maxStorageBytes: number;
    maxRecipesPerMember: number;
    maxDocumentsPerMember: number;
  };

  // Display Settings
  display: {
    dateFormat: string;
    timeFormat: '12h' | '24h';
    timezone: string;
    defaultLanguage: string;
    showMemberCount: boolean;
    showLastUpdated: boolean;
    membersPerPage: number;
    eventsPerPage: number;
    photosPerPage: number;
    newsPerPage: number;
  };

  // Family Tree Settings
  familyTreeSettings: {
    showPhotos: boolean;
    showBirthDates: boolean;
    showDeathDates: boolean;
    showMarriageDates: boolean;
    defaultView: 'horizontal' | 'vertical' | 'radial';
    maxGenerations: number;
    colorScheme: 'default' | 'gender' | 'generation' | 'custom';
    maleColor?: string;
    femaleColor?: string;
  };

  // Invite Settings
  inviteSettings: {
    allowMemberInvites: boolean;
    requireAdminApproval: boolean;
    inviteLinkExpiryDays: number;
    maxInvitesPerMember: number;
    welcomeEmailTemplate?: string;
  };

  // Custom Pages
  customPages?: Array<{
    slug: string;
    title: string;
    content: string;
    isPublished: boolean;
    order: number;
    showInNav: boolean;
    icon?: string;
  }>;

  // Navigation Settings
  navigation: {
    showHome: boolean;
    showAbout: boolean;
    showContact: boolean;
    menuItems: Array<{
      label: string;
      href: string;
      icon?: string;
      order: number;
      requiresAuth: boolean;
    }>;
  };

  // Contact Settings
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    showContactForm: boolean;
    contactFormRecipients: string[];
  };

  // Maintenance Mode
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedUsers?: Types.ObjectId[];
    scheduledEnd?: Date;
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
  showInNav: { type: Boolean, default: true },
  icon: String,
}, { _id: true });

const MenuItemSchema = new Schema({
  label: { type: String, required: true },
  href: { type: String, required: true },
  icon: String,
  order: { type: Number, default: 0 },
  requiresAuth: { type: Boolean, default: false },
}, { _id: false });

const AboutFeatureSchema = new Schema({
  icon: String,
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: true });

const AchievementSchema = new Schema({
  icon: String,
  value: { type: Number, required: true },
  label: { type: String, required: true },
  suffix: String,
}, { _id: true });

const ServiceSchema = new Schema({
  icon: String,
  title: { type: String, required: true },
  description: { type: String, required: true },
  color: String,
  link: String,
}, { _id: true });

const BoardMemberSchema = new Schema({
  name: { type: String, required: true },
  position: { type: String, required: true },
  image: String,
  bio: String,
  order: { type: Number, default: 0 },
  socialLinks: {
    linkedin: String,
    twitter: String,
    email: String,
  },
}, { _id: true });

const FeaturedVideoSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  youtubeUrl: String,
  thumbnailUrl: String,
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
  accentColor: {
    type: String,
    default: '#3b82f6', // Blue-500
  },
  fontFamily: {
    type: String,
    default: 'Inter',
  },
  hero: {
    title: String,
    subtitle: String,
    description: String,
    backgroundImage: String,
    backgroundVideo: String,
    showVideo: { type: Boolean, default: false },
    ctaText: String,
    ctaLink: String,
    secondaryCtaText: String,
    secondaryCtaLink: String,
  },
  about: {
    title: String,
    description: String,
    image: String,
    features: [AboutFeatureSchema],
  },
  achievements: [AchievementSchema],
  services: [ServiceSchema],
  boardMembers: [BoardMemberSchema],
  media: {
    featuredVideos: [FeaturedVideoSchema],
    youtubeChannelUrl: String,
    showYoutubeSection: { type: Boolean, default: false },
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
  copyrightText: {
    type: String,
    maxlength: 200,
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
    recipes: { type: Boolean, default: true },
    documents: { type: Boolean, default: true },
    traditions: { type: Boolean, default: true },
    polls: { type: Boolean, default: true },
    memorial: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
  },
  privacy: {
    isPublic: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    showMemberEmails: { type: Boolean, default: false },
    showMemberPhones: { type: Boolean, default: false },
    allowGuestViewing: { type: Boolean, default: false },
    showBirthDates: { type: Boolean, default: true },
    showDeathDates: { type: Boolean, default: true },
    showAddresses: { type: Boolean, default: false },
  },
  notifications: {
    emailOnNewMember: { type: Boolean, default: true },
    emailOnNewSubmission: { type: Boolean, default: true },
    emailOnApproval: { type: Boolean, default: true },
    emailOnNewContent: { type: Boolean, default: true },
    emailOnMention: { type: Boolean, default: true },
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
    tiktok: String,
    pinterest: String,
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    ogImage: String,
  },
  contentLimits: {
    maxPhotosPerAlbum: { type: Number, default: 500 },
    maxMembersPerFamily: { type: Number, default: 1000 },
    maxEventsPerMonth: { type: Number, default: 100 },
    maxStorageBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB
    maxRecipesPerMember: { type: Number, default: 100 },
    maxDocumentsPerMember: { type: Number, default: 50 },
  },
  display: {
    dateFormat: { type: String, default: 'MMM d, yyyy' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
    timezone: { type: String, default: 'UTC' },
    defaultLanguage: { type: String, default: 'en' },
    showMemberCount: { type: Boolean, default: true },
    showLastUpdated: { type: Boolean, default: true },
    membersPerPage: { type: Number, default: 20 },
    eventsPerPage: { type: Number, default: 10 },
    photosPerPage: { type: Number, default: 24 },
    newsPerPage: { type: Number, default: 10 },
  },
  familyTreeSettings: {
    showPhotos: { type: Boolean, default: true },
    showBirthDates: { type: Boolean, default: true },
    showDeathDates: { type: Boolean, default: true },
    showMarriageDates: { type: Boolean, default: false },
    defaultView: { type: String, enum: ['horizontal', 'vertical', 'radial'], default: 'vertical' },
    maxGenerations: { type: Number, default: 10 },
    colorScheme: { type: String, enum: ['default', 'gender', 'generation', 'custom'], default: 'default' },
    maleColor: { type: String, default: '#3b82f6' },
    femaleColor: { type: String, default: '#ec4899' },
  },
  inviteSettings: {
    allowMemberInvites: { type: Boolean, default: true },
    requireAdminApproval: { type: Boolean, default: true },
    inviteLinkExpiryDays: { type: Number, default: 7 },
    maxInvitesPerMember: { type: Number, default: 10 },
    welcomeEmailTemplate: String,
  },
  customPages: [CustomPageSchema],
  navigation: {
    showHome: { type: Boolean, default: true },
    showAbout: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true },
    menuItems: [MenuItemSchema],
  },
  contact: {
    email: String,
    phone: String,
    address: String,
    showContactForm: { type: Boolean, default: true },
    contactFormRecipients: [String],
  },
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: String,
    allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    scheduledEnd: Date,
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
