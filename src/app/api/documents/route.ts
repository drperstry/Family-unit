import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { FamilyDocument } from '@/models/Document';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { ContentStatus, VisibilityStatus, UserRole } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';
import { sanitizeStringValue } from '@/lib/security';

// Valid document types
const VALID_DOC_TYPES = [
  'certificate', 'photo', 'letter', 'legal', 'medical',
  'financial', 'historical', 'other'
];

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const pagination = parsePaginationQuery(searchParams, 'default');

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    const query: Record<string, unknown> = {
      familyId,
      isDeleted: false,
    };

    // Non-members only see approved public documents
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
                   (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    if (!isFamilyMember) {
      query.status = ContentStatus.APPROVED;
      query.visibility = VisibilityStatus.PUBLIC;
    } else if (!isAdmin) {
      query.$or = [
        { status: ContentStatus.APPROVED },
        { createdBy: user._id },
      ];
    }

    // Category filter
    const category = searchParams.get('category');
    if (category) {
      query.category = category;
    }

    // Document type filter
    const documentType = searchParams.get('documentType');
    if (documentType && VALID_DOC_TYPES.includes(documentType)) {
      query.documentType = documentType;
    }

    // Important only
    const importantOnly = searchParams.get('importantOnly') === 'true';
    if (importantOnly) {
      query.isImportant = true;
    }

    // Search
    const search = searchParams.get('search');
    if (search) {
      const sanitizedSearch = sanitizeStringValue(search);
      if (sanitizedSearch) {
        query.$text = { $search: sanitizedSearch };
      }
    }

    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

    const [documents, total] = await Promise.all([
      FamilyDocument.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('relatedMembers', 'firstName lastName photo')
        .select('-accessLog') // Don't send access log in list view
        .lean(),
      FamilyDocument.countDocuments(query),
    ]);

    return successResponse(
      documents,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List documents error:', error);
    return errorResponse('Failed to list documents', 500);
  }
}

// POST /api/documents - Create/upload document
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to upload documents');
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      thumbnailUrl,
      tags,
      relatedMembers,
      relatedEvents,
      date,
      documentType,
      isImportant,
      expiresAt,
      reminderDate,
      visibility,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.title = 'Document title must be at least 2 characters';
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      errors.fileUrl = 'File URL is required';
    }

    if (!fileName || typeof fileName !== 'string') {
      errors.fileName = 'File name is required';
    }

    if (!fileSize || typeof fileSize !== 'number') {
      errors.fileSize = 'File size is required';
    }

    if (!mimeType || typeof mimeType !== 'string') {
      errors.mimeType = 'MIME type is required';
    }

    if (!category || typeof category !== 'string') {
      errors.category = 'Category is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    const document = new FamilyDocument({
      familyId: user.familyId,
      title: title.trim(),
      description: description?.trim(),
      category: category.trim(),
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      thumbnailUrl,
      tags: tags || [],
      relatedMembers: relatedMembers?.map((id: string) => new Types.ObjectId(id)) || [],
      relatedEvents: relatedEvents?.map((id: string) => new Types.ObjectId(id)) || [],
      date: date ? new Date(date) : undefined,
      documentType: documentType && VALID_DOC_TYPES.includes(documentType) ? documentType : 'other',
      isImportant: isImportant || false,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
      status: ContentStatus.APPROVED, // Documents are approved immediately
      visibility: visibility || VisibilityStatus.FAMILY,
      createdBy: user._id,
    });

    await document.save();

    await audit.contentCreate(
      { user, request },
      user.familyId,
      document._id.toString(),
      'document',
      document.title
    );

    return successResponse(document, 'Document uploaded successfully');
  } catch (error) {
    console.error('Create document error:', error);
    return errorResponse('Failed to upload document', 500);
  }
}
