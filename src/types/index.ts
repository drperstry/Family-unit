// Core Types for Family Site Platform

// ==================== Enums ====================

export enum UserRole {
  GUEST = 'guest',
  FAMILY_MEMBER = 'family_member',
  FAMILY_ADMIN = 'family_admin',
  SYSTEM_ADMIN = 'system_admin'
}

export enum FamilyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived'
}

export enum ContentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

export enum VisibilityStatus {
  PRIVATE = 'private',
  PUBLIC = 'public',
  FAMILY_ONLY = 'family_only'
}

export enum EntityType {
  ACTIVITY = 'activity',
  CEREMONY = 'ceremony',
  REQUEST = 'request',
  PHOTO = 'photo',
  PHOTO_FOLDER = 'photo_folder',
  NEWS = 'news',
  ABOUT_ME = 'about_me',
  ACHIEVEMENT = 'achievement',
  OFFER = 'offer',
  LOCATION = 'location',
  CONTACT = 'contact',
  PROCEDURE = 'procedure',
  EVENT = 'event',
  FAMILY_TREE = 'family_tree'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  APPROVE = 'approve',
  REJECT = 'reject',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ROLE_CHANGE = 'role_change',
  FAMILY_CREATE = 'family_create',
  FAMILY_APPROVE = 'family_approve',
  MEMBER_ADD = 'member_add',
  MEMBER_REMOVE = 'member_remove',
  TREE_UPDATE = 'tree_update',
  EXPORT = 'export',
  IMPORT = 'import'
}

export enum RequestType {
  GENERAL = 'general',
  MEMBERSHIP = 'membership',
  DOCUMENT = 'document',
  SUPPORT = 'support',
  CUSTOM = 'custom'
}

// ==================== Base Interfaces ====================

export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface Auditable {
  createdBy: string;
  updatedBy?: string;
}

export interface Versionable {
  version: number;
  previousVersions?: string[];
}

// ==================== User Types ====================

export interface User extends BaseDocument, SoftDeletable {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  familyId?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  profile: UserProfile;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  approvalAlerts: boolean;
  familyUpdates: boolean;
}

