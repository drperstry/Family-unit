import connectDB from './db';
import { SystemSettings, SystemSettingsDocument } from '@/models/SystemSettings';
import { SiteSettings, SiteSettingsDocument } from '@/models/SiteSettings';

// Cache for system settings
let systemSettingsCache: SystemSettingsDocument | null = null;
let systemSettingsCacheTime = 0;
const SYSTEM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for site settings (per family)
const siteSettingsCache = new Map<string, { settings: SiteSettingsDocument; time: number }>();
const SITE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get system-wide settings with caching
 */
export async function getSystemSettings(): Promise<SystemSettingsDocument> {
  const now = Date.now();

  // Return cached settings if still valid
  if (systemSettingsCache && now - systemSettingsCacheTime < SYSTEM_CACHE_TTL) {
    return systemSettingsCache;
  }

  await connectDB();

  let settings = await SystemSettings.findOne();

  if (!settings) {
    settings = await SystemSettings.create({});
  }

  systemSettingsCache = settings;
  systemSettingsCacheTime = now;

  return settings;
}

/**
 * Clear system settings cache (call after updates)
 */
export function clearSystemSettingsCache(): void {
  systemSettingsCache = null;
  systemSettingsCacheTime = 0;
}

/**
 * Get site settings for a specific family with caching
 */
export async function getSiteSettings(familyId: string): Promise<SiteSettingsDocument | null> {
  const now = Date.now();
  const cached = siteSettingsCache.get(familyId);

  // Return cached settings if still valid
  if (cached && now - cached.time < SITE_CACHE_TTL) {
    return cached.settings;
  }

  await connectDB();

  const settings = await SiteSettings.findOne({ familyId });

  if (settings) {
    siteSettingsCache.set(familyId, { settings, time: now });
  }

  return settings;
}

/**
 * Clear site settings cache for a specific family (call after updates)
 */
export function clearSiteSettingsCache(familyId?: string): void {
  if (familyId) {
    siteSettingsCache.delete(familyId);
  } else {
    siteSettingsCache.clear();
  }
}

// ============== Configuration Helpers ==============

/**
 * Upload configuration
 */
export async function getUploadConfig() {
  const settings = await getSystemSettings();
  return {
    maxFileSize: settings.uploads.maxFileSize,
    maxImageSize: settings.uploads.maxImageSize,
    maxVideoSize: settings.uploads.maxVideoSize,
    maxDocumentSize: settings.uploads.maxDocumentSize,
    allowedImageTypes: settings.uploads.allowedImageTypes,
    allowedVideoTypes: settings.uploads.allowedVideoTypes,
    allowedDocumentTypes: settings.uploads.allowedDocumentTypes,
    allowedAudioTypes: settings.uploads.allowedAudioTypes,
    get allAllowedTypes() {
      return [
        ...this.allowedImageTypes,
        ...this.allowedVideoTypes,
        ...this.allowedDocumentTypes,
        ...this.allowedAudioTypes,
      ];
    },
  };
}

/**
 * Rate limit configuration
 */
export async function getRateLimitConfig() {
  const settings = await getSystemSettings();
  return settings.rateLimits;
}

/**
 * Security configuration
 */
export async function getSecurityConfig() {
  const settings = await getSystemSettings();
  return settings.security;
}

/**
 * Token/session configuration
 */
export async function getTokenConfig() {
  const settings = await getSystemSettings();
  return settings.tokens;
}

/**
 * Pagination configuration
 */
export async function getPaginationConfig() {
  const settings = await getSystemSettings();
  return settings.pagination;
}

/**
 * Content limits configuration
 */
export async function getContentLimitsConfig() {
  const settings = await getSystemSettings();
  return settings.contentLimits;
}

/**
 * Email configuration
 */
export async function getEmailConfig() {
  const settings = await getSystemSettings();
  return settings.email;
}

/**
 * Check if system feature is enabled
 */
export async function isSystemFeatureEnabled(
  feature: 'allowNewRegistrations' | 'allowNewFamilies' | 'requireEmailVerification' | 'enableApiRateLimiting' | 'enableMaintenanceMode'
): Promise<boolean> {
  const settings = await getSystemSettings();
  return Boolean(settings.systemFeatures[feature]) ?? false;
}

/**
 * Check if registrations are allowed
 */
export async function canRegister(): Promise<boolean> {
  return isSystemFeatureEnabled('allowNewRegistrations');
}

