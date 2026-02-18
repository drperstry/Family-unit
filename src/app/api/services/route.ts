import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { Service } from '@/models/Service';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { UserRole, FamilyStatus, VisibilityStatus, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';

// GET /api/services - Get services for a family
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

    // Check access
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

    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
      (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    const pagination = parsePaginationQuery(searchParams);

    // Build query
    const query: Record<string, unknown> = { familyId };

    // Non-admins only see approved and visible services
    if (!isAdmin) {
      query.status = ContentStatus.APPROVED;
      if (!isFamilyMember) {
        query.visibility = VisibilityStatus.PUBLIC;
      }
    }

    // Filter by category
    const category = searchParams.get('category');
    if (category) {
      query.category = category;
    }

    const [services, total] = await Promise.all([
      Service.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('providedBy', 'firstName lastName avatar')
        .populate('createdBy', 'firstName lastName'),
      Service.countDocuments(query),
    ]);

    return successResponse(
      services,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Get services error:', error);
    return errorResponse('Failed to get services', 500);
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only admins can create services
    if (user.role !== UserRole.FAMILY_ADMIN && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only admins can create services');
    }

    if (!user.familyId) {
      return errorResponse('You must be a member of a family to create services', 400);
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      icon,
      image,
      contactName,
      contactEmail,
      contactPhone,
      contactAddress,
      availability,
      isExternal,
      externalUrl,
      price,
      requirements,
      eligibility,
      providedBy,
      providerName,
      visibility,
      order,
    } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return errorResponse('Title, description, and category are required', 400);
    }

    const validCategories = [
      'legal', 'financial', 'medical', 'education',
      'housing', 'employment', 'social', 'religious', 'other'
    ];

    if (!validCategories.includes(category)) {
      return errorResponse('Invalid category', 400);
    }

    await connectDB();

    const family = await Family.findById(user.familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    const service = new Service({
      familyId: user.familyId,
      title,
      description,
      category,
      icon,
      image,
      contactName,
      contactEmail,
      contactPhone,
      contactAddress,
      availability: availability || 'business_hours',
      isExternal: isExternal || false,
      externalUrl,
      price: price || { type: 'free' },
      requirements: requirements || [],
      eligibility,
      providedBy,
      providerName,
      status: ContentStatus.APPROVED, // Admins auto-approve
      visibility: visibility || VisibilityStatus.PRIVATE,
      order: order || 0,
      createdBy: user._id,
    });

    await service.save();

    // Populate for response
    await service.populate('createdBy', 'firstName lastName');

    return successResponse(service, 'Service created successfully');
  } catch (error) {
    console.error('Create service error:', error);
    return errorResponse('Failed to create service', 500);
  }
}
