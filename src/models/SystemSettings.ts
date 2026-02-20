import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface SystemSettingsDocument extends Document {
  // Upload Settings
  uploads: {
    maxFileSize: number; // in bytes
    maxImageSize: number;
    maxVideoSize: number;
    maxDocumentSize: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    allowedDocumentTypes: string[];
    allowedAudioTypes: string[];
  };

  // Rate Limiting
  rateLimits: {
    login: {
      maxAttempts: number;
      windowMs: number;
    };
    register: {
      maxAttempts: number;
      windowMs: number;
    };
    api: {
      maxRequests: number;
      windowMs: number;
    };
    upload: {
      maxRequests: number;
      windowMs: number;
    };
  };

  // Security Settings
  security: {
    loginLockout: {
      maxAttempts: number;
      lockoutDurationMs: number;
      attemptWindowMs: number;
    };
    passwordRequirements: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    bcryptRounds: number;
  };

  // Session/Token Settings
  tokens: {
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
    inviteLinkExpiryDays: number;
    passwordResetExpiryHours: number;
    emailVerificationExpiryHours: number;
  };

  // Pagination Settings
  pagination: {
    defaultLimit: number;
    maxLimit: number;
    defaultAuditLogLimit: number;
  };

  // Database Settings
  database: {
    maxPoolSize: number;
    minPoolSize: number;
    serverSelectionTimeoutMs: number;
    socketTimeoutMs: number;
    connectTimeoutMs: number;
    heartbeatFrequencyMs: number;
  };

  // Cleanup/Retention Settings
  retention: {
    auditLogDays: number;
    softDeleteDays: number;
    sessionCleanupIntervalMs: number;
    rateLimitCleanupIntervalMs: number;
  };

  // Email Settings
  email: {
    fromName: string;
    fromAddress: string;
    replyToAddress?: string;
    maxRecipientsPerEmail: number;
    rateLimitPerHour: number;
  };

  // Content Limits
  contentLimits: {
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxBioLength: number;
    maxCommentLength: number;
    maxTagsPerItem: number;
    maxPhotosPerAlbum: number;
  };

  // Feature Flags (System-wide)
  systemFeatures: {
    allowNewRegistrations: boolean;
    allowNewFamilies: boolean;
    requireEmailVerification: boolean;
    enableApiRateLimiting: boolean;
    enableMaintenanceMode: boolean;
    maintenanceMessage?: string;
  };

  // CORS Settings
  cors: {
    allowedOrigins: string[];
    maxAge: number;
  };

  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<SystemSettingsDocument>({
  uploads: {
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB
    maxImageSize: { type: Number, default: 5 * 1024 * 1024 }, // 5MB
    maxVideoSize: { type: Number, default: 100 * 1024 * 1024 }, // 100MB
    maxDocumentSize: { type: Number, default: 20 * 1024 * 1024 }, // 20MB
    allowedImageTypes: {
      type: [String],
      default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    },
    allowedVideoTypes: {
      type: [String],
      default: ['video/mp4', 'video/webm', 'video/quicktime'],
    },
    allowedDocumentTypes: {
      type: [String],
      default: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
    allowedAudioTypes: {
      type: [String],
      default: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    },
  },

  rateLimits: {
    login: {
      maxAttempts: { type: Number, default: 10 },
      windowMs: { type: Number, default: 60 * 1000 }, // 1 minute
    },
    register: {
      maxAttempts: { type: Number, default: 5 },
      windowMs: { type: Number, default: 60 * 60 * 1000 }, // 1 hour
    },
    api: {
      maxRequests: { type: Number, default: 100 },
      windowMs: { type: Number, default: 60 * 1000 }, // 1 minute
    },
    upload: {
      maxRequests: { type: Number, default: 20 },
      windowMs: { type: Number, default: 60 * 1000 }, // 1 minute
    },
  },

  security: {
    loginLockout: {
      maxAttempts: { type: Number, default: 5 },
      lockoutDurationMs: { type: Number, default: 15 * 60 * 1000 }, // 15 minutes
      attemptWindowMs: { type: Number, default: 60 * 60 * 1000 }, // 1 hour
    },
    passwordRequirements: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false },
    },
    bcryptRounds: { type: Number, default: 12 },
  },

  tokens: {
    jwtExpiresIn: { type: String, default: '7d' },
    refreshTokenExpiresIn: { type: String, default: '30d' },
    inviteLinkExpiryDays: { type: Number, default: 90 },
    passwordResetExpiryHours: { type: Number, default: 24 },
    emailVerificationExpiryHours: { type: Number, default: 48 },
  },

  pagination: {
    defaultLimit: { type: Number, default: 20 },
    maxLimit: { type: Number, default: 100 },
    defaultAuditLogLimit: { type: Number, default: 50 },
  },

  database: {
    maxPoolSize: { type: Number, default: 10 },
    minPoolSize: { type: Number, default: 1 },
    serverSelectionTimeoutMs: { type: Number, default: 10000 },
    socketTimeoutMs: { type: Number, default: 45000 },
    connectTimeoutMs: { type: Number, default: 10000 },
    heartbeatFrequencyMs: { type: Number, default: 10000 },
  },

  retention: {
    auditLogDays: { type: Number, default: 90 },
    softDeleteDays: { type: Number, default: 30 },
    sessionCleanupIntervalMs: { type: Number, default: 60 * 60 * 1000 }, // 1 hour
    rateLimitCleanupIntervalMs: { type: Number, default: 5 * 60 * 1000 }, // 5 minutes
  },

  email: {
    fromName: { type: String, default: 'Family Site' },
    fromAddress: { type: String, default: 'noreply@familysite.com' },
    replyToAddress: String,
    maxRecipientsPerEmail: { type: Number, default: 50 },
    rateLimitPerHour: { type: Number, default: 100 },
  },

  contentLimits: {
    maxTitleLength: { type: Number, default: 200 },
    maxDescriptionLength: { type: Number, default: 5000 },
    maxBioLength: { type: Number, default: 2000 },
    maxCommentLength: { type: Number, default: 2000 },
    maxTagsPerItem: { type: Number, default: 20 },
    maxPhotosPerAlbum: { type: Number, default: 500 },
  },

  systemFeatures: {
    allowNewRegistrations: { type: Boolean, default: true },
    allowNewFamilies: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false },
    enableApiRateLimiting: { type: Boolean, default: true },
    enableMaintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: String,
  },

  cors: {
    allowedOrigins: { type: [String], default: ['*'] },
    maxAge: { type: Number, default: 86400 }, // 24 hours
  },

  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Singleton pattern - only one system settings document
SystemSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

// Helper to get a specific setting with default fallback
SystemSettingsSchema.statics.getSetting = async function<T>(path: string, defaultValue: T): Promise<T> {
  const settings = await this.getInstance();
  const parts = path.split('.');
  let value: unknown = settings;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return defaultValue;
    }
  }

  return (value as T) ?? defaultValue;
};

export const SystemSettings: Model<SystemSettingsDocument> =
  mongoose.models.SystemSettings || mongoose.model<SystemSettingsDocument>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
