'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import { Button, Card, Badge, PageLoading, Modal, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSettings, FeatureGate } from '@/context/SettingsContext';
import {
  Megaphone,
  Plus,
  Pin,
  Heart,
  MessageCircle,
  PartyPopper,
  Award,
  Cake,
  Baby,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { UserRole } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  images: string[];
  isPinned: boolean;
  date?: string;
  reactions: Array<{ userId: string; type: string }>;
  commentsCount: number;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  announcement: Megaphone,
  milestone: Award,
  achievement: Award,
  birthday: Cake,
  anniversary: Heart,
  birth: Baby,
  wedding: Heart,
  graduation: GraduationCap,
  memorial: Heart,
  news: Megaphone,
  other: Calendar,
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isReady: settingsReady } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.familyId) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({ familyId: user.familyId });
      if (typeFilter) params.append('type', typeFilter);

      const res = await fetch(`/api/announcements?${params}`);
      const data = await res.json();

      if (data.success) {
        setAnnouncements(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.familyId, typeFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && !user.familyId) {
      router.push('/family/create');
      return;
    }

    if (user?.familyId && settingsReady) {
      fetchAnnouncements();
    }
  }, [user, authLoading, settingsReady, router, fetchAnnouncements]);

  if (authLoading || isLoading || !settingsReady) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN;

  return (
    <FeatureGate feature="announcements" fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Announcements feature is not enabled for this family.</p>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header user={user} />

        <div className="flex">
          <Sidebar userRole={user.role} />

          <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-8 h-8 text-amber-500" />
                    Announcements
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Family news, milestones, and celebrations
                  </p>
                </div>

                <Button
                  onClick={() => setShowAddModal(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  New Announcement
                </Button>
              </div>

              {/* Type Filters */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['', 'announcement', 'milestone', 'birthday', 'anniversary', 'birth', 'graduation'].map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                  >
                    {type || 'All'}
                  </Button>
                ))}
              </div>

              {/* Announcements List */}
              {announcements.length === 0 ? (
                <Card variant="bordered" className="p-12 text-center">
                  <PartyPopper className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No announcements yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Share news and celebrate milestones with your family!
                  </p>
                  <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Create Announcement
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => {
                    const Icon = typeIcons[announcement.type] || Megaphone;
                    return (
                      <Card key={announcement._id} variant="bordered" className="overflow-hidden">
                        <div className="p-6">
                          {/* Header */}
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {announcement.isPinned && (
                                  <Pin className="w-4 h-4 text-amber-500" />
                                )}
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {announcement.title}
                                </h3>
                                {announcement.priority !== 'normal' && (
                                  <Badge className={priorityColors[announcement.priority]}>
                                    {announcement.priority}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <Avatar
                                  src={announcement.createdBy.avatar}
                                  name={`${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`}
                                  size="xs"
                                />
                                <span>{announcement.createdBy.firstName}</span>
                                <span>·</span>
                                <span>{formatRelativeTime(announcement.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="mt-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {announcement.content}
                          </div>

                          {/* Images */}
                          {announcement.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                              {announcement.images.slice(0, 3).map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt=""
                                  className="rounded-lg w-full h-32 object-cover"
                                />
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4">
                            <button className="flex items-center gap-2 text-gray-500 hover:text-amber-500 transition-colors">
                              <Heart className="w-5 h-5" />
                              <span className="text-sm">{announcement.reactions.length}</span>
                            </button>
                            <button className="flex items-center gap-2 text-gray-500 hover:text-amber-500 transition-colors">
                              <MessageCircle className="w-5 h-5" />
                              <span className="text-sm">{announcement.commentsCount}</span>
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        <MobileNav />

        {/* Add Announcement Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create Announcement"
          description="Share news with your family"
        >
          <p className="text-gray-500 dark:text-gray-400">
            Announcement form coming soon...
          </p>
        </Modal>
      </div>
    </FeatureGate>
  );
}
