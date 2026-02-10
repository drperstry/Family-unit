'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import { Card, CardHeader, Button, Badge, PageLoading, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { UserRole, AuditAction } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardStats {
  members: { value: number; change: number; changeType: string };
  content: { value: number; change: number; changeType: string };
  pendingApprovals: { value: number };
  upcomingEvents: { value: number };
}

interface ActivityItem {
  id: string;
  action: AuditAction;
  actor: { firstName: string; lastName: string; avatar?: string };
  entityType: string;
  timestamp: string;
}

interface ChartData {
  label: string;
  value: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [contentByType, setContentByType] = useState<ChartData[]>([]);
  const [contentGrowth, setContentGrowth] = useState<ChartData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ title: string; startDate: string }[]>([]);

  const isAdmin = user?.role === UserRole.FAMILY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard?familyId=${user?.familyId}`);
      const data = await res.json();

      if (data.success) {
        setStats(data.data.stats);
        setRecentActivity(data.data.recentActivity || []);
        setContentByType(data.data.charts?.contentByType || []);
        setContentGrowth(data.data.charts?.contentGrowth || []);
        setUpcomingEvents(data.data.upcomingEvents || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.familyId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && !isAdmin) {
      router.push('/family');
      return;
    }

    if (user?.familyId) {
      fetchDashboardData();
    }
  }, [user, authLoading, isAdmin, router, fetchDashboardData]);

  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];

  const formatAction = (action: AuditAction) => {
    const actionMap: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      approve: 'Approved',
      reject: 'Rejected',
      member_add: 'Added member',
      tree_update: 'Updated tree',
    };
    return actionMap[action] || action;
  };

  if (authLoading || isLoading) {
    return <PageLoading message="Loading dashboard..." />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={user} />

      <div className="flex">
        <Sidebar userRole={user.role} pendingApprovals={stats?.pendingApprovals.value} />

        <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Overview of your family activity
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card variant="elevated" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.members.value || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                {stats?.members.change !== undefined && (
                  <div className="flex items-center gap-1 mt-2">
                    {stats.members.changeType === 'increase' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${stats.members.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                      {stats.members.change}% this month
                    </span>
                  </div>
                )}
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Content</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.content.value || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                {stats?.content.change !== undefined && (
                  <div className="flex items-center gap-1 mt-2">
                    {stats.content.changeType === 'increase' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${stats.content.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                      {stats.content.change}% this month
                    </span>
                  </div>
                )}
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.pendingApprovals.value || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <Link href="/dashboard/approvals" className="flex items-center gap-1 mt-2 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                  Review <ArrowRight className="w-3 h-3" />
                </Link>
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Events</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.upcomingEvents.value || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Next 30 days
                </p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Content Growth Chart */}
              <Card variant="elevated" padding="md">
                <CardHeader title="Content Growth" subtitle="Last 6 months" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contentGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Content by Type Chart */}
              <Card variant="elevated" padding="md">
                <CardHeader title="Content by Type" subtitle="Distribution" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="label"
                      >
                        {contentByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {contentByType.map((item, index) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card variant="elevated" padding="md">
                <CardHeader
                  title="Recent Activity"
                  action={
                    <Link href="/dashboard/audit">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  }
                />
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No recent activity
                    </p>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4">
                        <Avatar
                          src={activity.actor?.avatar}
                          name={`${activity.actor?.firstName || ''} ${activity.actor?.lastName || ''}`}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            <span className="font-medium">
                              {activity.actor?.firstName} {activity.actor?.lastName}
                            </span>{' '}
                            {formatAction(activity.action)}{' '}
                            <span className="text-gray-500 dark:text-gray-400">
                              {activity.entityType}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Upcoming Events */}
              <Card variant="elevated" padding="md">
                <CardHeader
                  title="Upcoming Events"
                  action={
                    <Link href="/family/events">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  }
                />
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No upcoming events
                    </p>
                  ) : (
                    upcomingEvents.slice(0, 5).map((event, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex flex-col items-center justify-center">
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {new Date(event.startDate).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(event.startDate).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
