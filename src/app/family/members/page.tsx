'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Input, Card, Avatar, Badge, Loading, EmptyState, Select, Tabs } from '@/components/ui';
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Calendar,
  Mail,
  Phone,
  ChevronRight,
  Users,
  TreePine
} from 'lucide-react';
import { FamilyMember, Gender } from '@/types';

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'age' | 'generation' | 'recent';

export default function MembersPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterGeneration, setFilterGeneration] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchMembers();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${user?.familyId}/members`);
      const data = await response.json();

      if (data.success) {
        setMembers(data.data.members || []);
      } else {
        setError(data.error || 'Failed to load members');
      }
    } catch (err) {
      setError('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const generations = useMemo(() => {
    const gens = [...new Set(members.map(m => m.generation))].sort((a, b) => a - b);
    return gens;
  }, [members]);

  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.firstName.toLowerCase().includes(query) ||
        m.lastName.toLowerCase().includes(query) ||
        m.nickname?.toLowerCase().includes(query) ||
        m.occupation?.toLowerCase().includes(query) ||
        m.location?.city?.toLowerCase().includes(query)
      );
    }

    // Generation filter
    if (filterGeneration !== 'all') {
      filtered = filtered.filter(m => m.generation === parseInt(filterGeneration));
    }

    // Gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(m => m.gender === filterGender);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case 'age':
        filtered.sort((a, b) => {
          const ageA = a.birthDate ? new Date().getFullYear() - new Date(a.birthDate).getFullYear() : 0;
          const ageB = b.birthDate ? new Date().getFullYear() - new Date(b.birthDate).getFullYear() : 0;
          return ageB - ageA;
        });
        break;
      case 'generation':
        filtered.sort((a, b) => a.generation - b.generation);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [members, searchQuery, filterGeneration, filterGender, sortBy]);

  const calculateAge = (birthDate?: Date | string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getGenerationLabel = (gen: number) => {
    const labels: Record<number, string> = {
      0: 'Founders',
      1: '1st Generation',
      2: '2nd Generation',
      3: '3rd Generation',
      4: '4th Generation',
      5: '5th Generation',
    };
    return labels[gen] || `${gen}th Generation`;
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

  if (!user?.familyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <EmptyState
            icon={Users}
            title="No Family Yet"
            description="Join or create a family to view members."
            action={
              <Button onClick={() => router.push('/family/create')}>
                Create Family
              </Button>
            }
          />
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
                Family Members
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {members.length} members across {generations.length} generations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/family">
                <Button variant="outline" size="sm">
                  <TreePine className="w-4 h-4 mr-2" />
                  View Tree
                </Button>
              </Link>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, occupation, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterGeneration}
                  onChange={(e) => setFilterGeneration(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Generations</option>
                  {generations.map(gen => (
                    <option key={gen} value={gen}>{getGenerationLabel(gen)}</option>
                  ))}
                </select>

                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Genders</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="age">Sort by Age</option>
                  <option value="generation">Sort by Generation</option>
                  <option value="recent">Sort by Recent</option>
                </select>

                {/* View Toggle */}
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 ${viewMode === 'grid' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 ${viewMode === 'list' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Members Display */}
          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Members Found"
              description={searchQuery ? 'Try adjusting your search or filters.' : 'Add family members to get started.'}
              action={
                !searchQuery && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Member
                  </Button>
                )
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMembers.map((member) => (
                <MemberCard key={member._id} member={member} calculateAge={calculateAge} getGenerationLabel={getGenerationLabel} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <MemberListItem key={member._id} member={member} calculateAge={calculateAge} getGenerationLabel={getGenerationLabel} />
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

interface MemberItemProps {
  member: FamilyMember;
  calculateAge: (birthDate?: Date | string) => number | null;
  getGenerationLabel: (gen: number) => string;
}

function MemberCard({ member, calculateAge, getGenerationLabel }: MemberItemProps) {
  const age = calculateAge(member.birthDate);

  return (
    <Link href={`/family/members/${member._id}`}>
      <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={member.profileImage}
            name={`${member.firstName} ${member.lastName}`}
            size="xl"
            className="mb-3"
          />
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {member.firstName} {member.lastName}
          </h3>
          {member.nickname && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &ldquo;{member.nickname}&rdquo;
            </p>
          )}
          <Badge variant="secondary" size="sm" className="mt-2">
            {getGenerationLabel(member.generation)}
          </Badge>

          <div className="mt-3 space-y-1.5 w-full">
            {age !== null && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{age} years old</span>
              </div>
            )}
            {member.location?.city && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{member.location.city}</span>
              </div>
            )}
            {member.occupation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {member.occupation}
              </p>
            )}
          </div>

          {member.isDeceased && (
            <Badge variant="secondary" size="sm" className="mt-2">
              In Memoriam
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

function MemberListItem({ member, calculateAge, getGenerationLabel }: MemberItemProps) {
  const age = calculateAge(member.birthDate);

  return (
    <Link href={`/family/members/${member._id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center gap-4">
          <Avatar
            src={member.profileImage}
            name={`${member.firstName} ${member.lastName}`}
            size="lg"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {member.firstName} {member.lastName}
              </h3>
              {member.nickname && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({member.nickname})
                </span>
              )}
              {member.isDeceased && (
                <Badge variant="secondary" size="sm">In Memoriam</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <Badge variant="secondary" size="sm">
                {getGenerationLabel(member.generation)}
              </Badge>
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {age} years old
                </span>
              )}
              {member.location?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {member.location.city}
                </span>
              )}
              {member.occupation && (
                <span>{member.occupation}</span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}
