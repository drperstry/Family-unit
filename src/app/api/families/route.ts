import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Family } from '@/models/Family';
import { User } from '@/models/User';
import { Approval } from '@/models/Approval';
import { FamilyMember } from '@/models/FamilyMember';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { FamilyStatus, VisibilityStatus, UserRole, Gender, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  slugify,
} from '@/lib/utils';

// GET /api/families - List families (public or user's family)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    await connectDB();

    const query: Record<string, unknown> = {};

    // System admin can see all families
    if (user?.role === UserRole.SYSTEM_ADMIN) {
      // No filter - can see everything
      const status = searchParams.get('status');
      if (status) {
        query.status = status;
      }
    } else if (user?.familyId) {
      // User can see their own family plus public families
      query.$or = [
        { _id: user.familyId },
        { visibility: VisibilityStatus.PUBLIC, status: FamilyStatus.ACTIVE },
      ];
    } else {
      // Guest can only see public, active families
      query.visibility = VisibilityStatus.PUBLIC;
      query.status = FamilyStatus.ACTIVE;
    }

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      query.$text = { $search: search };
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [families, total] = await Promise.all([
      Family.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .select('-settings')
        .populate('createdBy', 'firstName lastName'),
      Family.countDocuments(query),
    ]);

    return successResponse(
      families,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List families error:', error);
    return errorResponse('Failed to list families', 500);
  }
}

// POST /api/families - Create a new family
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Check if user already belongs to a family
    if (user.familyId) {
      return errorResponse('You already belong to a family', 400);
    }

    // Only guests and family admins can create families
    if (user.role !== UserRole.GUEST && user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('You cannot create a family');
    }

    const body = await request.json();
    const {
      name,
      origin,
      description,
      motto,
      foundedYear,
      contactDetails,
      socialLinks,
      visibility,
      logo,
      banner,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.name = 'Family name must be at least 2 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    // Generate unique slug
    let slug = slugify(name);
    const existingFamily = await Family.findOne({ slug });
    if (existingFamily) {
      slug = `${slug}-${Date.now()}`;
    }

    // Determine initial status based on visibility
    const familyVisibility = visibility === VisibilityStatus.PUBLIC
      ? VisibilityStatus.PUBLIC
      : VisibilityStatus.PRIVATE;

    // Private families are active immediately, public families need approval
    const initialStatus = familyVisibility === VisibilityStatus.PUBLIC
      ? FamilyStatus.PENDING
      : FamilyStatus.ACTIVE;

    const family = new Family({
      name: name.trim(),
      slug,
      origin: origin?.trim(),
      description: description?.trim(),
      motto: motto?.trim(),
      foundedYear,
      contactDetails: contactDetails || {},
      socialLinks: socialLinks || {},
      visibility: familyVisibility,
      status: initialStatus,
      logo,
      banner,
      createdBy: user._id,
      stats: {
        memberCount: 1,
        contentCount: 0,
        pendingApprovals: 0,
      },
    });

    await family.save();

    // Update user to be family admin of this family
    await User.findByIdAndUpdate(user._id, {
      familyId: family._id,
      role: UserRole.FAMILY_ADMIN,
    });

    // Create the user as a family member (the founder)
    const dbUser = await User.findById(user._id);
    if (dbUser) {
      const member = new FamilyMember({
        familyId: family._id,
        userId: user._id,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        gender: dbUser.profile?.gender || Gender.MALE,
        role: 'admin',
        status: ContentStatus.APPROVED,
        generation: 1,
        createdBy: user._id,
      });
      await member.save();
    }

    // If public, create approval request
    if (familyVisibility === VisibilityStatus.PUBLIC) {
      await Approval.create({
        familyId: family._id.toString(),
        entityId: family._id.toString(),
        entityType: 'family',
        requesterId: user._id,
        status: 'pending',
        requestedAt: new Date(),
      });
    }

    // Audit log
    await audit.familyCreate(
      { user, request },
      family._id.toString(),
      family.name,
      familyVisibility === VisibilityStatus.PUBLIC
    );

    return successResponse(
      family,
      familyVisibility === VisibilityStatus.PUBLIC
        ? 'Family created and pending approval'
        : 'Family created successfully'
    );
  } catch (error) {
    console.error('Create family error:', error);
    return errorResponse('Failed to create family', 500);
  }
}
