'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Badge, Loading, EmptyState, Avatar } from '@/components/ui';
import {
  Plus,
  Newspaper,
  Filter,
  Clock,
  User,
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Bell,
  Star,
  ChevronRight,
} from 'lucide-react';
import { ContentStatus, VisibilityStatus, UserRole } from '@/types';

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  category: 'announcement' | 'update' | 'milestone' | 'story' | 'other';
  isPinned?: boolean;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  status: ContentStatus;
  visibility: VisibilityStatus;
  likes: number;
  comments: number;
  views: number;
  publishedAt?: string;
  createdAt: string;
}

type CategoryFilter = 'all' | 'announcement' | 'update' | 'milestone' | 'story' | 'other';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  announcement: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Bell },
  update: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: Clock },
  milestone: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Star },
  story: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: BookOpen },
  other: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: Newspaper },
};

export default function NewsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchNews();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      // Simulated data for demo - replace with actual API call
      const mockNews: NewsItem[] = [
        {
          _id: '1',
          title: 'Welcome to Our Family Platform!',
          content: 'We are excited to launch our new family platform. This is a place where we can all stay connected, share memories, and celebrate our family history together. Please take some time to explore all the features and add your profile information.',
          summary: 'Introducing our new family connection platform',
          coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
          category: 'announcement',
          isPinned: true,
          author: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 24,
          comments: 8,
          views: 156,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          title: 'Family Reunion Scheduled for July 2024',
          content: 'Mark your calendars! Our annual family reunion has been scheduled for July 15-17, 2024 at Lake Tahoe. This year we have some exciting activities planned including a boat tour, hiking trails, and a special ceremony to honor our ancestors.',
          summary: 'Annual reunion set for July 15-17 at Lake Tahoe',
          coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
          category: 'announcement',
          isPinned: false,
          author: { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 42,
          comments: 15,
          views: 234,
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: '3',
          title: 'Congratulations to Emma and Michael!',
          content: 'We are thrilled to announce that Emma Johnson and Michael Thompson are now engaged! The happy couple met at last year\'s family reunion and have been inseparable ever since. The wedding is planned for next spring.',
          summary: 'Emma and Michael announce their engagement',
          coverImage: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800',
          category: 'milestone',
          isPinned: false,
          author: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 89,
          comments: 32,
          views: 412,
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          _id: '4',
          title: 'Grandpa Robert\'s War Stories',
          content: 'In honor of Veterans Day, we wanted to share some of Grandpa Robert\'s stories from his time serving in the Navy. These stories have been passed down through generations and remind us of the sacrifices made by our family members.',
          summary: 'Remembering Grandpa Robert\'s military service',
          coverImage: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
          category: 'story',
          isPinned: false,
          author: { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 56,
          comments: 12,
          views: 189,
          publishedAt: new Date(Date.now() - 259200000).toISOString(),
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          _id: '5',
          title: 'New Baby in the Family!',
          content: 'Please join us in welcoming the newest member of our family! David and Lisa Johnson are proud to announce the birth of their daughter, Sophia Rose Johnson, born on December 1st weighing 7 lbs 4 oz.',
          summary: 'Welcome baby Sophia Rose Johnson',
          category: 'milestone',
          isPinned: false,
          author: { _id: '4', firstName: 'David', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 112,
          comments: 45,
          views: 523,
          publishedAt: new Date(Date.now() - 345600000).toISOString(),
          createdAt: new Date(Date.now() - 345600000).toISOString(),
        },
        {
          _id: '6',
          title: 'Family Recipe Book Project',
          content: 'We are starting a project to compile all of our family\'s treasured recipes into a cookbook. If you have any recipes that have been passed down through generations, please submit them through the platform.',
          summary: 'Help us compile our family recipe collection',
          category: 'update',
          isPinned: false,
          author: { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
          status: ContentStatus.APPROVED,
          visibility: VisibilityStatus.FAMILY_ONLY,
          likes: 28,
          comments: 19,
          views: 167,
          publishedAt: new Date(Date.now() - 432000000).toISOString(),
          createdAt: new Date(Date.now() - 432000000).toISOString(),
        },
      ];

      setNews(mockNews);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNews = useMemo(() => {
    let filtered = [...news];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }

    // Sort: pinned first, then by date
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });

    return filtered;
  }, [news, categoryFilter]);

  const pinnedNews = filteredNews.filter(n => n.isPinned);
  const regularNews = filteredNews.filter(n => !n.isPinned);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} minutes ago`;
      }
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const canCreateNews = user?.role === UserRole.FAMILY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Family News
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Stay updated with announcements, milestones, and stories
              </p>
            </div>
            {canCreateNews && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Post News
              </Button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(['all', 'announcement', 'update', 'milestone', 'story', 'other'] as CategoryFilter[]).map((cat) => {
              const isActive = categoryFilter === cat;
              const style = cat !== 'all' ? CATEGORY_STYLES[cat] : null;
              const Icon = style?.icon || Newspaper;

              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="capitalize">{cat === 'all' ? 'All News' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* News List */}
          {filteredNews.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No News Yet"
              description="There are no news posts to display. Check back later for updates."
              action={
                canCreateNews && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Post First News
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Pinned News */}
              {pinnedNews.map((item) => (
                <NewsCard key={item._id} item={item} formatDate={formatDate} featured />
              ))}

              {/* Regular News */}
              {regularNews.map((item) => (
                <NewsCard key={item._id} item={item} formatDate={formatDate} />
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

interface NewsCardProps {
  item: NewsItem;
  formatDate: (date: string) => string;
  featured?: boolean;
}

function NewsCard({ item, formatDate, featured }: NewsCardProps) {
  const categoryStyle = CATEGORY_STYLES[item.category];
  const CategoryIcon = categoryStyle?.icon || Newspaper;

  return (
    <Card className={`overflow-hidden ${featured ? 'ring-2 ring-amber-500' : ''}`}>
      {item.coverImage && (
        <div className="relative h-48 sm:h-64">
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {item.isPinned && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
              Pinned
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Category and Date */}
        <div className="flex items-center justify-between mb-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
            <CategoryIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{item.category}</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(item.publishedAt || item.createdAt)}
          </span>
        </div>

        {/* Title and Summary */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
          {item.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
          {item.summary || item.content}
        </p>

        {/* Author and Engagement */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Avatar
              src={item.author.profileImage}
              name={`${item.author.firstName} ${item.author.lastName}`}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.author.firstName} {item.author.lastName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {item.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {item.comments}
            </span>
            <button className="hover:text-amber-600 dark:hover:text-amber-400">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Read More */}
        <button className="mt-4 inline-flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
          Read full story
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
}
