import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { FamilyMember } from '@/models/FamilyMember';
import { User } from '@/models/User';
import { Family } from '@/models/Family';
import { SiteSettings } from '@/models/SiteSettings';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { UserRole, VisibilityStatus, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
  parsePaginationQuery,
  buildPaginationInfo,
} from '@/lib/utils';

interface DirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  nickname?: string;
  photo?: string;
  email?: string;
  phone?: string;
  location?: {
    city?: string;
    country?: string;
  };
  occupation?: string;
  bio?: string;
  generation: number;
  role: string;
  isDeceased: boolean;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

// GET /api/directory - Get family directory
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const search = searchParams.get('q');
    const generation = searchParams.get('generation');
    const letter = searchParams.get('letter'); // First letter filter
    const includeDeceased = searchParams.get('includeDeceased') === 'true';
    const sortBy = searchParams.get('sortBy') || 'firstName'; // firstName, lastName, generation
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

    // Get privacy settings
    const settings = await SiteSettings.findOne({ familyId });
    const privacySettings = settings?.privacy || {
      showMemberEmails: false,
      showMemberPhones: false,
      showAddresses: false,
    };

    // Determine if user is family member
    const isFamilyMember = user?.familyId === familyId;
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN ||
                   (user?.role === UserRole.FAMILY_ADMIN && isFamilyMember);

    // Build query
    const query: Record<string, unknown> = {
      familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
    };

    if (!includeDeceased) {
      query.isDeceased = false;
    }

    if (generation) {
      query.generation = parseInt(generation, 10);
    }

    if (letter && /^[A-Za-z]$/.test(letter)) {
      query.firstName = { $regex: `^${letter}`, $options: 'i' };
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { displayName: searchRegex },
        { nickname: searchRegex },
        { occupation: searchRegex },
        { 'location.city': searchRegex },
      ];
    }

    // Build sort
    const sortOptions: Record<string, 1 | -1> = {};
    switch (sortBy) {
      case 'lastName':
        sortOptions.lastName = 1;
        sortOptions.firstName = 1;
        break;
      case 'generation':
        sortOptions.generation = 1;
        sortOptions.firstName = 1;
        break;
      default:
        sortOptions.firstName = 1;
        sortOptions.lastName = 1;
    }

    const [members, total] = await Promise.all([
      FamilyMember.find(query)
        .sort(sortOptions)
        .skip((pagination.page! - 1) * pagination.limit!)
        .limit(pagination.limit!)
        .lean(),
      FamilyMember.countDocuments(query),
    ]);

    // Get associated users for contact info
    const userIds = members
      .filter(m => m.userId)
      .map(m => m.userId);

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id profile.phone')
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Transform to directory entries
    const directory: DirectoryEntry[] = members.map(member => {
      const associatedUser = member.userId ? userMap.get(member.userId.toString()) : null;

      const entry: DirectoryEntry = {
        id: member._id.toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName,
        nickname: member.nickname,
        photo: member.photo,
        bio: member.bio,
        occupation: member.occupation,
        generation: member.generation,
        role: member.role,
        isDeceased: member.isDeceased || false,
      };

      // Include location if allowed or user is admin/member
      if (privacySettings.showAddresses || isAdmin || isFamilyMember) {
        entry.location = member.location;
      }

      // Include email if allowed or user is admin
      if (privacySettings.showMemberEmails || isAdmin) {
        entry.email = member.contactDetails?.email || (member as unknown as { email?: string }).email;
      }

      // Include phone if allowed or user is admin
      if (privacySettings.showMemberPhones || isAdmin) {
        entry.phone = member.contactDetails?.phone ||
                     (associatedUser as unknown as { profile?: { phone?: string } })?.profile?.phone;
      }

      // Include social links for family members
      const contactDetails = member.contactDetails as Record<string, unknown> | undefined;
      if (isFamilyMember && contactDetails?.socialLinks) {
        const socialLinks = contactDetails.socialLinks as Record<string, string>;
        entry.socialLinks = {
          facebook: socialLinks?.facebook,
          twitter: socialLinks?.twitter,
          instagram: socialLinks?.instagram,
          linkedin: socialLinks?.linkedin,
        };
      }

      return entry;
    });

    // Get unique first letters for alphabet navigation
    const allFirstLetters = await FamilyMember.distinct('firstName', {
      familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
      ...(!includeDeceased ? { isDeceased: false } : {}),
    });

    const alphabetIndex = [...new Set(
      allFirstLetters
        .map(name => name.charAt(0).toUpperCase())
        .filter(char => /[A-Z]/.test(char))
    )].sort();

    // Get generation stats
    const generationStats = await FamilyMember.aggregate([
      {
        $match: {
          familyId: family._id,
          isDeleted: false,
          status: ContentStatus.APPROVED,
          ...(!includeDeceased ? { isDeceased: false } : {}),
        },
      },
      {
        $group: {
          _id: '$generation',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return successResponse(
      {
        directory,
        alphabetIndex,
        generations: generationStats.map(g => ({
          generation: g._id,
          count: g.count,
        })),
        filters: {
          search,
          generation,
          letter,
          includeDeceased,
          sortBy,
        },
      },
      undefined,
      buildPaginationInfo(pagination.page!, pagination.limit!, total)
    );
  } catch (error) {
    console.error('Directory error:', error);
    return errorResponse('Failed to get family directory', 500);
  }
}

// POST /api/directory/export - Export directory
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family');
    }

    const body = await request.json();
    const { format = 'json', fields = ['name', 'email', 'phone'] } = body;

    await connectDB();

    // Only family admins can export
    if (user.role !== UserRole.SYSTEM_ADMIN && user.role !== UserRole.FAMILY_ADMIN) {
      return forbiddenResponse('Only administrators can export the directory');
    }

    const members = await FamilyMember.find({
      familyId: user.familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
    }).sort({ firstName: 1, lastName: 1 }).lean();

    // Build export data based on requested fields
    const exportData = members.map(member => {
      const entry: Record<string, unknown> = {};

      if (fields.includes('name')) {
        entry.firstName = member.firstName;
        entry.lastName = member.lastName;
        entry.fullName = `${member.firstName} ${member.lastName}`;
      }

      if (fields.includes('email') && member.contactDetails?.email) {
        entry.email = member.contactDetails.email;
      }

      if (fields.includes('phone') && member.contactDetails?.phone) {
        entry.phone = member.contactDetails.phone;
      }

      if (fields.includes('location') && member.location) {
        entry.city = member.location.city;
        entry.country = member.location.country;
      }

      if (fields.includes('birthday') && member.dateOfBirth) {
        entry.birthday = new Date(member.dateOfBirth).toISOString().split('T')[0];
      }

      if (fields.includes('occupation')) {
        entry.occupation = member.occupation;
      }

      if (fields.includes('generation')) {
        entry.generation = member.generation;
      }

      return entry;
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvLines = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(h => {
            const val = row[h];
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`;
            }
            return val ?? '';
          }).join(',')
        ),
      ];

      return new Response(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="family-directory.csv"',
        },
      });
    }

    return successResponse({
      data: exportData,
      count: exportData.length,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Export directory error:', error);
    return errorResponse('Failed to export directory', 500);
  }
}
