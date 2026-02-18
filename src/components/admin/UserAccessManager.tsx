'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Badge, Loading, Modal, Avatar } from '@/components/ui';
import {
  Users,
  Search,
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Save,
  UserCheck,
  Settings,
} from 'lucide-react';
import { UserRole } from '@/types';

interface UserWithPermissions {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  familyId?: string;
  familyName?: string;
  avatar?: string;
  securityRole?: {
    _id: string;
    name: string;
    description?: string;
  };
  customPermissions?: Array<{
    permission: string;
    granted: boolean;
  }>;
}

interface SecurityRole {
  _id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
}

const COMMON_PERMISSIONS = [
  { key: 'member:create', label: 'Create Members' },
  { key: 'member:read', label: 'View Members' },
  { key: 'member:write', label: 'Edit Members' },
  { key: 'member:delete', label: 'Delete Members' },
  { key: 'gallery:create', label: 'Upload Photos' },
  { key: 'gallery:delete', label: 'Delete Photos' },
  { key: 'news:create', label: 'Create News' },
  { key: 'news:approve', label: 'Approve News' },
  { key: 'event:create', label: 'Create Events' },
  { key: 'event:approve', label: 'Approve Events' },
  { key: 'service:create', label: 'Create Services' },
  { key: 'submission:approve', label: 'Approve Submissions' },
  { key: 'special:canManageUsers', label: 'Manage Users' },
  { key: 'special:canApproveContent', label: 'Approve Content' },
  { key: 'special:canManageSettings', label: 'Manage Settings' },
  { key: 'special:canViewReports', label: 'View Reports' },
  { key: 'special:canExportData', label: 'Export Data' },
];

export function UserAccessManager() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [roles, setRoles] = useState<SecurityRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<Array<{ permission: string; granted: boolean }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users?limit=100'),
        fetch('/api/security-roles'),
      ]);

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      if (usersData.success) {
        setUsers(usersData.data || []);
      }

      if (rolesData.success) {
        setRoles(rolesData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openUserModal = async (user: UserWithPermissions) => {
    setSelectedUser(user);
    setSelectedRoleId(user.securityRole?._id || '');

    // Fetch user's permissions
    try {
      const response = await fetch(`/api/users/${user._id}/permissions`);
      const data = await response.json();
      if (data.success) {
        setCustomPermissions(data.data.customPermissions || []);
      } else {
        setCustomPermissions(user.customPermissions || []);
      }
    } catch (err) {
      setCustomPermissions(user.customPermissions || []);
    }

    setIsModalOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);

      if (selectedRoleId) {
        // Assign new role
        const response = await fetch(`/api/users/${selectedUser._id}/security-role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ securityRoleId: selectedRoleId }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to assign role');
        }
      } else if (selectedUser.securityRole?._id) {
        // Remove role
        const response = await fetch(`/api/users/${selectedUser._id}/security-role`, {
          method: 'DELETE',
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to remove role');
        }
      }

      // Update custom permissions
      const permResponse = await fetch(`/api/users/${selectedUser._id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPermissions }),
      });

      const permData = await permResponse.json();
      if (!permData.success) {
        throw new Error(permData.error || 'Failed to update permissions');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCustomPermission = (permission: string) => {
    const existingIndex = customPermissions.findIndex(p => p.permission === permission);

    if (existingIndex >= 0) {
      const existing = customPermissions[existingIndex];
      if (existing.granted) {
        // Toggle to denied
        setCustomPermissions(prev =>
          prev.map((p, i) => i === existingIndex ? { ...p, granted: false } : p)
        );
      } else {
        // Remove the permission (back to role default)
        setCustomPermissions(prev => prev.filter((_, i) => i !== existingIndex));
      }
    } else {
      // Add as granted
      setCustomPermissions(prev => [...prev, { permission, granted: true }]);
    }
  };

  const getPermissionState = (permission: string): 'granted' | 'denied' | 'default' => {
    const customPerm = customPermissions.find(p => p.permission === permission);
    if (customPerm) {
      return customPerm.granted ? 'granted' : 'denied';
    }
    return 'default';
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

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
            User Access Control
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage user permissions and security roles
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatar} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <Badge variant="secondary" size="sm" className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.securityRole ? (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Shield className="w-3 h-3" />
                        {user.securityRole.name}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No security role assigned</span>
                    )}
                    {user.customPermissions && user.customPermissions.length > 0 && (
                      <Badge variant="warning" size="sm">
                        {user.customPermissions.length} custom permissions
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openUserModal(user)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Manage Access
              </Button>
            </div>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No Users Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'No users to manage'}
            </p>
          </Card>
        )}
      </div>

      {/* User Access Modal */}
      {isModalOpen && selectedUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Manage Access - ${selectedUser.firstName} ${selectedUser.lastName}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Avatar
                name={`${selectedUser.firstName} ${selectedUser.lastName}`}
                src={selectedUser.avatar}
                size="lg"
              />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUser.email}
                </p>
                <Badge variant="secondary" size="sm" className="capitalize mt-1">
                  {selectedUser.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Security Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Security Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <option value="">No security role (use default permissions)</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name} {role.isSystemRole ? '(System)' : ''}
                  </option>
                ))}
              </select>
              {selectedRoleId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {roles.find(r => r._id === selectedRoleId)?.description}
                </p>
              )}
            </div>

            {/* Custom Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Permission Overrides
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Override specific permissions for this user. Click once to grant, twice to deny, third time to reset to role default.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {COMMON_PERMISSIONS.map(({ key, label }) => {
                  const state = getPermissionState(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCustomPermission(key)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        state === 'granted'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : state === 'denied'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {state === 'granted' && <Check className="w-4 h-4 text-green-500" />}
                      {state === 'denied' && <X className="w-4 h-4 text-red-500" />}
                      {state === 'default' && <div className="w-4 h-4" />}
                      <span className="text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
