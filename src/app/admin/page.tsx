'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout';
import { Button, Card, Badge, Loading, SimpleTabs, Avatar } from '@/components/ui';
import {
  Shield,
  Users,
  Home,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Activity,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Ban,
} from 'lucide-react';
import { UserRole, FamilyStatus, ContentStatus } from '@/types';

interface AdminStats {
  totalUsers: number;
  totalFamilies: number;
  pendingApprovals: number;
  activeUsers: number;
  newUsersThisMonth: number;
  newFamiliesThisMonth: number;
}

interface PendingApproval {
  _id: string;
  type: 'family' | 'content' | 'user';
  title: string;
  description?: string;
  requestedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'pending';
  createdAt: string;
}

interface UserRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  familyId?: string;
  familyName?: string;
  status: 'active' | 'suspended' | 'pending';
  lastLogin?: string;
  createdAt: string;
}

interface FamilyRecord {
  _id: string;
  name: string;
  status: FamilyStatus;
  memberCount: number;
  adminEmail: string;
  visibility: 'private' | 'public';
  createdAt: string;
}

export default function AdminPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalFamilies: 0,
    pendingApprovals: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    newFamiliesThisMonth: 0,
  });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== UserRole.SYSTEM_ADMIN) {
      router.push('/dashboard');
      return;
    }

    fetchAdminData();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);

      // Simulated data
      setStats({
        totalUsers: 156,
        totalFamilies: 23,
        pendingApprovals: 5,
        activeUsers: 89,
        newUsersThisMonth: 12,
        newFamiliesThisMonth: 3,
      });

      setPendingApprovals([
        {
          _id: '1',
          type: 'family',
          title: 'The Williams Family',
          description: 'Requesting to make family public',
          requestedBy: { _id: '1', firstName: 'James', lastName: 'Williams', email: 'james@example.com' },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'family',
          title: 'The Chen Family',
          description: 'New family registration',
          requestedBy: { _id: '2', firstName: 'Michelle', lastName: 'Chen', email: 'michelle@example.com' },
          status: 'pending',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: '3',
          type: 'content',
          title: 'Historical Photo Collection',
          description: 'Request to feature on public gallery',
          requestedBy: { _id: '3', firstName: 'Robert', lastName: 'Johnson', email: 'robert@example.com' },
          status: 'pending',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);

      setUsers([
        { _id: '1', firstName: 'John', lastName: 'Johnson', email: 'john@example.com', role: UserRole.FAMILY_ADMIN, familyId: 'f1', familyName: 'Johnson Family', status: 'active', lastLogin: new Date().toISOString(), createdAt: new Date(Date.now() - 2592000000).toISOString() },
        { _id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', role: UserRole.FAMILY_MEMBER, familyId: 'f1', familyName: 'Johnson Family', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 2592000000).toISOString() },
        { _id: '3', firstName: 'James', lastName: 'Williams', email: 'james@example.com', role: UserRole.FAMILY_ADMIN, familyId: 'f2', familyName: 'Williams Family', status: 'active', lastLogin: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 1296000000).toISOString() },
        { _id: '4', firstName: 'Emily', lastName: 'Davis', email: 'emily@example.com', role: UserRole.GUEST, status: 'pending', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { _id: '5', firstName: 'Michael', lastName: 'Brown', email: 'michael@example.com', role: UserRole.FAMILY_MEMBER, familyId: 'f3', familyName: 'Brown Family', status: 'suspended', createdAt: new Date(Date.now() - 5184000000).toISOString() },
      ]);

      setFamilies([
        { _id: 'f1', name: 'Johnson Family', status: FamilyStatus.ACTIVE, memberCount: 12, adminEmail: 'john@example.com', visibility: 'public', createdAt: new Date(Date.now() - 2592000000).toISOString() },
        { _id: 'f2', name: 'Williams Family', status: FamilyStatus.PENDING, memberCount: 8, adminEmail: 'james@example.com', visibility: 'private', createdAt: new Date(Date.now() - 1296000000).toISOString() },
        { _id: 'f3', name: 'Brown Family', status: FamilyStatus.ACTIVE, memberCount: 5, adminEmail: 'michael@example.com', visibility: 'private', createdAt: new Date(Date.now() - 5184000000).toISOString() },
        { _id: 'f4', name: 'Chen Family', status: FamilyStatus.PENDING, memberCount: 2, adminEmail: 'michelle@example.com', visibility: 'public', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setPendingApprovals(prev => prev.filter(a => a._id !== id));
    setStats(prev => ({ ...prev, pendingApprovals: prev.pendingApprovals - 1 }));
  };

  const handleReject = async (id: string) => {
    setPendingApprovals(prev => prev.filter(a => a._id !== id));
    setStats(prev => ({ ...prev, pendingApprovals: prev.pendingApprovals - 1 }));
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u =>
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.familyName?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const filteredFamilies = useMemo(() => {
    if (!searchQuery) return families;
    const query = searchQuery.toLowerCase();
    return families.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.adminEmail.toLowerCase().includes(query)
    );
  }, [families, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                System Administration
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage users, families, and platform settings
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.totalUsers}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    +{stats.newUsersThisMonth} this month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Families</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.totalFamilies}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    +{stats.newFamiliesThisMonth} this month
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Home className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.pendingApprovals}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Requires attention
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <FileCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.activeUsers}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last 30 days
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <SimpleTabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'approvals', label: `Approvals (${stats.pendingApprovals})` },
              { id: 'users', label: 'Users' },
              { id: 'families', label: 'Families' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Approvals */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pending Approvals
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('approvals')}>
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {pendingApprovals.slice(0, 3).map((approval) => (
                    <div key={approval._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          approval.type === 'family' ? 'bg-amber-100 dark:bg-amber-900/30' :
                          approval.type === 'content' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {approval.type === 'family' ? <Home className="w-4 h-4 text-amber-600" /> :
                           approval.type === 'content' ? <FileCheck className="w-4 h-4 text-blue-600" /> :
                           <Users className="w-4 h-4 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {approval.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            by {approval.requestedBy.firstName} {approval.requestedBy.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(approval._id)}
                          className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(approval._id)}
                          className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingApprovals.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No pending approvals
                    </p>
                  )}
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {[
                    { action: 'New user registered', user: 'Emily Davis', time: '2 hours ago', icon: Users, color: 'text-green-600' },
                    { action: 'Family approved', user: 'Johnson Family', time: '5 hours ago', icon: CheckCircle, color: 'text-blue-600' },
                    { action: 'Content flagged', user: 'Anonymous', time: '1 day ago', icon: AlertTriangle, color: 'text-amber-600' },
                    { action: 'User suspended', user: 'Michael Brown', time: '2 days ago', icon: Ban, color: 'text-red-600' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${activity.color}`}>
                        <activity.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.user} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'approvals' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Approvals ({pendingApprovals.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingApprovals.map((approval) => (
                  <div key={approval._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          approval.type === 'family' ? 'bg-amber-100 dark:bg-amber-900/30' :
                          approval.type === 'content' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {approval.type === 'family' ? <Home className="w-5 h-5 text-amber-600" /> :
                           approval.type === 'content' ? <FileCheck className="w-5 h-5 text-blue-600" /> :
                           <Users className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {approval.title}
                            </h3>
                            <Badge variant="secondary" size="sm" className="capitalize">
                              {approval.type}
                            </Badge>
                          </div>
                          {approval.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {approval.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Requested by {approval.requestedBy.firstName} {approval.requestedBy.lastName} ({approval.requestedBy.email}) • {formatRelativeTime(approval.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleReject(approval._id)}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(approval._id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingApprovals.length === 0 && (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      All Caught Up!
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      No pending approvals at this time.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'users' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Family</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Login</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" size="sm" className="capitalize">
                            {u.role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {u.familyName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={u.status === 'active' ? 'success' : u.status === 'suspended' ? 'danger' : 'warning'}
                            size="sm"
                            className="capitalize"
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {u.lastLogin ? formatRelativeTime(u.lastLogin) : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'families' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search families..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Family</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Members</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Visibility</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredFamilies.map((f) => (
                      <tr key={f._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{f.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{f.adminEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={f.status === FamilyStatus.ACTIVE ? 'success' : f.status === FamilyStatus.SUSPENDED ? 'danger' : 'warning'}
                            size="sm"
                            className="capitalize"
                          >
                            {f.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {f.memberCount} members
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" size="sm" className="capitalize">
                            {f.visibility}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(f.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
