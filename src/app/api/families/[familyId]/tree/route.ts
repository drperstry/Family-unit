import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { FamilyTreeVersion } from '@/models/FamilyTreeVersion';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole, ContentStatus, Gender } from '@/types';
import {
  errorResponse,
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  isValidObjectId,
} from '@/lib/utils';

interface RouteParams {
  params: Promise<{ familyId: string }>;
}

// GET /api/families/[familyId]/tree - Get family tree structure
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { familyId } = await params;

    if (!isValidObjectId(familyId)) {
      return errorResponse('Invalid family ID', 400);
    }

    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC && family.status === FamilyStatus.ACTIVE;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family tree');
    }

    // Get version parameter
    const versionParam = searchParams.get('version');
    const showFemales = searchParams.get('showFemales') === 'true' || family.settings.showFemalesInTree;

    // If version specified, get from version history
    if (versionParam) {
      const version = await FamilyTreeVersion.findOne({
        familyId,
        version: parseInt(versionParam, 10),
      });

      if (!version) {
        return notFoundResponse('Tree version');
      }

      return successResponse({
        version: version.version,
        snapshot: version.snapshot,
        isHistorical: true,
        changedBy: version.changedBy,
        changeDescription: version.changeDescription,
        createdAt: version.createdAt,
      });
    }

    // Build current tree
    const query: Record<string, unknown> = {
      familyId,
      status: ContentStatus.APPROVED,
    };

    if (!showFemales) {
      query.gender = Gender.MALE;
    }

    const members = await FamilyMember.find(query)
      .sort({ generation: 1, createdAt: 1 })
      .populate('spouseId', 'firstName lastName photo gender');

    // Build tree structure
    const memberMap = new Map();
    members.forEach(m => {
      memberMap.set(m._id.toString(), {
        id: m._id.toString(),
        memberId: m._id.toString(),
        firstName: m.firstName,
        lastName: m.lastName,
        displayName: m.displayName || `${m.firstName} ${m.lastName}`,
        gender: m.gender,
        photo: m.photo,
        dateOfBirth: m.dateOfBirth,
        dateOfDeath: m.dateOfDeath,
        isDeceased: m.isDeceased,
        generation: m.generation,
        parentId: m.parentId?.toString(),
        spouseId: m.spouseId?._id?.toString(),
        spouse: m.spouseId ? {
          id: m.spouseId._id.toString(),
          firstName: m.spouseId.firstName,
          lastName: m.spouseId.lastName,
          photo: m.spouseId.photo,
          gender: m.spouseId.gender,
        } : null,
        childrenIds: m.childrenIds?.map((c: { toString: () => string }) => c.toString()) || [],
        position: m.position,
      });
    });

    // Find root members (those without parents or whose parents aren't in the tree)
    const rootMembers = members.filter(m =>
      !m.parentId || !memberMap.has(m.parentId.toString())
    );

    // Build hierarchical structure
    const buildHierarchy = (memberId: string): unknown => {
      const member = memberMap.get(memberId);
      if (!member) return null;

      const children = members
        .filter(m => m.parentId?.toString() === memberId)
        .map(m => buildHierarchy(m._id.toString()))
        .filter(Boolean);

      return {
        ...member,
        children,
      };
    };

    const treeStructure = rootMembers.map(m => buildHierarchy(m._id.toString())).filter(Boolean);

    // Get metadata
    const generations = new Set(members.map(m => m.generation));
    const metadata = {
      totalMembers: members.length,
      totalGenerations: generations.size,
      rootMemberIds: rootMembers.map(m => m._id.toString()),
      lastUpdated: new Date(),
    };

    // Get latest version number
    const latestVersion = await FamilyTreeVersion.findOne({ familyId })
      .sort({ version: -1 })
      .select('version');

    return successResponse({
      members: Array.from(memberMap.values()),
      tree: treeStructure,
      metadata,
      currentVersion: latestVersion?.version || 0,
      showFemales,
    });
  } catch (error) {
    console.error('Get tree error:', error);
    return errorResponse('Failed to get family tree', 500);
  }
}

// POST /api/families/[familyId]/tree - Save tree version (snapshot)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { familyId } = await params;

    if (!isValidObjectId(familyId)) {
      return errorResponse('Invalid family ID', 400);
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only family admin or system admin can save tree versions
    if (user.role !== UserRole.SYSTEM_ADMIN &&
        (user.role !== UserRole.FAMILY_ADMIN || user.familyId !== familyId)) {
      return forbiddenResponse('Only family admins can save tree versions');
    }

    const body = await request.json();
    const { changeDescription } = body;

    if (!changeDescription || typeof changeDescription !== 'string') {
      return errorResponse('Change description is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Get all current approved members
    const members = await FamilyMember.find({
      familyId,
      status: ContentStatus.APPROVED,
    });

    // Build snapshot
    const snapshot = {
      members: members.map(m => m.toObject()),
      structure: members.map(m => ({
        id: m._id.toString(),
        memberId: m._id,
        parentId: m.parentId,
        spouseId: m.spouseId,
        childrenIds: m.childrenIds,
        position: m.position,
      })),
      metadata: {
        totalMembers: members.length,
        totalGenerations: new Set(members.map(m => m.generation)).size,
        rootMemberId: members.find(m => !m.parentId)?._id,
        lastUpdated: new Date(),
      },
    };

    // Create version
    const version = new FamilyTreeVersion({
      familyId,
      snapshot,
      changeDescription: changeDescription.trim(),
      changedBy: user._id,
      isActive: true,
      createdBy: user._id,
    });

    await version.save();

    // Audit log
    await audit.treeUpdate(
      { user, request },
      familyId,
      version.version,
      changeDescription
    );

    return successResponse(
      {
        version: version.version,
        changeDescription: version.changeDescription,
        createdAt: version.createdAt,
      },
      'Tree version saved successfully'
    );
  } catch (error) {
    console.error('Save tree version error:', error);
    return errorResponse('Failed to save tree version', 500);
  }
}
