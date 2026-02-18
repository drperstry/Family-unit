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

    // Get or create settings
    let settings = await SiteSettings.findOne({ familyId });

    if (!settings) {
      settings = await SiteSettings.create({
        familyId,
        siteName: family.name,
      });
    }

    // Non-admins get limited settings
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
      (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isAdmin) {
      // Return only public-facing settings
      const publicSettings = {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logo: settings.logo,
        favicon: settings.favicon,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        aboutContent: settings.aboutContent,
        welcomeMessage: settings.welcomeMessage,
        footerText: settings.footerText,
        features: settings.features,
        socialLinks: settings.socialLinks,
        seo: settings.seo,
        customPages: settings.customPages?.filter(p => p.isPublished),
      };
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
      siteName,
      siteDescription,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      aboutContent,
      welcomeMessage,
      footerText,
      features,
      privacy,
      notifications,
      socialLinks,
      seo,
      customPages,
      maintenance,
    } = body;

    await connectDB();

    const family = await Family.findById(user.familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // SECURITY FIX: Removed tautology bug (user.familyId !== user.familyId always false)
    // Family admins can only update settings for their own family
    // This is already enforced by using user.familyId for the settings lookup below

    // Get or create settings
    let settings = await SiteSettings.findOne({ familyId: user.familyId });

    if (!settings) {
      settings = new SiteSettings({
        familyId: user.familyId,
        siteName: family.name,
      });
    }

    // Update fields
    if (siteName !== undefined) settings.siteName = siteName;
    if (siteDescription !== undefined) settings.siteDescription = siteDescription;
    if (logo !== undefined) settings.logo = logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (primaryColor !== undefined) settings.primaryColor = primaryColor;
    if (secondaryColor !== undefined) settings.secondaryColor = secondaryColor;
    if (aboutContent !== undefined) settings.aboutContent = aboutContent;
    if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage;
    if (footerText !== undefined) settings.footerText = footerText;

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
    if (customPages !== undefined) {
      settings.customPages = customPages;
    }
    if (maintenance !== undefined) {
      settings.maintenance = { ...settings.maintenance, ...maintenance };
    }

    settings.updatedBy = user._id as any;
    await settings.save();

    return successResponse(settings, 'Settings updated successfully');
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
