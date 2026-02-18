import { SecurityRole, SecurityRoleDocument, AccessLevel, PrivilegeType, EntityType, ENTITY_TYPES } from '@/models/SecurityRole';
import { User } from '@/models/User';
import { Types } from 'mongoose';

// Special permission keys for type safety
type SpecialPermissionKey =
  | 'canManageRoles'
  | 'canManageUsers'
  | 'canManageFamily'
  | 'canViewAuditLogs'
  | 'canExportAll'
  | 'canImportData'
  | 'canManageIntegrations'
  | 'canAccessAdmin'
  | 'canApproveContent'
  | 'canManageSettings'
  | 'canSendNotifications'
  | 'canManageBilling';

export interface PermissionContext {
  userId: string;
  familyId?: string;
  userRole?: string;
  securityRoleId?: string;
  customPermissions?: Array<{ permission: string; granted: boolean }>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  accessLevel?: AccessLevel;
}

/**
 * Check if a user has a specific privilege on an entity type
 */
export async function checkPrivilege(
  context: PermissionContext,
  entityType: EntityType,
  privilegeType: PrivilegeType,
  targetOwnerId?: string,
  targetFamilyId?: string
): Promise<PermissionCheckResult> {
  // System admins have full access
  if (context.userRole === 'system_admin') {
    return { allowed: true, reason: 'System administrator', accessLevel: 'global' };
  }

  // Check custom permission overrides first
  if (context.customPermissions) {
    const permissionKey = `${entityType}:${privilegeType}`;
    const customPerm = context.customPermissions.find(p => p.permission === permissionKey);
    if (customPerm) {
      return {
        allowed: customPerm.granted,
        reason: customPerm.granted ? 'Custom permission granted' : 'Custom permission denied',
      };
    }
  }

  // Get user's security role
  if (!context.securityRoleId) {
    // No security role assigned, use default based on user role
    if (context.userRole === 'family_admin') {
      return { allowed: true, reason: 'Family administrator', accessLevel: 'family' };
    }
    return { allowed: false, reason: 'No security role assigned' };
  }

  const securityRole = await SecurityRole.findById(context.securityRoleId);
  if (!securityRole) {
    return { allowed: false, reason: 'Security role not found' };
  }

  // Find the entity privileges
  const entityPrivilege = securityRole.entityPrivileges.find(ep => ep.entity === entityType);
  if (!entityPrivilege) {
    return { allowed: false, reason: 'No privileges defined for entity type' };
  }

  const accessLevel = entityPrivilege.privileges[privilegeType];

  // Check access based on level
  switch (accessLevel) {
    case 'none':
      return { allowed: false, reason: 'No access', accessLevel };

    case 'user':
      // Only own records
      if (targetOwnerId && targetOwnerId === context.userId) {
        return { allowed: true, reason: 'Owner access', accessLevel };
      }
      return { allowed: false, reason: 'Not owner of record', accessLevel };

    case 'family':
      // All records in same family
      if (targetFamilyId && targetFamilyId === context.familyId) {
        return { allowed: true, reason: 'Family access', accessLevel };
      }
      // Also allow if user owns the record
      if (targetOwnerId && targetOwnerId === context.userId) {
        return { allowed: true, reason: 'Owner access', accessLevel };
      }
      return { allowed: false, reason: 'Not in same family', accessLevel };

    case 'global':
      return { allowed: true, reason: 'Global access', accessLevel };

    default:
      return { allowed: false, reason: 'Unknown access level' };
  }
}

/**
 * Check if user has a special permission
 */
