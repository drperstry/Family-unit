'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

// Settings types matching the SiteSettings model
interface SiteSettings {
  _id: string;
  familyId: string;
  siteName: string;
  siteDescription?: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  aboutContent?: string;
  welcomeMessage?: string;
  footerText?: string;
  features: {
    familyTree: boolean;
    gallery: boolean;
    news: boolean;
    events: boolean;
    members: boolean;
    services: boolean;
    submissions: boolean;
    chat: boolean;
    recipes?: boolean;
    documents?: boolean;
    traditions?: boolean;
    polls?: boolean;
    memorial?: boolean;
    announcements?: boolean;
  };
  privacy: {
    isPublic: boolean;
    requireApproval: boolean;
    showMemberEmails: boolean;
    showMemberPhones: boolean;
    allowGuestViewing: boolean;
  };
  notifications: {
    emailOnNewMember: boolean;
    emailOnNewSubmission: boolean;
    emailOnApproval: boolean;
    emailDigestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  };
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  customPages?: Array<{
    slug: string;
    title: string;
    content: string;
    isPublished: boolean;
    order: number;
  }>;
  maintenance: {
    enabled: boolean;
    message?: string;
  };
}

// Default settings used while loading or when no family
const defaultSettings: SiteSettings = {
  _id: '',
  familyId: '',
  siteName: '',
  siteDescription: '',
  logo: '',
  favicon: '',
  primaryColor: '#f59e0b',
  secondaryColor: '#1f2937',
  aboutContent: '',
  welcomeMessage: '',
  footerText: '',
  features: {
    familyTree: true,
    gallery: true,
    news: true,
    events: true,
    members: true,
    services: true,
    submissions: true,
    chat: false,
    recipes: true,
    documents: true,
    traditions: true,
    polls: true,
    memorial: true,
    announcements: true,
  },
  privacy: {
    isPublic: false,
    requireApproval: true,
    showMemberEmails: false,
    showMemberPhones: false,
    allowGuestViewing: false,
  },
  notifications: {
    emailOnNewMember: true,
    emailOnNewSubmission: true,
    emailOnApproval: true,
    emailDigestFrequency: 'weekly',
  },
  socialLinks: {},
  seo: {},
  customPages: [],
  maintenance: {
    enabled: false,
  },
};

interface SettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SiteSettings>) => Promise<boolean>;
  isFeatureEnabled: (feature: keyof SiteSettings['features']) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Cache for settings to prevent unnecessary fetches
const settingsCache = new Map<string, { settings: SiteSettings; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (familyId: string) => {
    // Check cache first
    const cached = settingsCache.get(familyId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSettings(cached.settings);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/settings?familyId=${familyId}`);
      const data = await response.json();

      if (data.success && data.data) {
        const newSettings = { ...defaultSettings, ...data.data };
        setSettings(newSettings);
        settingsCache.set(familyId, { settings: newSettings, timestamp: Date.now() });
      } else {
        // Use defaults if no settings found
        setSettings({ ...defaultSettings, familyId });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings');
      setSettings({ ...defaultSettings, familyId });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    if (user?.familyId) {
      // Clear cache to force refresh
      settingsCache.delete(user.familyId);
      await fetchSettings(user.familyId);
    }
  }, [user?.familyId, fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<SiteSettings>): Promise<boolean> => {
    if (!user?.familyId) return false;

    try {
      const response = await fetch(`/api/settings?familyId=${user.familyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const newSettings = { ...settings, ...data.data };
        setSettings(newSettings);
        settingsCache.set(user.familyId, { settings: newSettings, timestamp: Date.now() });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update settings:', err);
      return false;
    }
  }, [user?.familyId, settings]);

  const isFeatureEnabled = useCallback((feature: keyof SiteSettings['features']): boolean => {
    return settings.features[feature] ?? false;
  }, [settings.features]);

  // Load settings when user/familyId changes
  useEffect(() => {
    if (authLoading) {
      // Wait for auth to complete
      return;
    }

    if (user?.familyId) {
      fetchSettings(user.familyId);
    } else {
      // No family, use defaults
      setSettings(defaultSettings);
      setIsLoading(false);
    }
  }, [user?.familyId, authLoading, fetchSettings]);

  // Compute isReady - true when auth is done AND settings are loaded
  const isReady = useMemo(() => {
    return !authLoading && !isLoading;
  }, [authLoading, isLoading]);

  const value = useMemo(() => ({
    settings,
    isLoading,
    isReady,
    error,
    refreshSettings,
    updateSettings,
    isFeatureEnabled,
  }), [settings, isLoading, isReady, error, refreshSettings, updateSettings, isFeatureEnabled]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// HOC for pages that should wait for settings to be ready
export function withSettings<P extends object>(
  Component: React.ComponentType<P>,
  options?: { showLoadingUI?: boolean }
) {
  return function SettingsAwareComponent(props: P) {
    const { isReady, isLoading } = useSettings();

    if (!isReady && options?.showLoadingUI !== false) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Component that shows children only when settings are ready
export function SettingsGate({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isReady } = useSettings();

  if (!isReady) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return <>{children}</>;
}

// Feature gate component - only shows children if feature is enabled
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: keyof SiteSettings['features'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isFeatureEnabled, isReady } = useSettings();

  if (!isReady) {
    return null;
  }

  if (!isFeatureEnabled(feature)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
