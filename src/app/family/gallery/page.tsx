'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Badge, Loading, EmptyState, Modal } from '@/components/ui';
import {
  Plus,
  Image as ImageIcon,
  Video,
  Filter,
  Grid3X3,
  LayoutGrid,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Calendar,
  User,
  FolderOpen,
} from 'lucide-react';

interface MediaItem {
  _id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  album?: string;
  tags?: string[];
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  taggedMembers?: string[];
  likes?: number;
  comments?: number;
  createdAt: string;
}

interface Album {
  _id: string;
  name: string;
  coverImage?: string;
  mediaCount: number;
}

type ViewMode = 'grid' | 'masonry';
type FilterType = 'all' | 'images' | 'videos';

export default function GalleryPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchGalleryData();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchGalleryData = async () => {
    try {
      setIsLoading(true);
      // Simulated data for demo - replace with actual API call
      const mockMedia: MediaItem[] = [
        {
          _id: '1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400',
          title: 'Family Reunion 2024',
          description: 'Our annual family reunion at the lake house.',
          album: 'Reunions',
          tags: ['reunion', 'summer', '2024'],
          uploadedBy: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          likes: 24,
          comments: 5,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400',
          title: 'Grandma\'s 80th Birthday',
          description: 'Celebrating Grandma Martha\'s milestone birthday.',
          album: 'Birthdays',
          tags: ['birthday', 'grandma', 'celebration'],
          uploadedBy: { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
          likes: 42,
          comments: 12,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: '3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400',
          title: 'Wedding Day',
          description: 'Michael and Emma\'s beautiful wedding ceremony.',
          album: 'Weddings',
          tags: ['wedding', 'ceremony', 'love'],
          uploadedBy: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          likes: 89,
          comments: 28,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          _id: '4',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=400',
          title: 'Summer Vacation',
          description: 'Beach trip with the whole family.',
          album: 'Vacations',
          tags: ['beach', 'summer', 'vacation'],
          uploadedBy: { _id: '3', firstName: 'Emily', lastName: 'Johnson' },
          likes: 35,
          comments: 8,
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          _id: '5',
          type: 'video',
          url: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
          title: 'Holiday Message',
          description: 'A special holiday message from the family.',
          album: 'Holidays',
          tags: ['holiday', 'christmas', 'video'],
          uploadedBy: { _id: '1', firstName: 'John', lastName: 'Johnson' },
          likes: 56,
          comments: 15,
          createdAt: new Date(Date.now() - 345600000).toISOString(),
        },
        {
          _id: '6',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
          thumbnailUrl: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
          title: 'Thanksgiving Dinner',
          description: 'The whole family gathered for Thanksgiving.',
          album: 'Holidays',
          tags: ['thanksgiving', 'dinner', 'family'],
          uploadedBy: { _id: '2', firstName: 'Sarah', lastName: 'Johnson' },
          likes: 67,
          comments: 21,
          createdAt: new Date(Date.now() - 432000000).toISOString(),
        },
      ];

      const mockAlbums: Album[] = [
        { _id: 'all', name: 'All Photos', mediaCount: mockMedia.length },
        { _id: 'reunions', name: 'Reunions', coverImage: mockMedia[0]?.thumbnailUrl, mediaCount: 1 },
        { _id: 'birthdays', name: 'Birthdays', coverImage: mockMedia[1]?.thumbnailUrl, mediaCount: 1 },
        { _id: 'weddings', name: 'Weddings', coverImage: mockMedia[2]?.thumbnailUrl, mediaCount: 1 },
        { _id: 'vacations', name: 'Vacations', coverImage: mockMedia[3]?.thumbnailUrl, mediaCount: 1 },
        { _id: 'holidays', name: 'Holidays', coverImage: mockMedia[4]?.thumbnailUrl, mediaCount: 2 },
      ];

      setMedia(mockMedia);
      setAlbums(mockAlbums);
    } catch (error) {
      console.error('Failed to fetch gallery data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMedia = useMemo(() => {
    let filtered = [...media];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(m =>
        filterType === 'images' ? m.type === 'image' : m.type === 'video'
      );
    }

    // Filter by album
    if (selectedAlbum && selectedAlbum !== 'all') {
      filtered = filtered.filter(m =>
        m.album?.toLowerCase() === selectedAlbum.toLowerCase()
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [media, filterType, selectedAlbum, searchQuery]);

  const openLightbox = (item: MediaItem) => {
    const index = filteredMedia.findIndex(m => m._id === item._id);
    setLightboxIndex(index);
    setSelectedMedia(item);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? (lightboxIndex - 1 + filteredMedia.length) % filteredMedia.length
      : (lightboxIndex + 1) % filteredMedia.length;
    setLightboxIndex(newIndex);
    setSelectedMedia(filteredMedia[newIndex]);
  };

  const formatDate = (dateString: string) => {
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
                Photo Gallery
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {media.length} photos and videos across {albums.length - 1} albums
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          {/* Albums Row */}
          <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-3">
              {albums.map((album) => (
                <button
                  key={album._id}
                  onClick={() => setSelectedAlbum(album._id === 'all' ? null : album._id)}
                  className={`flex-shrink-0 group ${
                    (selectedAlbum === album._id || (!selectedAlbum && album._id === 'all'))
                      ? 'ring-2 ring-amber-500'
                      : ''
                  } rounded-xl overflow-hidden`}
                >
                  <div className="relative w-32 h-24">
                    {album.coverImage ? (
                      <img
                        src={album.coverImage}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <FolderOpen className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-2">
                      <p className="text-white text-sm font-medium truncate">{album.name}</p>
                      <p className="text-white/70 text-xs">{album.mediaCount} items</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="all">All Media</option>
                  <option value="images">Photos Only</option>
                  <option value="videos">Videos Only</option>
                </select>

                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 ${viewMode === 'grid' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('masonry')}
                    className={`p-2.5 ${viewMode === 'masonry' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Gallery Grid */}
          {filteredMedia.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No Media Found"
              description={searchQuery ? 'Try adjusting your search or filters.' : 'Upload your first photo or video to get started.'}
              action={
                !searchQuery && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                )
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <MediaCard key={item._id} item={item} onClick={() => openLightbox(item)} />
              ))}
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
              {filteredMedia.map((item) => (
                <div key={item._id} className="mb-4 break-inside-avoid">
                  <MediaCard item={item} onClick={() => openLightbox(item)} masonry />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="text-white">
              <h3 className="font-semibold">{selectedMedia.title || 'Untitled'}</h3>
              <p className="text-sm text-white/70">
                by {selectedMedia.uploadedBy.firstName} {selectedMedia.uploadedBy.lastName}
              </p>
            </div>
            <button
              onClick={() => setSelectedMedia(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <button
            onClick={() => navigateLightbox('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={() => navigateLightbox('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Media */}
          <div className="h-full flex items-center justify-center p-16">
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.title || ''}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-white">
                <button className="flex items-center gap-1.5 hover:text-amber-400">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{selectedMedia.likes || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-amber-400">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{selectedMedia.comments || 0}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedMedia.description && (
              <p className="text-white/80 text-sm mt-3">{selectedMedia.description}</p>
            )}

            {selectedMedia.tags && selectedMedia.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedMedia.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-white/50 text-xs mt-3">
              {lightboxIndex + 1} of {filteredMedia.length} • {formatDate(selectedMedia.createdAt)}
            </p>
          </div>
        </div>
      )}

      <MobileNav />
      <div className="hidden lg:block">
        <MinimalFooter />
      </div>
    </div>
  );
}

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  masonry?: boolean;
}

function MediaCard({ item, onClick, masonry }: MediaCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl overflow-hidden cursor-pointer ${
        masonry ? '' : 'aspect-square'
      }`}
    >
      <img
        src={item.thumbnailUrl || item.url}
        alt={item.title || ''}
        className={`w-full ${masonry ? 'h-auto' : 'h-full'} object-cover transition-transform group-hover:scale-105`}
      />

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full">
          <Video className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
        <div className="w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform">
          <p className="text-white text-sm font-medium truncate">
            {item.title || 'Untitled'}
          </p>
          <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {item.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {item.comments || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
