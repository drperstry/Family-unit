/**
 * Security utilities for input validation and sanitization
 * Prevents NoSQL injection, prototype pollution, and other attacks
 */

// Allowed sort fields for each entity type to prevent NoSQL injection
const ALLOWED_SORT_FIELDS: Record<string, string[]> = {
  default: ['createdAt', 'updatedAt', '_id'],
  user: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'role', 'lastLoginAt'],
  member: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'birthDate', 'deathDate'],
  family: ['createdAt', 'updatedAt', 'name', 'status'],
  news: ['createdAt', 'updatedAt', 'title', 'publishDate', 'status'],
  event: ['createdAt', 'updatedAt', 'title', 'startDate', 'endDate', 'status'],
  gallery: ['createdAt', 'updatedAt', 'title', 'uploadDate'],
  service: ['createdAt', 'updatedAt', 'title', 'order', 'isActive'],
  submission: ['createdAt', 'updatedAt', 'status', 'type'],
  approval: ['createdAt', 'updatedAt', 'status', 'requestedAt', 'reviewedAt'],
  securityRole: ['createdAt', 'updatedAt', 'name'],
};

/**
 * Validates and sanitizes a sort field to prevent NoSQL injection
 * @param sortBy - The sort field from user input
 * @param entityType - The entity type to validate against
 * @returns A safe sort field or the default 'createdAt'
 */
export function sanitizeSortField(sortBy: string, entityType: string = 'default'): string {
  const allowedFields = ALLOWED_SORT_FIELDS[entityType] || ALLOWED_SORT_FIELDS.default;

  // Check if the sortBy is in the allowed list
  if (allowedFields.includes(sortBy)) {
    return sortBy;
  }

  // Check if it's a valid nested field (e.g., 'profile.phone')
  // Only allow alphanumeric and dots, max 50 chars
  if (/^[a-zA-Z][a-zA-Z0-9.]{0,49}$/.test(sortBy) && !sortBy.includes('..')) {
    // Validate each segment
    const segments = sortBy.split('.');
    if (segments.length <= 3 && segments.every(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s))) {
      return sortBy;
    }
  }

  return 'createdAt'; // Safe default
}

/**
 * Sanitizes an object to prevent prototype pollution
 * Removes __proto__, constructor, and prototype keys
 * @param obj - The object to sanitize
 * @returns A sanitized copy of the object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    // Skip dangerous keys
    if (dangerousKeys.includes(key)) {
      continue;
    }

    const value = obj[key];

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        item !== null && typeof item === 'object'
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validates a filter object for MongoDB queries
 * Prevents NoSQL injection by checking for operator keys
 * @param filter - The filter object from user input
 * @param allowedFields - List of allowed field names
 * @returns A sanitized filter object or null if invalid
 */