export async function checkSpecialPermission(
  context: PermissionContext,
  permission: SpecialPermissionKey
): Promise<boolean> {
  // System admins have all special permissions
  if (context.userRole === 'system_admin') {
    return true;
  }

  // Check custom permission overrides
  if (context.customPermissions) {
    const customPerm = context.customPermissions.find(p => p.permission === `special:${String(permission)}`);
    if (customPerm) {
      return customPerm.granted;
    }
  }

  if (!context.securityRoleId) {
    // Default permissions based on user role
    if (context.userRole === 'family_admin') {
      const familyAdminPermissions: SpecialPermissionKey[] = [
        'canManageUsers',
        'canManageFamily',
        'canAccessAdmin',
        'canApproveContent',
        'canManageSettings',
        'canSendNotifications',
      ];
      return familyAdminPermissions.includes(permission);
    }
    return false;
  }

  const securityRole = await SecurityRole.findById(context.securityRoleId);
  if (!securityRole) {
    return false;
  }

  const sp = securityRole.specialPermissions as Record<string, boolean>;
  return sp[permission] || false;
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<{
  entityPrivileges: Array<{ entity: EntityType; privileges: Record<PrivilegeType, AccessLevel> }>;
  specialPermissions: Record<string, boolean>;
  customPermissions: Array<{ permission: string; granted: boolean }>;
}> {
  const user = await User.findById(userId).populate('securityRoleId');

  if (!user) {
    return {
      entityPrivileges: [],
      specialPermissions: {},
      customPermissions: [],
    };
  }

  const securityRole = user.securityRoleId as any;

  // Build entity privileges
  let entityPrivileges: Array<{ entity: EntityType; privileges: Record<PrivilegeType, AccessLevel> }> = [];

  if (securityRole?.entityPrivileges) {
    entityPrivileges = securityRole.entityPrivileges.map((ep: any) => ({
      entity: ep.entity,
      privileges: ep.privileges,
    }));
  }

  // Build special permissions
  const specialPermissions: Record<string, boolean> = {};
  if (securityRole?.specialPermissions) {
    Object.entries(securityRole.specialPermissions).forEach(([key, value]) => {
      if (key !== '_id') {
        specialPermissions[key] = value as boolean;
      }
    });
  }

  return {
    entityPrivileges,
    specialPermissions,
    customPermissions: (user as any).customPermissions || [],
  };
}

/**
 * Build permission context from user
 */
export function buildPermissionContext(user: any): PermissionContext {
  return {
    userId: user._id?.toString() || user.id,
    familyId: user.familyId?.toString(),
    userRole: user.role,
    securityRoleId: user.securityRoleId?.toString(),
    customPermissions: user.customPermissions,
  };
}

/**
 * Create a middleware-style permission checker
 */
export function requirePrivilege(
  entityType: EntityType,
  privilegeType: PrivilegeType
) {
  return async (context: PermissionContext, targetOwnerId?: string, targetFamilyId?: string) => {
    const result = await checkPrivilege(context, entityType, privilegeType, targetOwnerId, targetFamilyId);
    if (!result.allowed) {
      throw new Error(`Permission denied: ${result.reason}`);
    }
    return result;
  };
}

/**
 * Create a middleware-style special permission checker
 */
export function requireSpecialPermission(permission: string) {
  return async (context: PermissionContext) => {
    const allowed = await checkSpecialPermission(context, permission as any);
    if (!allowed) {
      throw new Error(`Permission denied: ${permission} required`);
    }
    return true;
  };
}

/**
 * Grant or revoke a custom permission for a user
 */
export async function setCustomPermission(
  userId: string,
  permission: string,
  granted: boolean
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $pull: { customPermissions: { permission } },
  });

  await User.findByIdAndUpdate(userId, {
    $push: { customPermissions: { permission, granted } },
  });
}

/**
 * Assign a security role to a user
 */
export async function assignSecurityRole(
  userId: string,
  securityRoleId: string
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    securityRoleId: new Types.ObjectId(securityRoleId),
  });
}

/**
 * Remove security role from a user
 */
export async function removeSecurityRole(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $unset: { securityRoleId: 1 },
  });
}

export { ENTITY_TYPES } from '@/models/SecurityRole';
