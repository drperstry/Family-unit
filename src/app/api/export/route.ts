import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { Entity } from '@/models/Entity';
import { Event } from '@/models/Event';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, ContentStatus, EntityType } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
} from '@/lib/utils';

// POST /api/export - Export family or user data
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const {
      exportType, // 'family' | 'user' | 'tree'
      familyId,
      format, // 'json' | 'csv'
      includePrivate,
      entities,
    } = body;

    if (!exportType || !['family', 'user', 'tree'].includes(exportType)) {
      return errorResponse('Valid export type is required (family, user, tree)', 400);
    }

    await connectDB();

    let exportData: Record<string, unknown> = {};
    let exportFamilyId: string | undefined;

    switch (exportType) {
      case 'family':
        if (!familyId || !isValidObjectId(familyId)) {
          return errorResponse('Valid family ID is required', 400);
        }

        const family = await Family.findById(familyId);

        if (!family) {
          return notFoundResponse('Family');
        }

        // Only family admin or system admin can export family data
        const canExportFamily =
          user.role === UserRole.SYSTEM_ADMIN ||
          (user.role === UserRole.FAMILY_ADMIN && user.familyId === familyId);

        if (!canExportFamily) {
          return forbiddenResponse('You cannot export this family data');
        }

        exportFamilyId = familyId;
        exportData = await exportFamilyData(familyId, includePrivate, entities);
        break;

      case 'user':
        // User can only export their own data
        exportData = await exportUserData(user._id);
        exportFamilyId = user.familyId;
        break;

      case 'tree':
        if (!familyId || !isValidObjectId(familyId)) {
          return errorResponse('Valid family ID is required', 400);
        }

        const treeFamily = await Family.findById(familyId);

        if (!treeFamily) {
          return notFoundResponse('Family');
        }

        // Check access for tree export
        const canExportTree =
          user.role === UserRole.SYSTEM_ADMIN ||
          user.familyId === familyId;

        if (!canExportTree) {
          return forbiddenResponse('You cannot export this family tree');
        }

        exportFamilyId = familyId;
        exportData = await exportTreeData(familyId, includePrivate);
        break;
    }

    // Audit the export
    await audit.export(
      { user, request },
      exportFamilyId || 'user',
      exportType,
      format || 'json'
    );

    // Format the response based on requested format
    if (format === 'csv') {
      // Convert to CSV format (simplified - would need proper CSV library for production)
      const csvData = convertToCSV(exportData);
      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${exportType}-export-${Date.now()}.csv"`,
        },
      });
    }

    // Default JSON format
    return successResponse({
      exportType,
      exportedAt: new Date().toISOString(),
      data: exportData,
    }, 'Export completed successfully');
  } catch (error) {
    console.error('Export error:', error);
    return errorResponse('Failed to export data', 500);
  }
}

async function exportFamilyData(
  familyId: string,
  includePrivate: boolean = false,
  entities?: EntityType[]
): Promise<Record<string, unknown>> {
  const query: Record<string, unknown> = {
    familyId,
    status: ContentStatus.APPROVED,
  };

  if (!includePrivate) {
    query.visibility = 'public';
  }

  const [family, members, content, events] = await Promise.all([
    Family.findById(familyId).lean(),
    FamilyMember.find({ familyId, status: ContentStatus.APPROVED }).lean(),
    entities && entities.length > 0
      ? Entity.find({ ...query, entityType: { $in: entities } }).lean()
      : Entity.find(query).lean(),
    Event.find({ ...query, isDeleted: false }).lean(),
  ]);

  return {
    family: {
      name: family?.name,
      slug: family?.slug,
      origin: family?.origin,
      description: family?.description,
      motto: family?.motto,
      foundedYear: family?.foundedYear,
      contactDetails: family?.contactDetails,
      socialLinks: family?.socialLinks,
    },
    members: members.map((m) => ({
      firstName: m.firstName,
      lastName: m.lastName,
      displayName: m.displayName,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      dateOfDeath: m.dateOfDeath,
      isDeceased: m.isDeceased,
      bio: m.bio,
      generation: m.generation,
      achievements: m.achievements,
    })),
    content: content.map((c) => ({
      type: c.entityType,
      title: c.title,
      description: c.description,
      createdAt: c.createdAt,
      tags: c.tags,
    })),
    events: events.map((e) => ({
      title: e.title,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location,
    })),
    exportedAt: new Date().toISOString(),
    totalMembers: members.length,
    totalContent: content.length,
    totalEvents: events.length,
  };
}

async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [user, member, createdContent, auditLogs] = await Promise.all([
    User.findById(userId).select('-passwordHash').lean(),
    FamilyMember.findOne({ userId }).lean(),
    Entity.find({ createdBy: userId }).lean(),
    AuditLog.find({ actorId: userId }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  return {
    user: {
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      displayName: user?.displayName,
      role: user?.role,
      preferences: user?.preferences,
      profile: user?.profile,
      createdAt: user?.createdAt,
    },
    familyMember: member ? {
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      bio: member.bio,
      generation: member.generation,
      achievements: member.achievements,
    } : null,
    createdContent: createdContent.map((c) => ({
      type: c.entityType,
      title: c.title,
      createdAt: c.createdAt,
      status: c.status,
    })),
    activityLog: auditLogs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      timestamp: log.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };
}

async function exportTreeData(
  familyId: string,
  includePrivate: boolean = false
): Promise<Record<string, unknown>> {
  const members = await FamilyMember.find({
    familyId,
    status: ContentStatus.APPROVED,
  })
    .sort({ generation: 1 })
    .lean();

  // Build tree structure
  const buildTree = (parentId: string | null): unknown[] => {
    return members
      .filter((m) => {
        if (parentId === null) {
          return !m.parentId;
        }
        return m.parentId?.toString() === parentId;
      })
      .map((m) => ({
        id: m._id.toString(),
        name: m.displayName || `${m.firstName} ${m.lastName}`,
        gender: m.gender,
        generation: m.generation,
        dateOfBirth: m.dateOfBirth,
        dateOfDeath: m.dateOfDeath,
        isDeceased: m.isDeceased,
        children: buildTree(m._id.toString()),
      }));
  };

  return {
    members: members.map((m) => ({
      id: m._id.toString(),
      firstName: m.firstName,
      lastName: m.lastName,
      displayName: m.displayName,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      dateOfDeath: m.dateOfDeath,
      isDeceased: m.isDeceased,
      generation: m.generation,
      parentId: m.parentId?.toString(),
      spouseId: m.spouseId?.toString(),
      childrenIds: m.childrenIds?.map((c: { toString: () => string }) => c.toString()),
    })),
    tree: buildTree(null),
    metadata: {
      totalMembers: members.length,
      totalGenerations: new Set(members.map((m) => m.generation)).size,
      exportedAt: new Date().toISOString(),
    },
  };
}

function convertToCSV(data: Record<string, unknown>): string {
  // Simplified CSV conversion - in production use a proper CSV library
  const lines: string[] = [];

  const processObject = (obj: unknown, prefix = ''): void => {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        processObject(item, `${prefix}[${index}]`);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
        processObject(value, prefix ? `${prefix}.${key}` : key);
      });
    } else {
      lines.push(`${prefix},${String(obj)}`);
    }
  };

  lines.push('Field,Value');
  processObject(data);

  return lines.join('\n');
}
