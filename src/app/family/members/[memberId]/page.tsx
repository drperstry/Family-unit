'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Avatar, Badge, Loading, SimpleTabs } from '@/components/ui';
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Briefcase,
  Mail,
  Phone,
  Heart,
  Users,
  TreePine,
  Image,
  FileText,
  Award,
  Share2,
} from 'lucide-react';
import { FamilyMember, Gender, UserRole } from '@/types';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [relatedMembers, setRelatedMembers] = useState<{
    parents: FamilyMember[];
    spouse: FamilyMember | null;
    children: FamilyMember[];
    siblings: FamilyMember[];
  }>({ parents: [], spouse: null, children: [], siblings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId && params.memberId) {
      fetchMemberDetails();
    }
  }, [authLoading, isAuthenticated, user, params.memberId, router]);

  const fetchMemberDetails = async () => {
    try {
      setIsLoading(true);

      // Fetch member details
      const response = await fetch(`/api/families/${user?.familyId}/members/${params.memberId}`);
      const data = await response.json();

      if (data.success && data.data?.member) {
        setMember(data.data.member);

        // Fetch related members
        const allMembersResponse = await fetch(`/api/families/${user?.familyId}/members`);
        const allMembersData = await allMembersResponse.json();

        if (allMembersData.success && allMembersData.data?.members) {
          const allMembers = allMembersData.data.members;
          const currentMember = data.data.member;

          // Find parents
          const parents = allMembers.filter((m: FamilyMember) =>
            m._id === currentMember.parentId || m._id === currentMember.secondParentId
          );

          // Find spouse
          const spouse = currentMember.spouseId
            ? allMembers.find((m: FamilyMember) => m._id === currentMember.spouseId)
            : null;

          // Find children
          const children = allMembers.filter((m: FamilyMember) =>
            m.parentId === currentMember._id || m.secondParentId === currentMember._id
          );

          // Find siblings
          const siblings = allMembers.filter((m: FamilyMember) =>
            m._id !== currentMember._id &&
            currentMember.parentId &&
            (m.parentId === currentMember.parentId || m.secondParentId === currentMember.parentId)
          );

          setRelatedMembers({ parents, spouse, children, siblings });
        }
      }
    } catch (error) {
      console.error('Failed to fetch member details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (birthDate?: Date | string, deathDate?: Date | string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const canEdit = user?.role === UserRole.FAMILY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

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

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Member Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">The requested member could not be found.</p>
            <Button onClick={() => router.push('/family/members')} className="mt-4">
              Back to Members
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const age = calculateAge(member.birthDate, member.deathDate);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <Sidebar userRole={user?.role} />

      <main className="lg:pl-64 pt-16 pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            href="/family/members"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Members
          </Link>

          {/* Profile Header */}
          <Card className="overflow-hidden mb-6">
            <div className="h-32 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <Avatar
                  src={member.profileImage}
                  name={`${member.firstName} ${member.lastName}`}
                  size="2xl"
                  className="ring-4 ring-white dark:ring-gray-900"
                />
                <div className="flex-1 sm:pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </h1>
                    {member.nickname && (
                      <span className="text-lg text-gray-500 dark:text-gray-400">
                        &ldquo;{member.nickname}&rdquo;
                      </span>
                    )}
                  </div>
                  {member.isDeceased && (
                    <Badge variant="secondary" className="mt-1">
                      {formatDate(member.birthDate)} - {formatDate(member.deathDate)}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <SimpleTabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'family', label: 'Family' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'gallery', label: 'Gallery' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <Card className="lg:col-span-2 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  About
                </h2>

                {member.bio ? (
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-6">
                    {member.bio}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic mb-6">
                    No bio added yet.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {member.birthDate && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Birthday</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(member.birthDate)}
                          {age !== null && !member.isDeceased && ` (${age} years old)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {member.birthPlace && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Birthplace</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.birthPlace}
                        </p>
                      </div>
                    </div>
                  )}

                  {member.location?.city && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Location</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.location.city}
                          {member.location.country && `, ${member.location.country}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {member.occupation && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Occupation</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.occupation}
                        </p>
                      </div>
                    </div>
                  )}

                  {member.contactInfo?.email && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <a
                          href={`mailto:${member.contactInfo.email}`}
                          className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          {member.contactInfo.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {member.contactInfo?.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <a
                          href={`tel:${member.contactInfo.phone}`}
                          className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          {member.contactInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <Card className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    Quick Info
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Generation</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {member.generation === 0 ? 'Founder' : `${member.generation}${member.generation === 1 ? 'st' : member.generation === 2 ? 'nd' : member.generation === 3 ? 'rd' : 'th'}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Gender</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {member.gender}
                      </span>
                    </div>
                    {relatedMembers.children.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Children</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {relatedMembers.children.length}
                        </span>
                      </div>
                    )}
                    {relatedMembers.siblings.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Siblings</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {relatedMembers.siblings.length}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Actions */}
                <Card className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    Actions
                  </h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <TreePine className="w-4 h-4 mr-2" />
                      View in Tree
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Profile
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              {/* Parents */}
              {relatedMembers.parents.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Parents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedMembers.parents.map((parent) => (
                      <RelatedMemberCard key={parent._id} member={parent} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Spouse */}
              {relatedMembers.spouse && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Spouse
                  </h3>
                  <RelatedMemberCard member={relatedMembers.spouse} />
                </Card>
              )}

              {/* Children */}
              {relatedMembers.children.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Children ({relatedMembers.children.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedMembers.children.map((child) => (
                      <RelatedMemberCard key={child._id} member={child} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Siblings */}
              {relatedMembers.siblings.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Siblings ({relatedMembers.siblings.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedMembers.siblings.map((sibling) => (
                      <RelatedMemberCard key={sibling._id} member={sibling} />
                    ))}
                  </div>
                </Card>
              )}

              {relatedMembers.parents.length === 0 &&
                !relatedMembers.spouse &&
                relatedMembers.children.length === 0 &&
                relatedMembers.siblings.length === 0 && (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Family Connections</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    No family relationships have been added yet.
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline Coming Soon</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Life events and milestones will appear here.
              </p>
            </Card>
          )}

          {activeTab === 'gallery' && (
            <Card className="p-8 text-center">
              <Image className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gallery Coming Soon</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Photos and media featuring this member will appear here.
              </p>
            </Card>
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

function RelatedMemberCard({ member }: { member: FamilyMember }) {
  return (
    <Link href={`/family/members/${member._id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <Avatar
          src={member.profileImage}
          name={`${member.firstName} ${member.lastName}`}
          size="md"
        />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {member.firstName} {member.lastName}
          </p>
          {member.location?.city && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {member.location.city}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
