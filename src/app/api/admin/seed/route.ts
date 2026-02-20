import { NextRequest } from 'next/server';
import { Types, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Family } from '@/models/Family';
import { FamilyMember } from '@/models/FamilyMember';
import { SiteSettings } from '@/models/SiteSettings';
import { SystemSettings } from '@/models/SystemSettings';
import { Entity } from '@/models/Entity';
import { Event } from '@/models/Event';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { UserRole, FamilyStatus, ContentStatus, VisibilityStatus, EntityType, Gender } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Document & { _id: Types.ObjectId; [key: string]: any };

// Seed data configuration
const SEED_PASSWORD = 'Admin@123456';

const DEMO_FAMILY = {
  name: 'Demo Family',
  slug: 'demo-family',
  description: 'A demonstration family for testing and showcasing features',
  motto: 'Together We Grow',
  foundedYear: 1950,
  origin: 'United States',
  status: FamilyStatus.ACTIVE,
  visibility: VisibilityStatus.FAMILY_ONLY,
};

const DEMO_MEMBERS = [
  {
    firstName: 'John',
    lastName: 'Demo',
    gender: Gender.MALE,
    dateOfBirth: new Date('1950-03-15'),
    bio: 'Family patriarch and founder',
    generation: 1,
    isDeceased: false,
  },
  {
    firstName: 'Mary',
    lastName: 'Demo',
    gender: Gender.FEMALE,
    dateOfBirth: new Date('1952-07-22'),
    bio: 'Family matriarch',
    generation: 1,
    isDeceased: false,
  },
  {
    firstName: 'Robert',
    lastName: 'Demo',
    gender: Gender.MALE,
    dateOfBirth: new Date('1975-01-10'),
    bio: 'Eldest son, software engineer',
    generation: 2,
    isDeceased: false,
  },
  {
    firstName: 'Sarah',
    lastName: 'Demo',
    gender: Gender.FEMALE,
    dateOfBirth: new Date('1978-09-05'),
    bio: 'Daughter, teacher',
    generation: 2,
    isDeceased: false,
  },
  {
    firstName: 'Emily',
    lastName: 'Demo',
    gender: Gender.FEMALE,
    dateOfBirth: new Date('2000-04-18'),
    bio: 'Granddaughter, college student',
    generation: 3,
    isDeceased: false,
  },
];

const DEMO_EVENTS = [
  {
    title: 'Annual Family Reunion',
    description: 'Our yearly gathering to celebrate family bonds',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    isAllDay: true,
  },
  {
    title: 'Thanksgiving Dinner',
    description: 'Traditional family Thanksgiving celebration',
    startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isAllDay: false,
  },
];

const DEMO_NEWS = [
  {
    title: 'Welcome to Our Family Site',
    content: 'We are excited to launch our new family website! Here you can connect with family members, share photos, and stay updated on family events.',
    isPinned: true,
  },
  {
    title: 'Family History Project',
    content: 'We are starting a project to document our family history. Please share any old photos, stories, or documents you may have.',
    isPinned: false,
  },
];

