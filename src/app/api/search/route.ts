import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Entity } from '@/models/Entity';
import { Event } from '@/models/Event';
import { FamilyMember } from '@/models/FamilyMember';
import { Family } from '@/models/Family';
import { News } from '@/models/Entity';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { FamilyStatus, VisibilityStatus, UserRole, ContentStatus, EntityType, SearchQuery } from '@/types';
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  parsePaginationQuery,
  buildPaginationInfo,
  isValidObjectId,
} from '@/lib/utils';

// GET /api/search - Full-text search across family content
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get('familyId');
    const query = searchParams.get('q');

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    if (!query || query.trim().length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400);
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

    const pagination = parsePaginationQuery(searchParams);
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    // Build base filter
    const baseFilter: Record<string, unknown> = {
      familyId,
      $text: { $search: query },
    };

    // Apply visibility filters for non-members
    if (!isFamilyMember && !isAdmin) {
      baseFilter.status = ContentStatus.APPROVED;
      baseFilter.visibility = VisibilityStatus.PUBLIC;
    }

    // Entity type filter
    const entityType = searchParams.get('entityType');

    // Date filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      baseFilter.createdAt = {};
      if (dateFrom) {
        (baseFilter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (baseFilter.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    // Contributor filter
    const contributor = searchParams.get('contributor');
    if (contributor && isValidObjectId(contributor)) {
      baseFilter.createdBy = contributor;
    }

    // Prepare search queries for different collections
    const searchPromises: Promise<unknown[]>[] = [];
    const collectionTypes: string[] = [];

    // Search entities
    if (!entityType || Object.values(EntityType).includes(entityType as EntityType)) {
      const entityFilter = { ...baseFilter };
      if (entityType) {
        entityFilter.entityType = entityType;
      }

      searchPromises.push(
        Entity.find(entityFilter)
          .select('title description entityType status visibility createdAt createdBy')
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .limit(pagination.limit!)
          .populate('createdBy', 'firstName lastName')
          .lean()
      );
      collectionTypes.push('entities');
    }

    // Search events
    if (!entityType || entityType === EntityType.EVENT) {
      searchPromises.push(
        Event.find(baseFilter)
          .select('title description startDate endDate status visibility createdAt createdBy')
          .sort({ score: { $meta: 'textScore' }, startDate: -1 })
          .limit(pagination.limit!)
          .populate('createdBy', 'firstName lastName')
          .lean()
      );
      collectionTypes.push('events');
    }

    // Search members
    if (!entityType || entityType === 'member') {
      const memberFilter: Record<string, unknown> = {
        familyId,
        $text: { $search: query },
      };

      if (!isAdmin) {
        memberFilter.status = ContentStatus.APPROVED;
      }

      searchPromises.push(
        FamilyMember.find(memberFilter)
          .select('firstName lastName displayName gender generation photo status createdAt')
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .limit(pagination.limit!)
          .lean()
      );
      collectionTypes.push('members');
    }

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises);

    // Combine and format results
    const searchResults: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      createdAt: Date;
      relevance: number;
      data: unknown;
    }> = [];

    results.forEach((collectionResults, index) => {
      const type = collectionTypes[index];

      (collectionResults as unknown[]).forEach((item: unknown, itemIndex: number) => {
        const doc = item as Record<string, unknown>;

        let title = '';
        let description = '';

        switch (type) {
          case 'entities':
          case 'events':
            title = doc.title as string;
            description = doc.description as string;
            break;
          case 'members':
            title = doc.displayName as string || `${doc.firstName} ${doc.lastName}`;
            description = `Generation ${doc.generation}`;
            break;
        }

        searchResults.push({
          id: (doc._id as { toString: () => string }).toString(),
          type: type === 'entities' ? (doc.entityType as string) : type,
          title,
          description,
          createdAt: doc.createdAt as Date,
          relevance: collectionResults.length - itemIndex, // Simple relevance score
          data: doc,
        });
      });
    });

    // Sort by relevance and date
    searchResults.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Paginate combined results
    const startIndex = (pagination.page! - 1) * pagination.limit!;
    const paginatedResults = searchResults.slice(startIndex, startIndex + pagination.limit!);

    return successResponse(
      {
        results: paginatedResults,
        query,
        filters: {
          entityType,
          dateFrom,
          dateTo,
          contributor,
        },
      },
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, searchResults.length)
    );
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Failed to perform search', 500);
  }
}
