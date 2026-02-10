'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Input, Select, SimpleTabs, Loading, Avatar } from '@/components/ui';
import {
  Settings,
  Shield,
  Bell,
  Users,
  Eye,
  Lock,
  Globe,
  Trash2,
  Download,
  Upload,
  Camera,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { UserRole, VisibilityStatus, FamilyStatus } from '@/types';

interface FamilySettings {
  name: string;
  description: string;
  coverImage?: string;
  visibility: VisibilityStatus;
  status: FamilyStatus;
  joinPolicy: 'open' | 'approval' | 'invite';
  contentModeration: boolean;
  allowGuestViewing: boolean;
  defaultMemberRole: 'member' | 'contributor';
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<FamilySettings>({
    name: 'Johnson Family',
    description: 'A place for our family to connect and share memories.',
    visibility: VisibilityStatus.PRIVATE,
    status: FamilyStatus.ACTIVE,
    joinPolicy: 'approval',
    contentModeration: true,
    allowGuestViewing: false,
    defaultMemberRole: 'member',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchSettings();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      // Simulated fetch - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Simulated save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canEditSettings = user?.role === UserRole.FAMILY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;

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

  if (!canEditSettings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <Sidebar userRole={user?.role} />
        <main className="lg:pl-64 pt-16 pb-20 lg:pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="p-8 text-center">
              <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You don&apos;t have permission to access family settings.
              </p>
              <Button onClick={() => router.push('/family')} className="mt-4">
                Back to Family
              </Button>
            </Card>
          </div>
        </main>
        <MobileNav />
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Family Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your family&apos;s settings and preferences
              </p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loading size="sm" className="mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>

          {/* Tabs */}
          <SimpleTabs
            tabs={[
              { id: 'general', label: 'General', icon: Settings },
              { id: 'privacy', label: 'Privacy', icon: Shield },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Family Profile
                </h2>

                {/* Cover Image */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cover Image
                  </label>
                  <div className="relative h-48 bg-gradient-to-r from-amber-400 to-amber-600 rounded-xl overflow-hidden">
                    {settings.coverImage && (
                      <img
                        src={settings.coverImage}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button className="absolute bottom-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Family Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Family Name
                  </label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="Enter family name"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder="Tell us about your family..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Privacy Settings
                </h2>

                {/* Visibility */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Family Visibility
                  </label>
                  <select
                    value={settings.visibility}
                    onChange={(e) => setSettings({ ...settings, visibility: e.target.value as VisibilityStatus })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={VisibilityStatus.PRIVATE}>Private - Only family members can view</option>
                    <option value={VisibilityStatus.FAMILY_ONLY}>Family - Visible to approved family members</option>
                    <option value={VisibilityStatus.PUBLIC}>Public - Anyone can view (requires approval)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Public families require system admin approval
                  </p>
                </div>

                {/* Guest Viewing */}
                <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Allow Guest Viewing
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Let non-members view public content
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, allowGuestViewing: !settings.allowGuestViewing })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.allowGuestViewing ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.allowGuestViewing ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Content Moderation */}
                <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Content Moderation
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Require admin approval for new content
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, contentModeration: !settings.contentModeration })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.contentModeration ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.contentModeration ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Member Settings */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Membership Settings
                </h2>

                {/* Join Policy */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Join Policy
                  </label>
                  <select
                    value={settings.joinPolicy}
                    onChange={(e) => setSettings({ ...settings, joinPolicy: e.target.value as 'open' | 'approval' | 'invite' })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="open">Open - Anyone can join</option>
                    <option value="approval">Approval Required - Requests need admin approval</option>
                    <option value="invite">Invite Only - Only invited users can join</option>
                  </select>
                </div>

                {/* Default Role */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Member Role
                  </label>
                  <select
                    value={settings.defaultMemberRole}
                    onChange={(e) => setSettings({ ...settings, defaultMemberRole: e.target.value as 'member' | 'contributor' })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="member">Member - Can view content</option>
                    <option value="contributor">Contributor - Can view and submit content</option>
                  </select>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Pending Requests
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No pending join requests.
                </p>
              </Card>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  {[
                    { key: 'newMembers', label: 'New member joins', description: 'Get notified when someone joins the family' },
                    { key: 'newContent', label: 'New content posted', description: 'Get notified about new photos, news, and updates' },
                    { key: 'contentApproval', label: 'Content needs approval', description: 'Get notified when content needs moderation' },
                    { key: 'events', label: 'Upcoming events', description: 'Get reminders about family events' },
                    { key: 'birthdays', label: 'Birthdays', description: 'Get reminders about family birthdays' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <button
                        className="relative w-12 h-6 rounded-full bg-amber-500"
                      >
                        <span className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <Card className="p-6 border-red-200 dark:border-red-900">
                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-6">
                  Danger Zone
                </h2>

                <div className="space-y-4">
                  {/* Export Data */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Export Family Data
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Download all family data in GDPR-compliant format
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  {/* Transfer Ownership */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Transfer Ownership
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Transfer family admin rights to another member
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-2" />
                      Transfer
                    </Button>
                  </div>

                  {/* Delete Family */}
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <h3 className="font-medium text-red-600 dark:text-red-400">
                        Delete Family
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Permanently delete this family and all its data
                      </p>
                    </div>
                    <Button variant="danger" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
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