// POST /api/admin/seed - Seed demo data
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    // Only system admins can seed data
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can seed data');
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    await connectDB();

    // Check if data already exists
    const existingFamily = await Family.findOne({ slug: DEMO_FAMILY.slug });
    if (existingFamily && !force) {
      return errorResponse('Demo data already exists. Use ?force=true to reseed.', 409);
    }

    // If force, clean up existing demo data first
    if (existingFamily && force) {
      await cleanupDemoData(existingFamily._id.toString());
    }

    // Initialize system settings if not exists
    let systemSettings = await SystemSettings.findOne();
    if (!systemSettings) {
      systemSettings = await SystemSettings.create({
        updatedBy: new Types.ObjectId(user._id),
      });
    }

    // Create demo admin user
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const demoAdmin = await User.create({
      email: 'demo.admin@familysite.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: UserRole.FAMILY_ADMIN,
      isEmailVerified: true,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          approvalAlerts: true,
          familyUpdates: true,
        },
      },
      profile: {},
    });

    // Create demo family
    const familyData = {
      name: DEMO_FAMILY.name,
      slug: DEMO_FAMILY.slug,
      description: DEMO_FAMILY.description,
      motto: DEMO_FAMILY.motto,
      foundedYear: DEMO_FAMILY.foundedYear,
      origin: DEMO_FAMILY.origin,
      status: DEMO_FAMILY.status,
      visibility: DEMO_FAMILY.visibility,
      createdBy: new Types.ObjectId(user._id),
      contactDetails: {
        email: 'demo@familysite.com',
      },
      settings: {
        allowMemberInvites: true,
        requireApprovalForContent: true,
        enabledModules: Object.values(EntityType),
        requestTypes: [],
        defaultContentVisibility: VisibilityStatus.FAMILY_ONLY,
        showFemalesInTree: true,
      },
      stats: {
        memberCount: DEMO_MEMBERS.length,
        contentCount: 0,
        pendingApprovals: 0,
      },
    };
    const family = await Family.create(familyData) as AnyDoc;

    // Update admin user with family
    demoAdmin.familyId = family._id;
    await demoAdmin.save();

    // Create site settings for family
    await SiteSettings.create({
      familyId: family._id,
      siteName: DEMO_FAMILY.name,
      siteDescription: DEMO_FAMILY.description,
      primaryColor: '#f59e0b',
      secondaryColor: '#1f2937',
      features: {
        familyTree: true,
        gallery: true,
        news: true,
        events: true,
        members: true,
        services: true,
        submissions: true,
        chat: false,
        recipes: true,
        documents: true,
        traditions: true,
        polls: true,
        memorial: true,
        announcements: true,
      },
      privacy: {
        isPublic: false,
        requireApproval: true,
        showMemberEmails: false,
        showMemberPhones: false,
        allowGuestViewing: false,
        showBirthDates: true,
        showDeathDates: true,
        showAddresses: false,
      },
      notifications: {
        emailOnNewMember: true,
        emailOnNewSubmission: true,
        emailOnApproval: true,
        emailOnNewContent: true,
        emailOnMention: true,
        emailDigestFrequency: 'weekly',
      },
      updatedBy: new Types.ObjectId(user._id),
    });

    // Create family members
    const createdMembers: Types.ObjectId[] = [];
    for (let i = 0; i < DEMO_MEMBERS.length; i++) {
      const memberData = DEMO_MEMBERS[i];
      const member = await FamilyMember.create({
        familyId: family._id,
        ...memberData,
        status: ContentStatus.APPROVED,
        role: i === 0 ? 'admin' : 'member',
        position: { x: i * 100, y: memberData.generation * 150, level: memberData.generation },
        lineage: [],
        childrenIds: [],
        createdBy: new Types.ObjectId(user._id),
      });
      createdMembers.push(member._id);
    }

    // Set up family relationships
    // John and Mary are parents of Robert and Sarah
    // Robert is parent of Emily
    const [john, mary, robert, sarah, emily] = createdMembers;

    await FamilyMember.findByIdAndUpdate(john, { spouseId: mary, childrenIds: [robert, sarah] });
    await FamilyMember.findByIdAndUpdate(mary, { spouseId: john, childrenIds: [robert, sarah] });
    await FamilyMember.findByIdAndUpdate(robert, { parentId: john, secondParentId: mary, childrenIds: [emily] });
    await FamilyMember.findByIdAndUpdate(sarah, { parentId: john, secondParentId: mary });
    await FamilyMember.findByIdAndUpdate(emily, { parentId: robert });

    // Create demo events
    for (const eventData of DEMO_EVENTS) {
      await Event.create({
        familyId: family._id,
        ...eventData,
        status: ContentStatus.APPROVED,
        visibility: VisibilityStatus.FAMILY_ONLY,
        organizers: [robert],
        attendees: [],
        createdBy: new Types.ObjectId(user._id),
      });
    }

    // Create demo news
    for (const newsData of DEMO_NEWS) {
      await Entity.create({
        familyId: family._id,
        entityType: EntityType.NEWS,
        title: newsData.title,
        content: newsData.content,
        isPinned: newsData.isPinned,
        status: ContentStatus.APPROVED,
        visibility: VisibilityStatus.FAMILY_ONLY,
        publishedAt: new Date(),
        viewCount: 0,
        createdBy: new Types.ObjectId(user._id),
      });
    }

    // Update family stats
    family.stats.contentCount = DEMO_EVENTS.length + DEMO_NEWS.length;
    await family.save();

    // Audit the seeding
    await audit.create(
      { user, request },
      family._id.toString(),
      family._id.toString(),
      'seed',
      'Demo data seeded'
    );

    return successResponse({
      family: {
        id: family._id.toString(),
        name: family.name,
        slug: family.slug,
      },
      admin: {
        email: demoAdmin.email,
        password: SEED_PASSWORD,
      },
      members: createdMembers.length,
      events: DEMO_EVENTS.length,
      news: DEMO_NEWS.length,
    }, 'Demo data seeded successfully');
  } catch (error) {
    console.error('Seed data error:', error);
    return errorResponse('Failed to seed data', 500);
  }
}

