import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Recipe } from '@/models/Recipe';
import { Approval } from '@/models/Approval';
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

// GET /api/recipes - List recipes
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

    // Non-members only see approved public content
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

    // Difficulty filter
    const difficulty = searchParams.get('difficulty');
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty;
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

    const [recipes, total] = await Promise.all([
      Recipe.find(query)
        .sort({ [sortField]: sortOrder })
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .populate('createdBy', 'firstName lastName avatar')
        .lean(),
      Recipe.countDocuments(query),
    ]);

    return successResponse(
      recipes,
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('List recipes error:', error);
    return errorResponse('Failed to list recipes', 500);
  }
}

// POST /api/recipes - Create recipe
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family to create recipes');
    }

    const body = await request.json();
    const {
      title,
      description,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      difficulty,
      category,
      cuisine,
      tags,
      images,
      video,
      nutrition,
      origin,
      story,
      tips,
      variations,
      visibility,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.title = 'Recipe title must be at least 2 characters';
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      errors.ingredients = 'At least one ingredient is required';
    }

    if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
      errors.instructions = 'At least one instruction is required';
    }

    if (!category || typeof category !== 'string') {
      errors.category = 'Category is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    await connectDB();

    const recipe = new Recipe({
      familyId: user.familyId,
      title: title.trim(),
      description: description?.trim(),
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      difficulty: difficulty || 'medium',
      category: category.trim(),
      cuisine: cuisine?.trim(),
      tags: tags || [],
      images: images || [],
      video,
      nutrition,
      origin: origin?.trim(),
      story: story?.trim(),
      tips: tips || [],
      variations: variations || [],
      visibility: visibility || VisibilityStatus.FAMILY_ONLY,
      status: ContentStatus.PENDING,
      createdBy: user._id,
    });

    await recipe.save();

    // Create approval request
    await Approval.create({
      familyId: user.familyId,
      entityId: recipe._id.toString(),
      entityType: 'recipe',
      requesterId: user._id,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Update family stats
    await Family.findByIdAndUpdate(user.familyId, {
      $inc: { 'stats.pendingApprovals': 1 },
    });

    await audit.contentCreate(
      { user, request },
      user.familyId,
      recipe._id.toString(),
      'recipe',
      recipe.title
    );

    return successResponse(recipe, 'Recipe submitted for approval');
  } catch (error) {
    console.error('Create recipe error:', error);
    return errorResponse('Failed to create recipe', 500);
  }
}
