'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import { FamilyTree } from '@/components/tree';
import { Button, Card, Badge, PageLoading, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Calendar,
  Image,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Download,
  History,
} from 'lucide-react';
import { UserRole, Gender } from '@/types';

interface TreeMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  gender: Gender;
  photo?: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  isDeceased?: boolean;
  generation: number;
  spouse?: {
    id: string;
    firstName: string;
    lastName: string;
    photo?: string;
    gender: Gender;
  } | null;
  children: TreeMember[];
}

interface FamilyData {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  status: string;
  visibility: string;
}

export default function FamilyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [treeData, setTreeData] = useState<TreeMember[]>([]);
  const [showFemales, setShowFemales] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    gender: Gender.MALE,
    dateOfBirth: '',
  });

  const isAdmin = user?.role === UserRole.FAMILY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

  const fetchFamilyData = useCallback(async () => {
    if (!user?.familyId) return;

    try {
      setIsLoading(true);

      // Fetch family details
      const familyRes = await fetch(`/api/families/${user.familyId}`);
      const familyData = await familyRes.json();

      if (familyData.success) {
        setFamily(familyData.data);
      }

      // Fetch tree data
      const treeRes = await fetch(`/api/families/${user.familyId}/tree?showFemales=${showFemales}`);
      const treeResult = await treeRes.json();

      if (treeResult.success) {
        setTreeData(treeResult.data.tree || []);
      }
    } catch (error) {
      console.error('Error fetching family data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.familyId, showFemales]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && !user.familyId) {
      router.push('/family/create');
      return;
    }

    if (user?.familyId) {
      fetchFamilyData();
    }
  }, [user, authLoading, router, fetchFamilyData]);

  const handleAddChild = (parentId: string) => {
    setSelectedParentId(parentId);
    setShowAddMemberModal(true);
  };

  const handleMemberClick = (memberId: string) => {
    router.push(`/family/members/${memberId}`);
  };

  const handleSubmitNewMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/families/${user?.familyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMember,
          parentId: selectedParentId || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddMemberModal(false);
        setNewMember({
          firstName: '',
          lastName: '',
          gender: Gender.MALE,
          dateOfBirth: '',
        });
        fetchFamilyData();
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  if (authLoading || isLoading) {
    return <PageLoading message="Loading your family..." />;
  }

  if (!user || !family) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={user} familyName={family.name} />

      <div className="flex">
        <Sidebar userRole={user.role} />

        <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {family.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Family Tree View
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFemales(!showFemales)}
                  leftIcon={showFemales ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                >
                  {showFemales ? 'Hide Females' : 'Show Females'}
                </Button>

                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/family/tree/history')}
                      leftIcon={<History className="w-4 h-4" />}
                    >
                      History
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddChild('')}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Add Member
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card variant="bordered" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {family.memberCount}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Image className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">128</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Photos</p>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <Badge variant={family.visibility === 'public' ? 'success' : 'default'}>
                      {family.visibility}
                    </Badge>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visibility</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Family Tree */}
            <Card variant="elevated" className="min-h-[500px] md:min-h-[600px]">
              <FamilyTree
                tree={treeData}
                showFemales={showFemales}
                onMemberClick={handleMemberClick}
                onAddChild={handleAddChild}
                canEdit={isAdmin}
              />
            </Card>
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Add Family Member"
        description={selectedParentId ? 'Add a child to the selected member' : 'Add a new family member'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowAddMemberModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitNewMember}>
              Add Member
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitNewMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={newMember.firstName}
              onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={newMember.lastName}
              onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
              required
            />
          </div>

          <Select
            label="Gender"
            value={newMember.gender}
            onChange={(e) => setNewMember({ ...newMember, gender: e.target.value as Gender })}
            options={[
              { value: Gender.MALE, label: 'Male' },
              { value: Gender.FEMALE, label: 'Female' },
              { value: Gender.OTHER, label: 'Other' },
            ]}
          />

          <Input
            label="Date of Birth"
            type="date"
            value={newMember.dateOfBirth}
            onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