// DELETE /api/admin/seed - Reset/cleanup demo data
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can reset data');
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'demo'; // 'demo' or 'all'

    await connectDB();

    if (scope === 'all') {
      // Complete database reset - DANGEROUS
      const confirmation = searchParams.get('confirm');
      if (confirmation !== 'DELETE_ALL_DATA') {
        return errorResponse('Complete reset requires ?confirm=DELETE_ALL_DATA', 400);
      }

      // Delete all data except system admin users
      await Promise.all([
        Entity.deleteMany({}),
        Event.deleteMany({}),
        FamilyMember.deleteMany({}),
        SiteSettings.deleteMany({}),
        Family.deleteMany({}),
        User.deleteMany({ role: { $ne: UserRole.SYSTEM_ADMIN } }),
      ]);

      await audit.delete(
        { user, request },
        'system',
        'all',
        'database',
        'Complete database reset',
        'Admin initiated full reset'
      );

      return successResponse(null, 'Database reset complete. System admin users preserved.');
    }

    // Demo data cleanup only
    const demoFamily = await Family.findOne({ slug: DEMO_FAMILY.slug });
    if (!demoFamily) {
      return errorResponse('No demo data found to reset', 404);
    }

    await cleanupDemoData(demoFamily._id.toString());

    await audit.delete(
      { user, request },
      demoFamily._id.toString(),
      demoFamily._id.toString(),
      'seed',
      'Demo data cleanup',
      'Admin initiated demo data cleanup'
    );

    return successResponse(null, 'Demo data cleaned up successfully');
  } catch (error) {
    console.error('Reset data error:', error);
    return errorResponse('Failed to reset data', 500);
  }
}

// Helper function to cleanup demo data
async function cleanupDemoData(familyId: string): Promise<void> {
  await Promise.all([
    Entity.deleteMany({ familyId }),
    Event.deleteMany({ familyId }),
    FamilyMember.deleteMany({ familyId }),
    SiteSettings.deleteMany({ familyId }),
    User.deleteMany({ familyId, email: 'demo.admin@familysite.com' }),
    Family.deleteMany({ _id: familyId }),
  ]);
}

// GET /api/admin/seed - Get seed status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return forbiddenResponse('Only system administrators can check seed status');
    }

    await connectDB();

    const demoFamily = await Family.findOne({ slug: DEMO_FAMILY.slug });
    const systemSettings = await SystemSettings.findOne();

    const stats = {
      demoDataExists: !!demoFamily,
      systemSettingsInitialized: !!systemSettings,
      counts: {
        families: await Family.countDocuments(),
        users: await User.countDocuments(),
        members: await FamilyMember.countDocuments(),
        entities: await Entity.countDocuments(),
        events: await Event.countDocuments(),
      },
    };

    if (demoFamily) {
      const demoStats = {
        familyId: demoFamily._id.toString(),
        members: await FamilyMember.countDocuments({ familyId: demoFamily._id }),
        entities: await Entity.countDocuments({ familyId: demoFamily._id }),
        events: await Event.countDocuments({ familyId: demoFamily._id }),
      };
      return successResponse({ ...stats, demo: demoStats });
    }

    return successResponse(stats);
  } catch (error) {
    console.error('Get seed status error:', error);
    return errorResponse('Failed to get seed status', 500);
  }
}
