/**
 * In-memory cache utility with TTL support
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttlMs?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 1000;

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;

    // Cleanup expired entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlMs);
    return data;
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instances for different cache categories
export const settingsCache = new MemoryCache(100);
export const familyCache = new MemoryCache(500);
export const memberCache = new MemoryCache(1000);
export const contentCache = new MemoryCache(500);

// Cache key generators
export const CacheKeys = {
  // Settings
  systemSettings: () => 'system:settings',
  siteSettings: (familyId: string) => `family:${familyId}:settings`,

  // Family
  family: (familyId: string) => `family:${familyId}`,
  familyBySlug: (slug: string) => `family:slug:${slug}`,
  familyStats: (familyId: string) => `family:${familyId}:stats`,

  // Members
  member: (memberId: string) => `member:${memberId}`,
  familyMembers: (familyId: string) => `family:${familyId}:members`,
  memberCount: (familyId: string) => `family:${familyId}:memberCount`,

  // Content
  entity: (entityId: string) => `entity:${entityId}`,
  familyEntities: (familyId: string, type?: string) =>
    type ? `family:${familyId}:entities:${type}` : `family:${familyId}:entities`,

  // Calendar
  birthdays: (familyId: string, month?: number) =>
    month ? `family:${familyId}:birthdays:${month}` : `family:${familyId}:birthdays`,
  upcomingEvents: (familyId: string) => `family:${familyId}:upcomingEvents`,

  // Dashboard
  dashboard: (familyId: string) => `family:${familyId}:dashboard`,
  quickStats: (familyId: string) => `family:${familyId}:quickStats`,

  // Directory
  directory: (familyId: string, page: number) => `family:${familyId}:directory:${page}`,
  alphabetIndex: (familyId: string) => `family:${familyId}:alphabetIndex`,
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute - for frequently changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - default
  LONG: 15 * 60 * 1000,      // 15 minutes - for semi-static data
  VERY_LONG: 60 * 60 * 1000, // 1 hour - for static data
};

// Cache invalidation helpers
export function invalidateFamilyCache(familyId: string): void {
  settingsCache.delete(CacheKeys.siteSettings(familyId));
  familyCache.deletePattern(`family:${familyId}*`);
  memberCache.deletePattern(`family:${familyId}*`);
  contentCache.deletePattern(`family:${familyId}*`);
}

export function invalidateMemberCache(familyId: string, memberId?: string): void {
  if (memberId) {
    memberCache.delete(CacheKeys.member(memberId));
  }
  memberCache.delete(CacheKeys.familyMembers(familyId));
  memberCache.delete(CacheKeys.memberCount(familyId));
  familyCache.delete(CacheKeys.familyStats(familyId));
  contentCache.delete(CacheKeys.birthdays(familyId));
}

export function invalidateContentCache(familyId: string, entityId?: string): void {
  if (entityId) {
    contentCache.delete(CacheKeys.entity(entityId));
  }
  contentCache.deletePattern(`family:${familyId}:entities*`);
  familyCache.delete(CacheKeys.familyStats(familyId));
}

export function invalidateSettingsCache(familyId?: string): void {
  if (familyId) {
    settingsCache.delete(CacheKeys.siteSettings(familyId));
  } else {
    settingsCache.delete(CacheKeys.systemSettings());
  }
}

// Export the MemoryCache class for custom instances
export { MemoryCache };
export type { CacheOptions, CacheEntry };
