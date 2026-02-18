import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * CRM Dynamics-style Security Role Model
 *
 * Access Levels (similar to CRM):
 * - none: No access
 * - user: Only records owned by user
 * - family: All records in user's family
 * - global: All records (system-wide)
 *
 * Privilege Types:
 * - create: Create new records
 * - read: View records
 * - write: Update records
 * - delete: Delete records
 * - assign: Assign records to other users
 * - share: Share records with other users
 * - approve: Approve pending content
 * - export: Export data
 * - import: Import data
 */

export type AccessLevel = 'none' | 'user' | 'family' | 'global';
export type PrivilegeType = 'create' | 'read' | 'write' | 'delete' | 'assign' | 'share' | 'approve' | 'export' | 'import';

// Arrays for validation
export const ACCESS_LEVELS = ['none', 'user', 'family', 'global'] as const;
export const PRIVILEGE_TYPES = ['create', 'read', 'write', 'delete', 'assign', 'share', 'approve', 'export', 'import'] as const;

// Entity types that can have permissions
export const ENTITY_TYPES = [
  'user',
  'family',
  'family_member',
  'event',
  'news',
  'gallery',
  'photo',
  'service',
  'submission',
  'approval',
  'settings',
  'audit_log',
  'entity',
  'activity',
  'location',
  'document',
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

export interface PrivilegeConfig {
  create: AccessLevel;
  read: AccessLevel;
  write: AccessLevel;
  delete: AccessLevel;
  assign: AccessLevel;
  share: AccessLevel;
  approve: AccessLevel;
  export: AccessLevel;
  import: AccessLevel;
}

export interface EntityPrivileges {
  entity: EntityType;
  privileges: PrivilegeConfig;
}

export interface SecurityRoleDocument extends Document {
  name: string;
  description?: string;
  familyId?: Types.ObjectId; // null = system role, familyId = family-specific role
  isSystemRole: boolean;
  isDefault: boolean; // Default role for new users in a family

  // Entity-level privileges
  entityPrivileges: EntityPrivileges[];

  // Special permissions (not entity-based)
  specialPermissions: {
    canManageRoles: boolean;
    canManageUsers: boolean;
    canManageFamily: boolean;
    canViewAuditLogs: boolean;
    canExportAll: boolean;
    canImportData: boolean;
    canManageIntegrations: boolean;
    canAccessAdmin: boolean;
    canApproveContent: boolean;
    canManageSettings: boolean;
    canSendNotifications: boolean;
    canManageBilling: boolean;
  };

  // Inheritance
  parentRoleId?: Types.ObjectId;

  // Metadata
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Default privilege config
const defaultPrivileges: PrivilegeConfig = {
  create: 'none',
  read: 'none',
  write: 'none',
  delete: 'none',
  assign: 'none',
  share: 'none',
  approve: 'none',
  export: 'none',
  import: 'none',
};

const PrivilegeConfigSchema = new Schema({
  create: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  read: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  write: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  delete: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  assign: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  share: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  approve: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  export: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
  import: { type: String, enum: ['none', 'user', 'family', 'global'], default: 'none' },
}, { _id: false });

const EntityPrivilegesSchema = new Schema({
  entity: { type: String, enum: ENTITY_TYPES, required: true },
  privileges: { type: PrivilegeConfigSchema, default: () => ({ ...defaultPrivileges }) },
}, { _id: false });

const SpecialPermissionsSchema = new Schema({
  canManageRoles: { type: Boolean, default: false },
  canManageUsers: { type: Boolean, default: false },
  canManageFamily: { type: Boolean, default: false },
  canViewAuditLogs: { type: Boolean, default: false },
  canExportAll: { type: Boolean, default: false },
  canImportData: { type: Boolean, default: false },
  canManageIntegrations: { type: Boolean, default: false },
  canAccessAdmin: { type: Boolean, default: false },
  canApproveContent: { type: Boolean, default: false },
  canManageSettings: { type: Boolean, default: false },
  canSendNotifications: { type: Boolean, default: false },
  canManageBilling: { type: Boolean, default: false },
}, { _id: false });

const SecurityRoleSchema = new Schema<SecurityRoleDocument>({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    index: true,
  },
  isSystemRole: {
    type: Boolean,
    default: false,
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  entityPrivileges: [EntityPrivilegesSchema],
  specialPermissions: {
    type: SpecialPermissionsSchema,
    default: () => ({}),
  },
  parentRoleId: {
    type: Schema.Types.ObjectId,
    ref: 'SecurityRole',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
SecurityRoleSchema.index({ familyId: 1, name: 1 }, { unique: true, sparse: true });
SecurityRoleSchema.index({ isSystemRole: 1, name: 1 });
SecurityRoleSchema.index({ familyId: 1, isDefault: 1 });

// Virtual for checking if role has any admin privileges
SecurityRoleSchema.virtual('isAdminRole').get(function() {
  const sp = this.specialPermissions;
  return sp.canManageRoles || sp.canManageUsers || sp.canManageFamily || sp.canAccessAdmin;
});

// Method to check privilege for an entity
SecurityRoleSchema.methods.hasPrivilege = function(
  entityType: EntityType,
  privilegeType: PrivilegeType,
  requiredLevel: AccessLevel
): boolean {
  const entityConfig = this.entityPrivileges.find((ep: EntityPrivileges) => ep.entity === entityType);
  if (!entityConfig) return false;

  const actualLevel = entityConfig.privileges[privilegeType];

  // Access level hierarchy: none < user < family < global
  const levelOrder: Record<AccessLevel, number> = {
    none: 0,
    user: 1,
    family: 2,
    global: 3,
  };

  return levelOrder[actualLevel] >= levelOrder[requiredLevel];
};

// Method to get effective privileges (including inherited)
SecurityRoleSchema.methods.getEffectivePrivileges = async function(): Promise<EntityPrivileges[]> {
  let privileges = [...this.entityPrivileges];

  if (this.parentRoleId) {
    const parentRole = await mongoose.model('SecurityRole').findById(this.parentRoleId);
    if (parentRole) {
      const parentPrivileges = await parentRole.getEffectivePrivileges();

      // Merge: child privileges override parent
      for (const parentPriv of parentPrivileges) {
        const existingIndex = privileges.findIndex(p => p.entity === parentPriv.entity);
        if (existingIndex === -1) {
          privileges.push(parentPriv);
        }
      }
    }
  }

  return privileges;
};

// Static method to get default role for a family
SecurityRoleSchema.statics.getDefaultRole = async function(familyId: string) {
  return this.findOne({ familyId, isDefault: true });
};

// Static method to create system roles
SecurityRoleSchema.statics.createSystemRoles = async function(adminUserId: string) {
  const existingSystemRoles = await this.countDocuments({ isSystemRole: true });
  if (existingSystemRoles > 0) return;

  const systemRoles = [
    {
      name: 'System Administrator',
      description: 'Full access to all system features',
      isSystemRole: true,
      entityPrivileges: ENTITY_TYPES.map(entity => ({
        entity,
        privileges: {
          create: 'global',
          read: 'global',
          write: 'global',
          delete: 'global',
          assign: 'global',
          share: 'global',
          approve: 'global',
          export: 'global',
          import: 'global',
        },
      })),
      specialPermissions: {
        canManageRoles: true,
        canManageUsers: true,
        canManageFamily: true,
        canViewAuditLogs: true,
        canExportAll: true,
        canImportData: true,
        canManageIntegrations: true,
        canAccessAdmin: true,
        canApproveContent: true,
        canManageSettings: true,
        canSendNotifications: true,
        canManageBilling: true,
      },
      createdBy: adminUserId,
    },
    {
      name: 'Family Administrator',
      description: 'Full access to family features',
      isSystemRole: true,
      entityPrivileges: ENTITY_TYPES.map(entity => ({
        entity,
        privileges: {
          create: 'family',
          read: 'family',
          write: 'family',
          delete: 'family',
          assign: 'family',
          share: 'family',
          approve: 'family',
          export: 'family',
          import: 'family',
        },
      })),
      specialPermissions: {
        canManageRoles: true,
        canManageUsers: true,
        canManageFamily: true,
        canViewAuditLogs: true,
        canExportAll: false,
        canImportData: true,
        canManageIntegrations: false,
        canAccessAdmin: true,
        canApproveContent: true,
        canManageSettings: true,
        canSendNotifications: true,
        canManageBilling: false,
      },
      createdBy: adminUserId,
    },
    {
      name: 'Family Member',
      description: 'Standard family member access',
      isSystemRole: true,
      isDefault: true,
      entityPrivileges: ENTITY_TYPES.map(entity => ({
        entity,
        privileges: {
          create: entity === 'user' ? 'none' : 'family',
          read: 'family',
          write: 'user',
          delete: 'user',
          assign: 'none',
          share: 'family',
          approve: 'none',
          export: 'user',
          import: 'none',
        },
      })),
      specialPermissions: {
        canManageRoles: false,
        canManageUsers: false,
        canManageFamily: false,
        canViewAuditLogs: false,
        canExportAll: false,
        canImportData: false,
        canManageIntegrations: false,
        canAccessAdmin: false,
        canApproveContent: false,
        canManageSettings: false,
        canSendNotifications: false,
        canManageBilling: false,
      },
      createdBy: adminUserId,
    },
    {
      name: 'Guest',
      description: 'Read-only access to public content',
      isSystemRole: true,
      entityPrivileges: ENTITY_TYPES.map(entity => ({
        entity,
        privileges: {
          create: 'none',
          read: ['news', 'event', 'gallery'].includes(entity) ? 'family' : 'none',
          write: 'none',
          delete: 'none',
          assign: 'none',
          share: 'none',
          approve: 'none',
          export: 'none',
          import: 'none',
        },
      })),
      specialPermissions: {
        canManageRoles: false,
        canManageUsers: false,
        canManageFamily: false,
        canViewAuditLogs: false,
        canExportAll: false,
        canImportData: false,
        canManageIntegrations: false,
        canAccessAdmin: false,
        canApproveContent: false,
        canManageSettings: false,
        canSendNotifications: false,
        canManageBilling: false,
      },
      createdBy: adminUserId,
    },
  ];

  return this.insertMany(systemRoles);
};

export const SecurityRole: Model<SecurityRoleDocument> =
  mongoose.models.SecurityRole || mongoose.model<SecurityRoleDocument>('SecurityRole', SecurityRoleSchema);

export default SecurityRole;