export function sanitizeMongoFilter(
  filter: Record<string, unknown>,
  allowedFields: string[]
): Record<string, unknown> | null {
  if (!filter || typeof filter !== 'object') {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  const dangerousOperators = ['$where', '$regex', '$expr', '$function', '$accumulator'];

  for (const key of Object.keys(filter)) {
    // Only allow whitelisted fields
    if (!allowedFields.includes(key)) {
      continue;
    }

    const value = filter[key];

    // Check for dangerous operators in value
    if (value !== null && typeof value === 'object') {
      const valueObj = value as Record<string, unknown>;
      const hasUnsafeOperator = Object.keys(valueObj).some(k =>
        dangerousOperators.includes(k)
      );
      if (hasUnsafeOperator) {
        continue; // Skip this field
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Validates that a string value doesn't contain NoSQL injection patterns
 * @param value - The string value to validate
 * @returns true if safe, false if potentially malicious
 */
export function isSafeStringValue(value: string): boolean {
  // Check for MongoDB operator patterns
  if (value.startsWith('$') || value.includes('$where')) {
    return false;
  }

  // Check for common NoSQL injection patterns
  const dangerousPatterns = [
    /\$gt/i,
    /\$lt/i,
    /\$ne/i,
    /\$in/i,
    /\$or/i,
    /\$and/i,
    /\$not/i,
    /\$regex/i,
    /\$where/i,
    /\{\s*['"]\$/, // JSON with operators
  ];

  return !dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitizes a string value for use in MongoDB queries
 * @param value - The string value to sanitize
 * @returns A sanitized string or null if invalid
 */
export function sanitizeStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!isSafeStringValue(value)) {
    return null;
  }

  // Remove any control characters
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Validates and sanitizes an array of ObjectIds
 * @param ids - Array of potential ObjectIds
 * @returns Array of valid ObjectId strings
 */
export function sanitizeObjectIdArray(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return ids.filter((id): id is string =>
    typeof id === 'string' && objectIdRegex.test(id)
  );
}

/**
 * Rate limiting storage (in-memory, for production use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter
 * @param key - Unique identifier (e.g., IP + endpoint)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Login attempt tracking for brute force protection
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

// Default values (can be overridden by system settings)
// These are used when config is not available
export const DEFAULT_LOGIN_SECURITY = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  attemptWindowMs: 60 * 60 * 1000, // 1 hour
};

// Configurable values (set from system settings)
let loginSecurityConfig = { ...DEFAULT_LOGIN_SECURITY };

/**
 * Update login security configuration from system settings
 */
export function setLoginSecurityConfig(config: Partial<typeof DEFAULT_LOGIN_SECURITY>): void {
  loginSecurityConfig = { ...DEFAULT_LOGIN_SECURITY, ...config };
}

/**
 * Get current login security configuration
 */
export function getLoginSecurityConfig() {
  return { ...loginSecurityConfig };
}

/**
 * Check if login is allowed (brute force protection)
 * @param identifier - Email or IP address
 * @returns Object with allowed status and lock info
 */
export function checkLoginAllowed(identifier: string): {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  const config = getLoginSecurityConfig();

  if (!record) {
    return { allowed: true, attemptsRemaining: config.maxAttempts };
  }

  // Check if locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      attemptsRemaining: 0,
      lockedUntil: new Date(record.lockedUntil)
    };
  }

  // Reset if window expired
  if (now - record.lastAttempt > config.attemptWindowMs) {
    loginAttempts.delete(identifier);
    return { allowed: true, attemptsRemaining: config.maxAttempts };
  }

  // Check remaining attempts
  if (record.count >= config.maxAttempts) {
    record.lockedUntil = now + config.lockoutDurationMs;
    return {
      allowed: false,
      attemptsRemaining: 0,
      lockedUntil: new Date(record.lockedUntil)
    };
  }

  return {
    allowed: true,
    attemptsRemaining: config.maxAttempts - record.count
  };
}

/**
 * Record a failed login attempt
 * @param identifier - Email or IP address
 */
export function recordFailedLogin(identifier: string): void {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  const config = getLoginSecurityConfig();

  if (!record) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return;
  }

  // Reset if window expired
  if (now - record.lastAttempt > config.attemptWindowMs) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return;
  }

  record.count++;
  record.lastAttempt = now;

  // Lock if max attempts reached
  if (record.count >= config.maxAttempts) {
    record.lockedUntil = now + config.lockoutDurationMs;
  }
}

/**
 * Clear login attempts after successful login
 * @param identifier - Email or IP address
 */
export function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Token blacklist for revoked tokens (in-memory, for production use Redis)
 */
const tokenBlacklist = new Set<string>();

/**
 * Add a token to the blacklist
 * @param token - The JWT token to blacklist
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Check if a token is blacklisted
 * @param token - The JWT token to check
 * @returns true if blacklisted, false otherwise
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Validate content security - check for XSS patterns in user content
 * @param content - The content to validate
 * @returns Sanitized content
 */
export function sanitizeHtmlContent(content: string): string {
  // Basic XSS prevention - encode dangerous characters
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if a URL is safe (not javascript: or data:)
 * @param url - The URL to validate
 * @returns true if safe, false otherwise
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return safeProtocols.includes(parsed.protocol);
  } catch {
    // Relative URLs are generally safe
    return !url.toLowerCase().startsWith('javascript:') &&
           !url.toLowerCase().startsWith('data:') &&
           !url.toLowerCase().startsWith('vbscript:');
  }
}
