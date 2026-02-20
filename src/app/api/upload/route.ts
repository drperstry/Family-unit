import { NextRequest } from 'next/server';
import { put, del } from '@vercel/blob';
import connectDB from '@/lib/db';
import { Media } from '@/models/Media';
import { Family } from '@/models/Family';
import { getCurrentUser } from '@/lib/auth';
import { UserRole, EntityType } from '@/types';
import { getUploadConfig, DEFAULT_SYSTEM_CONFIG } from '@/lib/config';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
  generateId,
} from '@/lib/utils';

// Helper to get file type category
function getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'audio' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'unknown';
}

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const familyId = formData.get('familyId') as string | null;
    const entityId = formData.get('entityId') as string | null;
    const entityType = formData.get('entityType') as string | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    // Get upload configuration (use defaults if DB unavailable)
    let uploadConfig;
    try {
      uploadConfig = await getUploadConfig();
    } catch {
      uploadConfig = DEFAULT_SYSTEM_CONFIG.uploads;
    }

    // Determine file category and get appropriate size limit
    const fileCategory = getFileCategory(file.type);
    let maxSize = uploadConfig.maxFileSize;

    switch (fileCategory) {
      case 'image':
        maxSize = uploadConfig.maxImageSize || uploadConfig.maxFileSize;
        break;
      case 'video':
        maxSize = uploadConfig.maxVideoSize || uploadConfig.maxFileSize;
        break;
      case 'document':
        maxSize = uploadConfig.maxDocumentSize || uploadConfig.maxFileSize;
        break;
      case 'audio':
        maxSize = uploadConfig.maxFileSize;
        break;
    }

    // Check file size against configurable limit
    if (file.size > maxSize) {
      return errorResponse(`File size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB for ${fileCategory} files`, 400);
    }

    // Check mime type against configurable allowed types
    const allAllowedTypes = [
      ...(uploadConfig.allowedImageTypes || []),
      ...(uploadConfig.allowedVideoTypes || []),
      ...(uploadConfig.allowedDocumentTypes || []),
      ...(uploadConfig.allowedAudioTypes || []),
    ];

    if (!allAllowedTypes.includes(file.type)) {
      return errorResponse(`File type ${file.type} is not allowed`, 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);

    if (!family) {
      return notFoundResponse('Family');
    }

    // Check if user belongs to this family
    if (user.familyId !== familyId && user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('You cannot upload files to this family');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || '';
    const uniqueFilename = `${familyId}/${timestamp}-${generateId()}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Generate thumbnail URL for images
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      // For images, we can use URL parameters for resizing if using a service like Vercel
      // This is a placeholder - in production you might want to generate actual thumbnails
      thumbnailUrl = blob.url;
    }

    // Save media record to database
    const media = new Media({
      familyId,
      entityId: entityId || undefined,
      entityType: entityType as EntityType || undefined,
      url: blob.url,
      thumbnailUrl,
      blobPath: uniqueFilename,
      originalFileName: file.name,
      mimeType: file.type,
      size: file.size,
      metadata: {
        uploadedAt: new Date(),
        contentType: file.type,
      },
      createdBy: user._id,
    });

    await media.save();

    return successResponse({
      id: media._id.toString(),
      url: blob.url,
      thumbnailUrl,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }, 'File uploaded successfully');
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload file', 500);
  }
}

// DELETE /api/upload - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId || !isValidObjectId(mediaId)) {
      return errorResponse('Valid media ID is required', 400);
    }

    await connectDB();

    const media = await Media.findById(mediaId);

    if (!media) {
      return notFoundResponse('Media');
    }

    // Check if user can delete
    const canDelete =
      user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.FAMILY_ADMIN && user.familyId === media.familyId.toString()) ||
      media.createdBy.toString() === user._id;

    if (!canDelete) {
      return forbiddenResponse('You cannot delete this file');
    }

    // Delete from Vercel Blob
    try {
      await del(media.url);
    } catch (blobError) {
      console.error('Error deleting from blob storage:', blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Soft delete from database
    media.isDeleted = true;
    media.deletedAt = new Date();
    media.deletedBy = user._id;
    await media.save();

    return successResponse(null, 'File deleted successfully');
  } catch (error) {
    console.error('Delete file error:', error);
    return errorResponse('Failed to delete file', 500);
  }
}
