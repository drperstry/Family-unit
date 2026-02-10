'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Badge, Loading, EmptyState } from '@/components/ui';
import {
  Plus,
  MapPin,
  Search,
  Map,
  List,
  Home,
  Building2,
  Church,
  GraduationCap,
  Heart,
  TreePine,
  Star,
} from 'lucide-react';

interface FamilyLocation {
  _id: string;
  name: string;
  description?: string;
  type: 'home' | 'birthplace' | 'cemetery' | 'church' | 'school' | 'workplace' | 'landmark' | 'other';
  address: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  associatedMembers?: {
    _id: string;
    firstName: string;
    lastName: string;
  }[];
  photos?: string[];
  significance?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
  createdAt: string;
}

type ViewMode = 'map' | 'list';
type TypeFilter = 'all' | 'home' | 'birthplace' | 'cemetery' | 'church' | 'school' | 'workplace' | 'landmark' | 'other';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  home: { icon: Home, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', label: 'Home' },
  birthplace: { icon: Star, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300', label: 'Birthplace' },
  cemetery: { icon: TreePine, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', label: 'Cemetery' },
  church: { icon: Church, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', label: 'Church' },
  school: { icon: GraduationCap, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', label: 'School' },
  workplace: { icon: Building2, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', label: 'Workplace' },
  landmark: { icon: MapPin, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', label: 'Landmark' },
  other: { icon: MapPin, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', label: 'Other' },
};

export default function LocationsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [locations, setLocations] = useState<FamilyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedLocation, setSelectedLocation] = useState<FamilyLocation | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchLocations();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      // Simulated data for demo
      const mockLocations: FamilyLocation[] = [
        {
          _id: '1',
          name: 'Johnson Family Homestead',
          description: 'The original family home built by great-grandfather William Johnson in 1923.',
          type: 'home',
          address: '123 Oak Street',
          city: 'Springfield',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.7817, lng: -89.6501 },
          significance: 'Where the Johnson family began their American journey',
          dateRange: { from: '1923', to: 'present' },
          associatedMembers: [
            { _id: '1', firstName: 'William', lastName: 'Johnson' },
            { _id: '2', firstName: 'John', lastName: 'Johnson' },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          name: 'Grandma Martha\'s Birthplace',
          description: 'The small farmhouse where Martha was born.',
          type: 'birthplace',
          address: '456 Country Road',
          city: 'Decatur',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.8403, lng: -88.9548 },
          dateRange: { from: '1940' },
          associatedMembers: [
            { _id: '3', firstName: 'Martha', lastName: 'Johnson' },
          ],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: '3',
          name: 'St. Mary\'s Church',
          description: 'The church where multiple family weddings and baptisms took place.',
          type: 'church',
          address: '789 Church Lane',
          city: 'Springfield',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.7900, lng: -89.6441 },
          significance: 'Site of 5 family weddings since 1945',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          _id: '4',
          name: 'Oak Hill Cemetery',
          description: 'Final resting place of many Johnson family members.',
          type: 'cemetery',
          address: '321 Memorial Drive',
          city: 'Springfield',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.7650, lng: -89.6200 },
          associatedMembers: [
            { _id: '1', firstName: 'William', lastName: 'Johnson' },
          ],
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          _id: '5',
          name: 'Johnson Hardware Store',
          description: 'The family business operated from 1950 to 1995.',
          type: 'workplace',
          address: '555 Main Street',
          city: 'Springfield',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.7990, lng: -89.6500 },
          significance: 'Three generations of Johnson men worked here',
          dateRange: { from: '1950', to: '1995' },
          createdAt: new Date(Date.now() - 345600000).toISOString(),
        },
        {
          _id: '6',
          name: 'Lincoln Park',
          description: 'The park where family reunions were held for decades.',
          type: 'landmark',
          address: 'Lincoln Park',
          city: 'Springfield',
          state: 'Illinois',
          country: 'USA',
          coordinates: { lat: 39.8010, lng: -89.6350 },
          significance: 'Annual reunion location since 1960',
          createdAt: new Date(Date.now() - 432000000).toISOString(),
        },
      ];

      setLocations(mockLocations);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    let filtered = [...locations];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(l => l.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.city.toLowerCase().includes(query) ||
        l.country.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [locations, typeFilter, searchQuery]);

  const locationsByType = useMemo(() => {
    const grouped: Record<string, FamilyLocation[]> = {};
    filteredLocations.forEach(loc => {
      if (!grouped[loc.type]) {
        grouped[loc.type] = [];
      }
      grouped[loc.type].push(loc);
    });
    return grouped;
  }, [filteredLocations]);

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
                Family Locations
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {locations.length} significant places in your family history
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>

                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 ${viewMode === 'list' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2.5 ${viewMode === 'map' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Content */}
          {filteredLocations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No Locations Found"
              description={searchQuery ? 'Try adjusting your search or filters.' : 'Add your first family location to get started.'}
              action={
                !searchQuery && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                )
              }
            />
          ) : viewMode === 'map' ? (
            <Card className="overflow-hidden">
              {/* Map Placeholder - Replace with actual Google Maps integration */}
              <div className="h-[600px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Map View
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Configure Google Maps API to enable the interactive map
                  </p>
                </div>
              </div>

              {/* Location List Below Map */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex overflow-x-auto gap-4 pb-2">
                  {filteredLocations.map((location) => {
                    const config = TYPE_CONFIG[location.type];
                    const Icon = config?.icon || MapPin;

                    return (
                      <button
                        key={location._id}
                        onClick={() => setSelectedLocation(location)}
                        className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-lg border ${
                          selectedLocation?._id === location._id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {location.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {location.city}, {location.country}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(locationsByType).map(([type, locs]) => {
                const config = TYPE_CONFIG[type];
                const Icon = config?.icon || MapPin;

                return (
                  <div key={type}>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      <div className={`p-1.5 rounded-lg ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {config.label}s ({locs.length})
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {locs.map((location) => (
                        <LocationCard key={location._id} location={location} />
                      ))}
                    </div>
                  </div>
                );
              })}
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

function LocationCard({ location }: { location: FamilyLocation }) {
  const config = TYPE_CONFIG[location.type];
  const Icon = config?.icon || MapPin;

  return (
    <Card className="p-5 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {location.name}
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {location.city}
            {location.state && `, ${location.state}`}, {location.country}
          </p>

          {location.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
              {location.description}
            </p>
          )}

          {location.dateRange && (
            <Badge variant="secondary" size="sm">
              {location.dateRange.from}
              {location.dateRange.to && ` - ${location.dateRange.to}`}
            </Badge>
          )}

          {location.associatedMembers && location.associatedMembers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Associated with: {location.associatedMembers.map(m => `${m.firstName} ${m.lastName}`).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
