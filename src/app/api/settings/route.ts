import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { SiteSettings } from '@/models/SiteSettings';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { UserRole, FamilyStatus, VisibilityStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
} from '@/lib/utils';
import {
  settingsCache,
  CacheKeys,
  CacheTTL,
  invalidateSettingsCache,
} from '@/lib/cache';

// GET /api/settings - Get site settings for a family
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access - public settings are viewable by anyone with family access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC && family.status === FamilyStatus.ACTIVE;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    // Non-admins get limited settings
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
      (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    // Try to get from cache for non-admin requests
    const cacheKey = CacheKeys.siteSettings(familyId);
    if (!isAdmin) {
      const cached = settingsCache.get<object>(cacheKey + ':public');
      if (cached) {
        return successResponse(cached);
      }
    }

    // Get or create settings
    let settings = await SiteSettings.findOne({ familyId });

    if (!settings) {
      settings = await SiteSettings.create({
        familyId,
        siteName: family.name,
      });
    }

    if (!isAdmin) {
      // Return only public-facing settings
      const publicSettings = {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logo: settings.logo,
        favicon: settings.favicon,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        fontFamily: settings.fontFamily,
        hero: settings.hero,
        about: settings.about,
        achievements: settings.achievements,
        services: settings.services,
        boardMembers: settings.boardMembers,
        media: settings.media,
        aboutContent: settings.aboutContent,
        welcomeMessage: settings.welcomeMessage,
        footerText: settings.footerText,
        copyrightText: settings.copyrightText,
        features: settings.features,
        socialLinks: settings.socialLinks,
        seo: settings.seo,
        navigation: settings.navigation,
        contact: {
          email: settings.contact?.email,
          phone: settings.contact?.phone,
          address: settings.contact?.address,
          showContactForm: settings.contact?.showContactForm,
        },
        customPages: settings.customPages?.filter(p => p.isPublished),
      };
      // Cache public settings
      settingsCache.set(cacheKey + ':public', publicSettings, CacheTTL.MEDIUM);
      return successResponse(publicSettings);
    }

    return successResponse(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse('Failed to get settings', 500);
  }
}

// PUT /api/settings - Update site settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can update settings
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can update settings');
    }

    if (!user.familyId) {
      return errorResponse('You must be a member of a family', 400);
    }

    const body = await request.json();
    const {
      // General Settings
      siteName,
      siteDescription,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      accentColor,
      fontFamily,
      // Hero Section
      hero,
      // About Section
      about,
      // Achievements
      achievements,
      // Services
      services,
      // Board Members
      boardMembers,
      // Media/Videos
      media,
      // Content Settings
      aboutContent,
      welcomeMessage,
      footerText,
      copyrightText,
      // Feature Toggles
      features,
      // Privacy
      privacy,
      // Notifications
      notifications,
      // Social Links
      socialLinks,
      // SEO
      seo,
      // Content Limits
      contentLimits,
      // Display
      display,
      // Family Tree Settings
      familyTreeSettings,
      // Invite Settings
      inviteSettings,
      // Custom Pages
      customPages,
      // Navigation
      navigation,
      // Contact
      contact,
      // Maintenance
      maintenance,
    } = body;

    await connectDB();

    const family = await Family.findById(user.familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Get or create settings
    let settings = await SiteSettings.findOne({ familyId: user.familyId });

    if (!settings) {
      settings = new SiteSettings({
        familyId: user.familyId,
        siteName: family.name,
      });
    }

    // Update general settings
    if (siteName !== undefined) settings.siteName = siteName;
    if (siteDescription !== undefined) settings.siteDescription = siteDescription;
    if (logo !== undefined) settings.logo = logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (primaryColor !== undefined) settings.primaryColor = primaryColor;
    if (secondaryColor !== undefined) settings.secondaryColor = secondaryColor;
    if (accentColor !== undefined) settings.accentColor = accentColor;
    if (fontFamily !== undefined) settings.fontFamily = fontFamily;

    // Update hero section
    if (hero !== undefined) {
      settings.hero = { ...settings.hero, ...hero };
    }

    // Update about section
    if (about !== undefined) {
      settings.about = {
        ...settings.about,
        ...about,
        features: about.features !== undefined ? about.features : settings.about?.features,
      };
    }

    // Update achievements (replace entire array)
    if (achievements !== undefined) {
      settings.achievements = achievements;
    }

    // Update services (replace entire array)
    if (services !== undefined) {
      settings.services = services;
    }

    // Update board members (replace entire array)
    if (boardMembers !== undefined) {
      settings.boardMembers = boardMembers;
    }

    // Update media section
    if (media !== undefined) {
      settings.media = {
        ...settings.media,
        ...media,
        featuredVideos: media.featuredVideos !== undefined ? media.featuredVideos : settings.media?.featuredVideos,
      };
    }

    // Update content settings
    if (aboutContent !== undefined) settings.aboutContent = aboutContent;
    if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage;
    if (footerText !== undefined) settings.footerText = footerText;
    if (copyrightText !== undefined) settings.copyrightText = copyrightText;

    // Update nested objects with merge
    if (features !== undefined) {
      settings.features = { ...settings.features, ...features };
    }
    if (privacy !== undefined) {
      settings.privacy = { ...settings.privacy, ...privacy };
    }
    if (notifications !== undefined) {
      settings.notifications = { ...settings.notifications, ...notifications };
    }
    if (socialLinks !== undefined) {
      settings.socialLinks = { ...settings.socialLinks, ...socialLinks };
    }
    if (seo !== undefined) {
      settings.seo = { ...settings.seo, ...seo };
    }
    if (contentLimits !== undefined) {
      settings.contentLimits = { ...settings.contentLimits, ...contentLimits };
    }
    if (display !== undefined) {
      settings.display = { ...settings.display, ...display };
    }
    if (familyTreeSettings !== undefined) {
      settings.familyTreeSettings = { ...settings.familyTreeSettings, ...familyTreeSettings };
    }
    if (inviteSettings !== undefined) {
      settings.inviteSettings = { ...settings.inviteSettings, ...inviteSettings };
    }
    if (navigation !== undefined) {
      settings.navigation = {
        ...settings.navigation,
        ...navigation,
        menuItems: navigation.menuItems !== undefined ? navigation.menuItems : settings.navigation?.menuItems,
      };
    }
    if (contact !== undefined) {
      settings.contact = {
        ...settings.contact,
        ...contact,
        contactFormRecipients: contact.contactFormRecipients !== undefined
          ? contact.contactFormRecipients
          : settings.contact?.contactFormRecipients,
      };
    }
    if (customPages !== undefined) {
      settings.customPages = customPages;
    }
    if (maintenance !== undefined) {
      settings.maintenance = { ...settings.maintenance, ...maintenance };
    }

    settings.updatedBy = user._id as any;
    await settings.save();

    // Invalidate cache
    invalidateSettingsCache(user.familyId);

    return successResponse(settings, 'Settings updated successfully');
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
