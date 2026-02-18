'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Badge, Loading, Modal, Input, Textarea } from '@/components/ui';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

// Types
interface EntityPrivilege {
  entity: string;
  privileges: Record<string, string>;
}

interface SpecialPermissions {
  canManageUsers?: boolean;
  canManageFamily?: boolean;
  canAccessAdmin?: boolean;
  canApproveContent?: boolean;
  canManageSettings?: boolean;
  canViewReports?: boolean;
  canSendNotifications?: boolean;
  canManageSecurityRoles?: boolean;
  canExportData?: boolean;
  canImportData?: boolean;
  canManageBackups?: boolean;
  canAccessAuditLog?: boolean;
  canImpersonateUsers?: boolean;
}

interface SecurityRole {
  _id: string;
  name: string;
  description?: string;
  entityPrivileges: EntityPrivilege[];
  specialPermissions: SpecialPermissions;
  isSystemRole: boolean;
  isDefault: boolean;
  familyId?: string;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

const ENTITY_TYPES = [
  'member', 'family', 'gallery', 'news', 'event', 'document',
  'service', 'submission', 'settings', 'user', 'securityRole'
] as const;

const PRIVILEGE_TYPES = [
  'create', 'read', 'write', 'delete', 'assign', 'share', 'approve', 'export', 'import'
] as const;

const ACCESS_LEVELS = ['none', 'user', 'family', 'global'] as const;

const SPECIAL_PERMISSIONS = [
  { key: 'canManageUsers', label: 'Manage Users', description: 'Add, edit, or remove users' },
  { key: 'canManageFamily', label: 'Manage Family', description: 'Edit family settings and structure' },
  { key: 'canAccessAdmin', label: 'Access Admin Panel', description: 'Access administrative features' },
  { key: 'canApproveContent', label: 'Approve Content', description: 'Approve pending submissions' },
  { key: 'canManageSettings', label: 'Manage Settings', description: 'Configure system settings' },
  { key: 'canViewReports', label: 'View Reports', description: 'Access analytics and reports' },
  { key: 'canSendNotifications', label: 'Send Notifications', description: 'Send bulk notifications' },
  { key: 'canManageSecurityRoles', label: 'Manage Security Roles', description: 'Create and modify security roles' },
  { key: 'canExportData', label: 'Export Data', description: 'Export family data' },
  { key: 'canImportData', label: 'Import Data', description: 'Import data into the system' },
  { key: 'canManageBackups', label: 'Manage Backups', description: 'Create and restore backups' },
  { key: 'canAccessAuditLog', label: 'Access Audit Log', description: 'View activity logs' },
  { key: 'canImpersonateUsers', label: 'Impersonate Users', description: 'Act as another user' },
];

const getAccessLevelColor = (level: string) => {
  switch (level) {
    case 'global': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'family': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'user': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'none': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  }
};

export function SecurityRolesManager() {
  const [roles, setRoles] = useState<SecurityRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SecurityRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityPrivileges: [] as EntityPrivilege[],
    specialPermissions: {} as SpecialPermissions,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/security-roles');
      const data = await response.json();

      if (data.success) {
        setRoles(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch security roles');
      }
    } catch (err) {
      setError('Failed to fetch security roles');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      entityPrivileges: ENTITY_TYPES.map(entity => ({
        entity,
        privileges: PRIVILEGE_TYPES.reduce((acc, priv) => ({ ...acc, [priv]: 'none' }), {}),
      })),
      specialPermissions: {},
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role: SecurityRole) => {
    setEditingRole(role);

    // Fill in missing entities
    const existingEntities = role.entityPrivileges.map(ep => ep.entity);
    const missingEntities = ENTITY_TYPES.filter(e => !existingEntities.includes(e));

    const completeEntityPrivileges = [
      ...role.entityPrivileges,
      ...missingEntities.map(entity => ({
        entity,
        privileges: PRIVILEGE_TYPES.reduce((acc, priv) => ({ ...acc, [priv]: 'none' }), {}),
      })),
    ];

    setFormData({
      name: role.name,
      description: role.description || '',
      entityPrivileges: completeEntityPrivileges,
      specialPermissions: { ...role.specialPermissions },
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const url = editingRole
        ? `/api/security-roles/${editingRole._id}`
        : '/api/security-roles';

      const method = editingRole ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchRoles();
      } else {
        setError(data.error || 'Failed to save security role');
      }
    } catch (err) {
      setError('Failed to save security role');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this security role?')) {
      return;
    }

    try {
      const response = await fetch(`/api/security-roles/${roleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchRoles();
      } else {
        setError(data.error || 'Failed to delete security role');
      }
    } catch (err) {
      setError('Failed to delete security role');
      console.error(err);
    }
  };

  const toggleRoleExpand = (roleId: string) => {
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const updateEntityPrivilege = (entityIndex: number, privilegeType: string, accessLevel: string) => {
    setFormData(prev => {
      const newPrivileges = [...prev.entityPrivileges];
      newPrivileges[entityIndex] = {
        ...newPrivileges[entityIndex],
        privileges: {
          ...newPrivileges[entityIndex].privileges,
          [privilegeType]: accessLevel,
        },
      };
      return { ...prev, entityPrivileges: newPrivileges };
    });
  };

  const toggleSpecialPermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      specialPermissions: {
        ...prev.specialPermissions,
        [key]: !prev.specialPermissions[key as keyof SpecialPermissions],
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Security Roles
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage access control and permissions
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role._id} className="overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
              onClick={() => toggleRoleExpand(role._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${role.isSystemRole ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                    <Shield className={`w-5 h-5 ${role.isSystemRole ? 'text-purple-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {role.name}
                      </h3>
                      {role.isSystemRole && (
                        <Badge variant="secondary" size="sm">System</Badge>
                      )}
                      {role.isDefault && (
                        <Badge variant="success" size="sm">Default</Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!role.isSystemRole && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(role);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(role._id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                  {expandedRole === role._id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedRole === role._id && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                {/* Entity Privileges */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Entity Privileges
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Entity</th>
                          {PRIVILEGE_TYPES.map(priv => (
                            <th key={priv} className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-center capitalize">
                              {priv}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {role.entityPrivileges.map((ep) => (
                          <tr key={ep.entity} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="py-2 font-medium text-gray-900 dark:text-white capitalize">
                              {ep.entity}
                            </td>
                            {PRIVILEGE_TYPES.map(priv => (
                              <td key={priv} className="py-2 text-center">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded ${getAccessLevelColor(ep.privileges[priv] || 'none')}`}>
                                  {ep.privileges[priv] || 'none'}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Special Permissions */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Special Permissions
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {SPECIAL_PERMISSIONS.map(({ key, label }) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                          role.specialPermissions[key as keyof SpecialPermissions]
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {role.specialPermissions[key as keyof SpecialPermissions] ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {roles.length === 0 && (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No Security Roles
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Create your first security role to manage access control.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRole ? 'Edit Security Role' : 'Create Security Role'}
          size="xl"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-4">
              <Input
                label="Role Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name"
                required
              />
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this role's purpose"
                rows={2}
              />
            </div>

            {/* Entity Privileges */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Entity Privileges
              </h4>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Entity</th>
                      {PRIVILEGE_TYPES.map(priv => (
                        <th key={priv} className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400 text-center capitalize text-xs">
                          {priv}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.entityPrivileges.map((ep, entityIndex) => (
                      <tr key={ep.entity}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white capitalize whitespace-nowrap">
                          {ep.entity}
                        </td>
                        {PRIVILEGE_TYPES.map(priv => (
                          <td key={priv} className="px-1 py-2 text-center">
                            <select
                              value={ep.privileges[priv] || 'none'}
                              onChange={(e) => updateEntityPrivilege(entityIndex, priv, e.target.value)}
                              className="text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              {ACCESS_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Access levels: none (no access), user (own records), family (family records), global (all records)
              </p>
            </div>

            {/* Special Permissions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Special Permissions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SPECIAL_PERMISSIONS.map(({ key, label, description }) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      formData.specialPermissions[key as keyof SpecialPermissions]
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.specialPermissions[key as keyof SpecialPermissions] || false}
                      onChange={() => toggleSpecialPermission(key)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingRole ? 'Update Role' : 'Create Role'}
                </>
              )}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
