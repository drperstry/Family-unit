/**
 * Seed Script for Family Site Platform
 *
 * This script creates demo data including:
 * - System Admin user
 * - Demo public family with members
 * - Demo private family with members
 * - Sample activities, events, photos
 * - Sample audit logs
 *
 * Usage: npx ts-node scripts/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Types
enum UserRole {
  GUEST = 'guest',
  FAMILY_MEMBER = 'family_member',
  FAMILY_ADMIN = 'family_admin',
  SYSTEM_ADMIN = 'system_admin'
}

enum FamilyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
}

enum VisibilityStatus {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

enum ContentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

enum EntityType {
  ACTIVITY = 'activity',
  NEWS = 'news',
  ACHIEVEMENT = 'achievement',
}

enum AuditAction {
  CREATE = 'create',
  LOGIN = 'login',
  FAMILY_CREATE = 'family_create',
  MEMBER_ADD = 'member_add',
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family-platform';

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (be careful with this in production!)
    console.log('🗑️  Clearing existing data...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database cleared\n');

    // Create collections
    const User = mongoose.model('User', new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      displayName: String,
      avatar: String,
      role: { type: String, enum: Object.values(UserRole), default: UserRole.GUEST },
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
      isEmailVerified: { type: Boolean, default: true },
      preferences: {
        theme: { type: String, default: 'system' },
        language: { type: String, default: 'en' },
        notifications: {
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          approvalAlerts: { type: Boolean, default: true },
          familyUpdates: { type: Boolean, default: true },
        },
      },
      profile: {
        bio: String,
        phone: String,
        gender: { type: String, enum: Object.values(Gender) },
      },
      isDeleted: { type: Boolean, default: false },
    }, { timestamps: true }));

    const Family = mongoose.model('Family', new mongoose.Schema({
      name: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      logo: String,
      banner: String,
      origin: String,
      description: String,
      motto: String,
      foundedYear: Number,
      contactDetails: {
        email: String,
        phone: String,
        address: {
          city: String,
          country: String,
        },
      },
      status: { type: String, enum: Object.values(FamilyStatus), default: FamilyStatus.ACTIVE },
      visibility: { type: String, enum: Object.values(VisibilityStatus), default: VisibilityStatus.PRIVATE },
      settings: {
        allowMemberInvites: { type: Boolean, default: true },
        requireApprovalForContent: { type: Boolean, default: true },
        showFemalesInTree: { type: Boolean, default: false },
      },
      stats: {
        memberCount: { type: Number, default: 0 },
        contentCount: { type: Number, default: 0 },
        pendingApprovals: { type: Number, default: 0 },
      },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      isDeleted: { type: Boolean, default: false },
    }, { timestamps: true }));

    const FamilyMember = mongoose.model('FamilyMember', new mongoose.Schema({
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      displayName: String,
      gender: { type: String, enum: Object.values(Gender), required: true },
      dateOfBirth: Date,
      dateOfDeath: Date,
      isDeceased: { type: Boolean, default: false },
      photo: String,
      bio: String,
      parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
      spouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
      childrenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
      generation: { type: Number, default: 1 },
      lineage: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
      role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
      status: { type: String, enum: Object.values(ContentStatus), default: ContentStatus.APPROVED },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      isDeleted: { type: Boolean, default: false },
    }, { timestamps: true }));

    const Entity = mongoose.model('Entity', new mongoose.Schema({
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
      title: { type: String, required: true },
      description: String,
      status: { type: String, enum: Object.values(ContentStatus), default: ContentStatus.APPROVED },
      visibility: { type: String, enum: Object.values(VisibilityStatus), default: VisibilityStatus.PRIVATE },
      entityType: { type: String, enum: Object.values(EntityType), required: true },
      tags: [String],
      startDate: Date,
      endDate: Date,
      content: String,
      isPinned: { type: Boolean, default: false },
      viewCount: { type: Number, default: 0 },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      isDeleted: { type: Boolean, default: false },
    }, { timestamps: true }));

    const Event = mongoose.model('Event', new mongoose.Schema({
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
      title: { type: String, required: true },
      description: String,
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      isAllDay: { type: Boolean, default: false },
      status: { type: String, enum: Object.values(ContentStatus), default: ContentStatus.APPROVED },
      visibility: { type: String, enum: Object.values(VisibilityStatus), default: VisibilityStatus.PRIVATE },
      color: { type: String, default: '#3B82F6' },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      isDeleted: { type: Boolean, default: false },
    }, { timestamps: true }));

    const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      actorRole: { type: String, enum: Object.values(UserRole), required: true },
      action: { type: String, enum: Object.values(AuditAction), required: true },
      entityId: { type: mongoose.Schema.Types.ObjectId },
      entityType: String,
      details: mongoose.Schema.Types.Mixed,
      ipAddress: String,
    }, { timestamps: true }));

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Create System Admin
    console.log('👤 Creating System Admin...');
    const systemAdmin = await User.create({
      email: 'admin@familyhub.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.SYSTEM_ADMIN,
      profile: { bio: 'System Administrator' },
    });
    console.log(`   ✅ Created: ${systemAdmin.email}`);

    // 2. Create Public Family (The Johnson Family)
    console.log('\n👨‍👩‍👧‍👦 Creating Public Family (The Johnson Family)...');

    const johnsonAdmin = await User.create({
      email: 'john.johnson@demo.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Johnson',
      role: UserRole.FAMILY_ADMIN,
      profile: { bio: 'Family patriarch and admin', gender: Gender.MALE },
    });

    const johnsonFamily = await Family.create({
      name: 'The Johnson Family',
      slug: 'johnson-family',
      origin: 'Boston, Massachusetts',
      description: 'A warm and welcoming family with roots in New England. We believe in togetherness, traditions, and making memories that last a lifetime.',
      motto: 'Together, we are stronger',
      foundedYear: 1952,
      visibility: VisibilityStatus.PUBLIC,
      status: FamilyStatus.ACTIVE,
      contactDetails: {
        email: 'contact@johnsonfamily.com',
        address: { city: 'Boston', country: 'USA' },
      },
      settings: {
        allowMemberInvites: true,
        requireApprovalForContent: true,
        showFemalesInTree: true,
      },
      createdBy: johnsonAdmin._id,
    });

    await User.findByIdAndUpdate(johnsonAdmin._id, { familyId: johnsonFamily._id });
    console.log(`   ✅ Created family: ${johnsonFamily.name}`);

    // Create Johnson family members
    console.log('   📝 Creating family members...');

    // Generation 1 - Grandparents
    const grandpaJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Robert',
      lastName: 'Johnson',
      gender: Gender.MALE,
      dateOfBirth: new Date('1952-03-15'),
      generation: 1,
      role: 'member',
      bio: 'Founder of the family line. Retired teacher who loves gardening.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    const grandmaJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Margaret',
      lastName: 'Johnson',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1954-07-22'),
      spouseId: grandpaJohnson._id,
      generation: 1,
      role: 'member',
      bio: 'Loving grandmother who makes the best apple pie.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    await FamilyMember.findByIdAndUpdate(grandpaJohnson._id, { spouseId: grandmaJohnson._id });

    // Generation 2 - Parents
    const johnMember = await FamilyMember.create({
      familyId: johnsonFamily._id,
      userId: johnsonAdmin._id,
      firstName: 'John',
      lastName: 'Johnson',
      gender: Gender.MALE,
      dateOfBirth: new Date('1978-05-10'),
      parentId: grandpaJohnson._id,
      generation: 2,
      lineage: [grandpaJohnson._id],
      role: 'admin',
      bio: 'Family admin and software engineer.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    const sarahJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1980-09-18'),
      spouseId: johnMember._id,
      generation: 2,
      role: 'member',
      bio: 'Elementary school teacher.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    await FamilyMember.findByIdAndUpdate(johnMember._id, { spouseId: sarahJohnson._id });
    await FamilyMember.findByIdAndUpdate(grandpaJohnson._id, { $push: { childrenIds: johnMember._id } });

    const mikeJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Michael',
      lastName: 'Johnson',
      gender: Gender.MALE,
      dateOfBirth: new Date('1981-12-03'),
      parentId: grandpaJohnson._id,
      generation: 2,
      lineage: [grandpaJohnson._id],
      role: 'member',
      bio: 'Doctor and sports enthusiast.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    await FamilyMember.findByIdAndUpdate(grandpaJohnson._id, { $push: { childrenIds: mikeJohnson._id } });

    // Generation 3 - Children
    const emmaJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Emma',
      lastName: 'Johnson',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2005-02-14'),
      parentId: johnMember._id,
      generation: 3,
      lineage: [grandpaJohnson._id, johnMember._id],
      role: 'member',
      bio: 'College student studying biology.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    const liamJohnson = await FamilyMember.create({
      familyId: johnsonFamily._id,
      firstName: 'Liam',
      lastName: 'Johnson',
      gender: Gender.MALE,
      dateOfBirth: new Date('2008-08-30'),
      parentId: johnMember._id,
      generation: 3,
      lineage: [grandpaJohnson._id, johnMember._id],
      role: 'member',
      bio: 'High school student who loves music.',
      status: ContentStatus.APPROVED,
      createdBy: johnsonAdmin._id,
    });

    await FamilyMember.findByIdAndUpdate(johnMember._id, {
      $push: { childrenIds: { $each: [emmaJohnson._id, liamJohnson._id] } }
    });

    // Update family stats
    await Family.findByIdAndUpdate(johnsonFamily._id, { 'stats.memberCount': 8 });

    console.log('   ✅ Created 8 family members');

    // 3. Create Private Family (The Smith Family)
    console.log('\n🔒 Creating Private Family (The Smith Family)...');

    const smithAdmin = await User.create({
      email: 'james.smith@demo.com',
      passwordHash,
      firstName: 'James',
      lastName: 'Smith',
      role: UserRole.FAMILY_ADMIN,
      profile: { bio: 'Family administrator', gender: Gender.MALE },
    });

    const smithFamily = await Family.create({
      name: 'The Smith Family',
      slug: 'smith-family',
      origin: 'Chicago, Illinois',
      description: 'A private family keeping our traditions alive. Family first, always.',
      motto: 'Family is everything',
      foundedYear: 1965,
      visibility: VisibilityStatus.PRIVATE,
      status: FamilyStatus.ACTIVE,
      settings: {
        allowMemberInvites: false,
        requireApprovalForContent: true,
        showFemalesInTree: false,
      },
      createdBy: smithAdmin._id,
    });

    await User.findByIdAndUpdate(smithAdmin._id, { familyId: smithFamily._id });
    console.log(`   ✅ Created family: ${smithFamily.name}`);

    // Create Smith family members
    console.log('   📝 Creating family members...');

    const jamesSmith = await FamilyMember.create({
      familyId: smithFamily._id,
      userId: smithAdmin._id,
      firstName: 'James',
      lastName: 'Smith',
      gender: Gender.MALE,
      dateOfBirth: new Date('1975-06-20'),
      generation: 1,
      role: 'admin',
      status: ContentStatus.APPROVED,
      createdBy: smithAdmin._id,
    });

    const davidSmith = await FamilyMember.create({
      familyId: smithFamily._id,
      firstName: 'David',
      lastName: 'Smith',
      gender: Gender.MALE,
      dateOfBirth: new Date('2002-04-15'),
      parentId: jamesSmith._id,
      generation: 2,
      lineage: [jamesSmith._id],
      role: 'member',
      status: ContentStatus.APPROVED,
      createdBy: smithAdmin._id,
    });

    await FamilyMember.findByIdAndUpdate(jamesSmith._id, { $push: { childrenIds: davidSmith._id } });
    await Family.findByIdAndUpdate(smithFamily._id, { 'stats.memberCount': 2 });

    console.log('   ✅ Created 2 family members');

    // 4. Create Sample Activities and Events
    console.log('\n📅 Creating sample activities and events...');

    // Activities for Johnson Family
    await Entity.create({
      familyId: johnsonFamily._id,
      title: 'Annual Family Reunion 2024',
      description: 'Our yearly gathering at Grandpa\'s farm. Bring your favorite dish!',
      entityType: EntityType.ACTIVITY,
      status: ContentStatus.APPROVED,
      visibility: VisibilityStatus.PUBLIC,
      startDate: new Date('2024-07-04'),
      endDate: new Date('2024-07-06'),
      tags: ['reunion', 'summer', 'tradition'],
      createdBy: johnsonAdmin._id,
    });

    await Entity.create({
      familyId: johnsonFamily._id,
      title: 'Emma Graduates College!',
      description: 'Congratulations to Emma for graduating with honors in Biology!',
      entityType: EntityType.NEWS,
      status: ContentStatus.APPROVED,
      visibility: VisibilityStatus.PUBLIC,
      content: 'We are so proud of Emma for her incredible achievement...',
      isPinned: true,
      createdBy: johnsonAdmin._id,
    });

    await Entity.create({
      familyId: johnsonFamily._id,
      title: 'Liam\'s Music Award',
      description: 'Liam won first place in the state piano competition!',
      entityType: EntityType.ACHIEVEMENT,
      status: ContentStatus.APPROVED,
      visibility: VisibilityStatus.PUBLIC,
      tags: ['achievement', 'music', 'piano'],
      createdBy: johnsonAdmin._id,
    });

    // Events for Johnson Family
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await Event.create({
      familyId: johnsonFamily._id,
      title: 'Grandma\'s 70th Birthday',
      description: 'Celebrating Grandma Margaret\'s 70th birthday!',
      startDate: nextMonth,
      endDate: new Date(nextMonth.getTime() + 4 * 60 * 60 * 1000),
      status: ContentStatus.APPROVED,
      visibility: VisibilityStatus.PRIVATE,
      color: '#EC4899',
      createdBy: johnsonAdmin._id,
    });

    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    await Event.create({
      familyId: johnsonFamily._id,
      title: 'Family Game Night',
      description: 'Monthly game night at John\'s house',
      startDate: twoWeeksLater,
      endDate: new Date(twoWeeksLater.getTime() + 3 * 60 * 60 * 1000),
      status: ContentStatus.APPROVED,
      visibility: VisibilityStatus.PRIVATE,
      color: '#10B981',
      createdBy: johnsonAdmin._id,
    });

    await Family.findByIdAndUpdate(johnsonFamily._id, { 'stats.contentCount': 3 });

    console.log('   ✅ Created 3 activities and 2 events');

    // 5. Create Audit Logs
    console.log('\n📋 Creating sample audit logs...');

    const auditLogs = [
      {
        familyId: johnsonFamily._id,
        actorId: johnsonAdmin._id,
        actorRole: UserRole.FAMILY_ADMIN,
        action: AuditAction.FAMILY_CREATE,
        entityId: johnsonFamily._id,
        entityType: 'family',
        details: { familyName: johnsonFamily.name },
      },
      {
        familyId: johnsonFamily._id,
        actorId: johnsonAdmin._id,
        actorRole: UserRole.FAMILY_ADMIN,
        action: AuditAction.MEMBER_ADD,
        entityId: grandpaJohnson._id,
        entityType: 'familyMember',
        details: { memberName: 'Robert Johnson' },
      },
      {
        familyId: johnsonFamily._id,
        actorId: johnsonAdmin._id,
        actorRole: UserRole.FAMILY_ADMIN,
        action: AuditAction.CREATE,
        entityType: 'activity',
        details: { title: 'Annual Family Reunion 2024' },
      },
      {
        actorId: systemAdmin._id,
        actorRole: UserRole.SYSTEM_ADMIN,
        action: AuditAction.LOGIN,
        details: { method: 'password' },
        ipAddress: '127.0.0.1',
      },
    ];

    await AuditLog.insertMany(auditLogs);
    console.log('   ✅ Created 4 audit log entries');

    // 6. Create Demo Member User
    console.log('\n👤 Creating demo member user...');
    const memberUser = await User.create({
      email: 'member@demo.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.FAMILY_MEMBER,
      familyId: johnsonFamily._id,
      profile: { bio: 'Demo family member account', gender: Gender.FEMALE },
    });
    console.log(`   ✅ Created: ${memberUser.email}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Seed completed successfully!\n');
    console.log('Demo Accounts:');
    console.log('─'.repeat(50));
    console.log('System Admin:');
    console.log('  Email: admin@familyhub.com');
    console.log('  Password: password123\n');
    console.log('Family Admin (Johnson):');
    console.log('  Email: john.johnson@demo.com');
    console.log('  Password: password123\n');
    console.log('Family Admin (Smith):');
    console.log('  Email: james.smith@demo.com');
    console.log('  Password: password123\n');
    console.log('Family Member:');
    console.log('  Email: member@demo.com');
    console.log('  Password: password123');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run seed
seed();
