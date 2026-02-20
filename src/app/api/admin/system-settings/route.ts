import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { SystemSettings } from '@/models/SystemSettings';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils';

// GET /api/admin/system-settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only system admins can view system settings
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can access system settings');
    }

    await connectDB();

    const settings = await SystemSettings.findOne();

    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await SystemSettings.create({});
      return successResponse(defaultSettings);
    }

    return successResponse(settings);
  } catch (error) {
    console.error('Get system settings error:', error);
    return errorResponse('Failed to get system settings', 500);
  }
}

// PUT /api/admin/system-settings - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only system admins can update system settings
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can modify system settings');
    }

    const body = await request.json();

    await connectDB();

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = new SystemSettings({});
    }

    // Track changes for audit
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Update uploads settings
    if (body.uploads) {
      for (const key of Object.keys(body.uploads)) {
        if (settings.uploads && body.uploads[key] !== undefined) {
          const oldValue = (settings.uploads as Record<string, unknown>)[key];
          if (oldValue !== body.uploads[key]) {
            changes[`uploads.${key}`] = { old: oldValue, new: body.uploads[key] };
          }
          (settings.uploads as Record<string, unknown>)[key] = body.uploads[key];
        }
      }
    }

    // Update rate limits
    if (body.rateLimits) {
      for (const category of Object.keys(body.rateLimits)) {
        for (const key of Object.keys(body.rateLimits[category])) {
          const path = `rateLimits.${category}.${key}`;
          const oldValue = settings.rateLimits?.[category as keyof typeof settings.rateLimits]?.[key as never];
          const newValue = body.rateLimits[category][key];
          if (oldValue !== newValue) {
            changes[path] = { old: oldValue, new: newValue };
          }
        }
      }
      settings.rateLimits = { ...settings.rateLimits, ...body.rateLimits };
    }

    // Update security settings
    if (body.security) {
      const securityChanges = compareAndUpdate(settings.security, body.security, 'security');
      Object.assign(changes, securityChanges);
      settings.security = { ...settings.security, ...body.security };
    }

    // Update tokens settings
    if (body.tokens) {
      const tokenChanges = compareAndUpdate(settings.tokens, body.tokens, 'tokens');
      Object.assign(changes, tokenChanges);
      settings.tokens = { ...settings.tokens, ...body.tokens };
    }

    // Update pagination settings
    if (body.pagination) {
      const paginationChanges = compareAndUpdate(settings.pagination, body.pagination, 'pagination');
      Object.assign(changes, paginationChanges);
      settings.pagination = { ...settings.pagination, ...body.pagination };
    }

    // Update database settings
    if (body.database) {
      const dbChanges = compareAndUpdate(settings.database, body.database, 'database');
      Object.assign(changes, dbChanges);
      settings.database = { ...settings.database, ...body.database };
    }

    // Update retention settings
    if (body.retention) {
      const retentionChanges = compareAndUpdate(settings.retention, body.retention, 'retention');
      Object.assign(changes, retentionChanges);
      settings.retention = { ...settings.retention, ...body.retention };
    }

    // Update email settings
    if (body.email) {
      const emailChanges = compareAndUpdate(settings.email, body.email, 'email');
      Object.assign(changes, emailChanges);
      settings.email = { ...settings.email, ...body.email };
    }

    // Update content limits
    if (body.contentLimits) {
      const contentChanges = compareAndUpdate(settings.contentLimits, body.contentLimits, 'contentLimits');
      Object.assign(changes, contentChanges);
      settings.contentLimits = { ...settings.contentLimits, ...body.contentLimits };
    }

    // Update system features
    if (body.systemFeatures) {
      const featureChanges = compareAndUpdate(settings.systemFeatures, body.systemFeatures, 'systemFeatures');
      Object.assign(changes, featureChanges);
      settings.systemFeatures = { ...settings.systemFeatures, ...body.systemFeatures };
    }

    // Update CORS settings
    if (body.cors) {
      const corsChanges = compareAndUpdate(settings.cors, body.cors, 'cors');
      Object.assign(changes, corsChanges);
      settings.cors = { ...settings.cors, ...body.cors };
    }

    settings.updatedBy = new Types.ObjectId(user._id);

    await settings.save();

    // Audit the changes
    if (Object.keys(changes).length > 0) {
      await audit.update(
        { user, request },
        'system',
        settings._id.toString(),
        'system_settings',
        changes
      );
    }

    return successResponse(settings, 'System settings updated successfully');
  } catch (error) {
    console.error('Update system settings error:', error);
    return errorResponse('Failed to update system settings', 500);
  }
}

// Helper function to compare and track changes
function compareAndUpdate(
  current: Record<string, unknown> | undefined,
  updates: Record<string, unknown>,
  prefix: string
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(updates)) {
    const oldValue = current?.[key];
    const newValue = updates[key];

    if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
      // Nested object
      const nestedChanges = compareAndUpdate(
        oldValue as Record<string, unknown>,
        newValue as Record<string, unknown>,
        `${prefix}.${key}`
      );
      Object.assign(changes, nestedChanges);
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[`${prefix}.${key}`] = { old: oldValue, new: newValue };
    }
  }

  return changes;
}

// POST /api/admin/system-settings/reset - Reset to defaults
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can reset system settings');
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    await connectDB();

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({});
      return successResponse(settings, 'System settings initialized with defaults');
    }

    // Reset specific section or all
    if (section) {
      const defaults = new SystemSettings();
      const defaultSection = (defaults as unknown as Record<string, unknown>)[section];

      if (defaultSection) {
        (settings as unknown as Record<string, unknown>)[section] = defaultSection;
        await settings.save();

        await audit.update(
          { user, request },
          'system',
          settings._id.toString(),
          'system_settings',
          { [`${section}_reset`]: { old: 'custom', new: 'default' } }
        );

        return successResponse(settings, `${section} settings reset to defaults`);
      } else {
        return errorResponse(`Invalid section: ${section}`, 400);
      }
    }

    // Reset all settings
    await SystemSettings.deleteOne({ _id: settings._id });
    const newSettings = await SystemSettings.create({
      updatedBy: user._id,
    });

    await audit.update(
      { user, request },
      'system',
      newSettings._id.toString(),
      'system_settings',
      { all_settings_reset: { old: 'custom', new: 'default' } }
    );

    return successResponse(newSettings, 'All system settings reset to defaults');
  } catch (error) {
    console.error('Reset system settings error:', error);
    return errorResponse('Failed to reset system settings', 500);
  }
}