/**
 * Check if new families can be created
 */
export async function canCreateFamily(): Promise<boolean> {
  return isSystemFeatureEnabled('allowNewFamilies');
}

/**
 * Check if system maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<{ enabled: boolean; message?: string }> {
  const settings = await getSystemSettings();
  return {
    enabled: settings.systemFeatures.enableMaintenanceMode,
    message: settings.systemFeatures.maintenanceMessage,
  };
}

// ============== Site Settings Helpers ==============

/**
 * Check if a family feature is enabled
 */
export async function isFamilyFeatureEnabled(
  familyId: string,
  feature: keyof SiteSettingsDocument['features']
): Promise<boolean> {
  const settings = await getSiteSettings(familyId);
  return settings?.features[feature] ?? true; // Default to true if no settings
}

/**
 * Get family display settings
 */
export async function getFamilyDisplaySettings(familyId: string) {
  const settings = await getSiteSettings(familyId);
  return settings?.display ?? {
    dateFormat: 'MMM d, yyyy',
    timeFormat: '12h',
    timezone: 'UTC',
    defaultLanguage: 'en',
    showMemberCount: true,
    showLastUpdated: true,
    membersPerPage: 20,
    eventsPerPage: 10,
    photosPerPage: 24,
    newsPerPage: 10,
  };
}

/**
 * Get family privacy settings
 */
export async function getFamilyPrivacySettings(familyId: string) {
  const settings = await getSiteSettings(familyId);
  return settings?.privacy ?? {
    isPublic: false,
    requireApproval: true,
    showMemberEmails: false,
    showMemberPhones: false,
    allowGuestViewing: false,
    showBirthDates: true,
    showDeathDates: true,
    showAddresses: false,
  };
}

/**
 * Get family content limits
 */
export async function getFamilyContentLimits(familyId: string) {
  const settings = await getSiteSettings(familyId);
  return settings?.contentLimits ?? {
    maxPhotosPerAlbum: 500,
    maxMembersPerFamily: 1000,
    maxEventsPerMonth: 100,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,
    maxRecipesPerMember: 100,
    maxDocumentsPerMember: 50,
  };
}

/**
 * Get family tree settings
 */
export async function getFamilyTreeSettings(familyId: string) {
  const settings = await getSiteSettings(familyId);
  return settings?.familyTreeSettings ?? {
    showPhotos: true,
    showBirthDates: true,
    showDeathDates: true,
    showMarriageDates: false,
    defaultView: 'vertical',
    maxGenerations: 10,
    colorScheme: 'default',
    maleColor: '#3b82f6',
    femaleColor: '#ec4899',
  };
}

/**
 * Get family invite settings
 */
export async function getFamilyInviteSettings(familyId: string) {
  const settings = await getSiteSettings(familyId);
  return settings?.inviteSettings ?? {
    allowMemberInvites: true,
    requireAdminApproval: true,
    inviteLinkExpiryDays: 7,
    maxInvitesPerMember: 10,
  };
}

// ============== Default Values (for use when DB is not available) ==============

export const DEFAULT_SYSTEM_CONFIG = {
  uploads: {
    maxFileSize: 10 * 1024 * 1024,
    maxImageSize: 5 * 1024 * 1024,
    maxVideoSize: 100 * 1024 * 1024,
    maxDocumentSize: 20 * 1024 * 1024,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  },
  rateLimits: {
    login: { maxAttempts: 10, windowMs: 60 * 1000 },
    register: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },
    api: { maxRequests: 100, windowMs: 60 * 1000 },
    upload: { maxRequests: 20, windowMs: 60 * 1000 },
  },
  security: {
    loginLockout: {
      maxAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000,
      attemptWindowMs: 60 * 60 * 1000,
    },
    passwordRequirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    bcryptRounds: 12,
  },
  tokens: {
    jwtExpiresIn: '7d',
    refreshTokenExpiresIn: '30d',
    inviteLinkExpiryDays: 90,
    passwordResetExpiryHours: 24,
    emailVerificationExpiryHours: 48,
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultAuditLogLimit: 50,
  },
  contentLimits: {
    maxTitleLength: 200,
    maxDescriptionLength: 5000,
    maxBioLength: 2000,
    maxCommentLength: 2000,
    maxTagsPerItem: 20,
    maxPhotosPerAlbum: 500,
  },
};
