'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Badge, Loading, EmptyState, Avatar } from '@/components/ui';
import {
  Plus,
  Activity,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { ContentStatus, VisibilityStatus, UserRole } from '@/types';

interface FamilyActivity {
  _id: string;
  title: string;
  description?: string;
  type: 'sport' | 'hobby' | 'travel' | 'education' | 'volunteer' | 'other';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  location?: string;
  participants?: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  }[];
  organizer: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  contentStatus: ContentStatus;
  createdAt: string;
}

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
type TypeFilter = 'all' | 'sport' | 'hobby' | 'travel' | 'education' | 'volunteer' | 'other';

const TYPE_COLORS: Record<string, string> = {
  sport: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  hobby: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  travel: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  education: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  volunteer: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const STATUS_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  planned: { color: 'text-blue-600 dark:text-blue-400', icon: Clock },
  in_progress: { color: 'text-amber-600 dark:text-amber-400', icon: AlertCircle },
  completed: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle },
  cancelled: { color: 'text-red-600 dark:text-red-400', icon: XCircle },
};

export default function ActivitiesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<FamilyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchActivities();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      // Simulated data for demo
      const mockActivities: FamilyActivity[] = [
        {
          _id: '1',
          title: 'Annual Family Hiking Trip',
          description: 'Join us for our yearly hiking adventure in the mountains. All skill levels welcome!',
          type: 'sport',
          status: 'planned',
          startDate: new Date(Date.now() + 604800000).toISOString(),
          location: 'Rocky Mountain National Park',
          participants: [
            { _id: '1', firstName: 'John', lastName: 'Johnson' },
            { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
            { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
          ],
          organizer: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          contentStatus: ContentStatus.APPROVED,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          title: 'Family Cooking Class',
          description: 'Learn to make Grandma\'s famous pasta recipe together.',
          type: 'hobby',
          status: 'in_progress',
          startDate: new Date().toISOString(),
          location: 'Johnson Family Home',
          participants: [
            { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
            { _id: '4', firstName: 'Lisa', lastName: 'Johnson' },
          ],
          organizer: { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
          contentStatus: ContentStatus.APPROVED,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: '3',
          title: 'Summer Vacation to Hawaii',
          description: 'Family trip to explore the beautiful islands of Hawaii.',
          type: 'travel',
          status: 'completed',
          startDate: new Date(Date.now() - 2592000000).toISOString(),
          endDate: new Date(Date.now() - 2160000000).toISOString(),
          location: 'Maui, Hawaii',
          participants: [
            { _id: '1', firstName: 'John', lastName: 'Johnson' },
            { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
            { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
            { _id: '4', firstName: 'Lisa', lastName: 'Johnson' },
          ],
          organizer: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          contentStatus: ContentStatus.APPROVED,
          createdAt: new Date(Date.now() - 3024000000).toISOString(),
        },
        {
          _id: '4',
          title: 'Family Genealogy Research',
          description: 'Working together to uncover our family history and build our tree.',
          type: 'education',
          status: 'in_progress',
          participants: [
            { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
          ],
          organizer: { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
          contentStatus: ContentStatus.APPROVED,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          _id: '5',
          title: 'Community Food Drive',
          description: 'Annual volunteer effort to collect food for local shelters.',
          type: 'volunteer',
          status: 'planned',
          startDate: new Date(Date.now() + 1209600000).toISOString(),
          location: 'Downtown Community Center',
          participants: [
            { _id: '1', firstName: 'John', lastName: 'Johnson' },
            { _id: '4', firstName: 'Lisa', lastName: 'Johnson' },
          ],
          organizer: { _id: '4', firstName: 'Lisa', lastName: 'Johnson' },
          contentStatus: ContentStatus.APPROVED,
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.location?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, statusFilter, typeFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: activities.length,
    planned: activities.filter(a => a.status === 'planned').length,
    inProgress: activities.filter(a => a.status === 'in_progress').length,
    completed: activities.filter(a => a.status === 'completed').length,
  }), [activities]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      <Sidebar userRole={user?.role} />

      <main className="lg:pl-64 pt-16 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Family Activities
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track and organize family activities and adventures
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Activity
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.planned}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Planned</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="sport">Sport</option>
                  <option value="hobby">Hobby</option>
                  <option value="travel">Travel</option>
                  <option value="education">Education</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Activities Found"
              description={searchQuery ? 'Try adjusting your search or filters.' : 'Create your first family activity to get started.'}
              action={
                !searchQuery && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Activity
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredActivities.map((activity) => (
                <ActivityCard key={activity._id} activity={activity} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
      <div className="hidden lg:block">
        <MinimalFooter />
      </div>
    </div>
  );
}

interface ActivityCardProps {
  activity: FamilyActivity;
  formatDate: (date?: string) => string | null;
}

function ActivityCard({ activity, formatDate }: ActivityCardProps) {
  const statusStyle = STATUS_STYLES[activity.status];
  const StatusIcon = statusStyle?.icon || Clock;

  return (
    <Card className="p-5 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={`${TYPE_COLORS[activity.type]} capitalize text-xs`}>
            {activity.type}
          </Badge>
          <span className={`inline-flex items-center gap-1 text-xs ${statusStyle.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{activity.status.replace('_', ' ')}</span>
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {activity.title}
      </h3>

      {activity.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
          {activity.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        {activity.startDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(activity.startDate)}
              {activity.endDate && ` - ${formatDate(activity.endDate)}`}
            </span>
          </div>
        )}
        {activity.location && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{activity.location}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      {activity.participants && activity.participants.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div className="flex -space-x-2">
              {activity.participants.slice(0, 4).map((p) => (
                <Avatar
                  key={p._id}
                  src={p.profileImage}
                  name={`${p.firstName} ${p.lastName}`}
                  size="xs"
                  className="ring-2 ring-white dark:ring-gray-900"
                />
              ))}
              {activity.participants.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 ring-2 ring-white dark:ring-gray-900">
                  +{activity.participants.length - 4}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activity.participants.length} participant{activity.participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