export interface UserProfile {
  bio?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: Address;
  socialLinks?: SocialLinks;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

// ==================== Family Types ====================

export interface Family extends BaseDocument, SoftDeletable, Auditable {
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  origin?: string;
  description?: string;
  motto?: string;
  foundedYear?: number;
  contactDetails: ContactDetails;
  socialLinks?: SocialLinks;
  status: FamilyStatus;
  visibility: VisibilityStatus;
  settings: FamilySettings;
  stats: FamilyStats;
}

export interface ContactDetails {
  email?: string;
  phone?: string;
  address?: Address;
}

export interface FamilySettings {
  allowMemberInvites: boolean;
  requireApprovalForContent: boolean;
  enabledModules: EntityType[];
  requestTypes: RequestTypeConfig[];
  defaultContentVisibility: VisibilityStatus;
  showFemalesInTree: boolean;
}

export interface RequestTypeConfig {
  type: RequestType;
  name: string;
  enabled: boolean;
  fields: CustomField[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  options?: string[];
}

export interface FamilyStats {
  memberCount: number;
  contentCount: number;
  pendingApprovals: number;
}

// ==================== Family Member Types ====================

export interface FamilyMember extends BaseDocument, SoftDeletable, Auditable {
  familyId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  gender: Gender;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  isDeceased: boolean;
  photo?: string;
  bio?: string;
  parentId?: string;
  spouseId?: string;
  childrenIds: string[];
  generation: number;
  lineage: string[];
  position: TreePosition;
  contactDetails?: ContactDetails;
  achievements?: string[];
  role: 'admin' | 'member' | 'guest';
  joinedAt?: Date;
  status: ContentStatus;
}

export interface TreePosition {
  x: number;
  y: number;
  level: number;
}

// ==================== Family Tree Version Types ====================

export interface FamilyTreeVersion extends BaseDocument, Auditable {
  familyId: string;
  version: number;
  snapshot: FamilyTreeSnapshot;
  changeDescription: string;
  changedBy: string;
  isActive: boolean;
}

export interface FamilyTreeSnapshot {
  members: FamilyMember[];
  structure: TreeNode[];
  metadata: TreeMetadata;
}

export interface TreeNode {
  id: string;
  memberId: string;
  parentId?: string;
  spouseId?: string;
  childrenIds: string[];
  position: TreePosition;
}

export interface TreeMetadata {
  totalMembers: number;
  totalGenerations: number;
  rootMemberId: string;
  lastUpdated: Date;
}

// ==================== Content Entity Types ====================

export interface BaseEntity extends BaseDocument, SoftDeletable, Auditable, Versionable {
  familyId: string;
  title: string;
  description?: string;
  status: ContentStatus;
  visibility: VisibilityStatus;
  entityType: EntityType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Activity extends BaseEntity {
  entityType: EntityType.ACTIVITY;
  startDate: Date;
  endDate?: Date;
  location?: LocationInfo;
  participants?: string[];
  media?: MediaReference[];
  isRecurring: boolean;
  recurrenceRule?: string;
}

export interface Ceremony extends BaseEntity {
  entityType: EntityType.CEREMONY;
  date: Date;
  ceremonyType: string;
  location?: LocationInfo;
  participants?: string[];
  media?: MediaReference[];
  traditions?: string[];
}

export interface Request extends BaseEntity {
  entityType: EntityType.REQUEST;
  requestType: RequestType;
  requesterId: string;
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  customFields?: Record<string, unknown>;
  resolution?: string;
  resolvedAt?: Date;
}

export interface PhotoFolder extends BaseEntity {
  entityType: EntityType.PHOTO_FOLDER;
  parentFolderId?: string;
  coverPhotoId?: string;
  photoCount: number;
}

export interface Photo extends BaseEntity {
  entityType: EntityType.PHOTO;
  folderId?: string;
  url: string;
  thumbnailUrl?: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  dimensions?: { width: number; height: number };
  takenAt?: Date;
  location?: LocationInfo;
  taggedMembers?: string[];
}

export interface News extends BaseEntity {
  entityType: EntityType.NEWS;
  content: string;
  coverImage?: string;
  publishedAt?: Date;
  isPinned: boolean;
  viewCount: number;
}

export interface AboutMe extends BaseEntity {
  entityType: EntityType.ABOUT_ME;
  memberId: string;
  content: string;
  highlights?: string[];
  media?: MediaReference[];
}

export interface Achievement extends BaseEntity {
  entityType: EntityType.ACHIEVEMENT;
  memberId?: string;
  achievementType: string;
  date: Date;
  media?: MediaReference[];
  recognition?: string;
}

export interface Offer extends BaseEntity {
  entityType: EntityType.OFFER;
  offerType: 'service' | 'product' | 'skill' | 'other';
  offeredBy: string;
  expiresAt?: Date;
  terms?: string;
  contactInfo?: ContactDetails;
}

export interface FamilyLocation extends BaseEntity {
  entityType: EntityType.LOCATION;
  location: LocationInfo;
  locationType: 'home' | 'business' | 'landmark' | 'historical' | 'other';
  isHeadquarters: boolean;
}

export interface Procedure extends BaseEntity {
  entityType: EntityType.PROCEDURE;
  procedureType: string;
  steps: ProcedureStep[];
  applicableTo?: string[];
}

export interface ProcedureStep {
  order: number;
  title: string;
  description: string;
  isRequired: boolean;
}

// ==================== Location Types ====================

export interface LocationInfo {
  name?: string;
  address?: Address;
  coordinates?: Coordinates;
  placeId?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ==================== Media Types ====================

export interface MediaReference {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'document' | 'audio';
  name: string;
  size: number;
  mimeType: string;
}

export interface Media extends BaseDocument, SoftDeletable, Auditable {
  familyId: string;
  entityId?: string;
  entityType?: EntityType;
  url: string;
  thumbnailUrl?: string;
  blobPath: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
}

// ==================== Event Types ====================

export interface FamilyEvent extends BaseEntity {
  entityType: EntityType.EVENT;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: LocationInfo;
  organizers: string[];
  attendees: EventAttendee[];
  linkedEntityId?: string;
  linkedEntityType?: EntityType;
  reminders?: EventReminder[];
  color?: string;
}

export interface EventAttendee {
  memberId: string;
  status: 'pending' | 'accepted' | 'declined' | 'maybe';
  respondedAt?: Date;
}

export interface EventReminder {
  type: 'email' | 'push';
  minutes: number;
}

// ==================== Approval Types ====================

export interface Approval extends BaseDocument {
  familyId: string;
  entityId: string;
  entityType: EntityType | 'family' | 'member';
  requesterId: string;
  reviewerId?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  comments?: string;
  changes?: ApprovalChange[];
}

export interface ApprovalChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// ==================== Audit Log Types ====================

export interface AuditLog extends BaseDocument {
  familyId?: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  entityId?: string;
  entityType?: string;
  targetUserId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ==================== Soft Delete Archive Types ====================

export interface SoftDeleteArchive extends BaseDocument {
  originalCollection: string;
  originalId: string;
  familyId?: string;
  data: Record<string, unknown>;
  deletedBy: string;
  reason?: string;
  expiresAt?: Date;
}

// ==================== API Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  entityType?: EntityType;
  status?: ContentStatus;
  visibility?: VisibilityStatus;
  dateFrom?: string;
  dateTo?: string;
  contributor?: string;
}

// ==================== Auth Types ====================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  familyId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  user: SafeUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface SafeUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  familyId?: string;
  preferences: UserPreferences;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
  members: StatCard;
  activities: StatCard;
  pendingApprovals: StatCard;
  contentItems: StatCard;
  recentActivity: ActivityItem[];
  contentGrowth: ChartData[];
  engagementTrends: ChartData[];
}

export interface StatCard {
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
}

export interface ActivityItem {
  id: string;
  type: AuditAction;
  actor: string;
  target: string;
  timestamp: Date;
}

export interface ChartData {
  label: string;
  value: number;
  date?: Date;
}

// ==================== Export Types ====================

export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg' | 'json' | 'csv';
  includePrivate: boolean;
  dateRange?: { from: Date; to: Date };
  entities?: EntityType[];
}

export interface ExportResult {
  url: string;
  fileName: string;
  size: number;
  expiresAt: Date;
}

// ==================== Import Types ====================

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}
