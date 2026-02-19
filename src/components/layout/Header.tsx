'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button, Avatar } from '@/components/ui';
import {
  Menu,
  X,
  Home,
  Users,
  Calendar,
  Image,
  Settings,
  LogOut,
  Bell,
  Search,
  Moon,
  Sun,
  ChevronDown,
  BookOpen,
  FileText,
  Heart,
  Vote,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { SafeUser, UserRole } from '@/types';
import { useSettings } from '@/context/SettingsContext';

interface HeaderProps {
  user?: SafeUser | null;
  familyName?: string;
}

export function Header({ user, familyName }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { settings, isFeatureEnabled, isReady } = useSettings();

  // Use settings site name if available, otherwise fall back to family name or default
  const siteName = isReady && settings.siteName ? settings.siteName : (familyName || 'FamilyHub');

  // Build navigation based on enabled features
  const navigation = [
    { name: 'Home', href: '/family', icon: Home, feature: null },
    { name: 'Members', href: '/family/members', icon: Users, feature: 'members' as const },
    { name: 'Events', href: '/family/events', icon: Calendar, feature: 'events' as const },
    { name: 'Gallery', href: '/family/gallery', icon: Image, feature: 'gallery' as const },
    { name: 'Recipes', href: '/family/recipes', icon: BookOpen, feature: 'recipes' as const },
    { name: 'Documents', href: '/family/documents', icon: FileText, feature: 'documents' as const },
    { name: 'Traditions', href: '/family/traditions', icon: Sparkles, feature: 'traditions' as const },
    { name: 'Polls', href: '/family/polls', icon: Vote, feature: 'polls' as const },
    { name: 'Memorial', href: '/family/memorial', icon: Heart, feature: 'memorial' as const },
    { name: 'Announcements', href: '/family/announcements', icon: Megaphone, feature: 'announcements' as const },
  ].filter(item => !item.feature || isFeatureEnabled(item.feature));

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Site Name */}
          <div className="flex items-center gap-4">
            <Link
              href={user?.familyId ? '/family' : '/'}
              className="flex items-center gap-2 text-xl font-bold text-amber-600 dark:text-amber-400"
            >
              {settings.logo ? (
                <img src={settings.logo} alt={siteName} className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
              )}
              <span className="hidden sm:inline">{siteName}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {user && navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            {user && (
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="w-5 h-5" />
              </Button>
            )}

            {/* Notifications */}
            {user && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Avatar
                    src={user.avatar}
                    name={`${user.firstName} ${user.lastName}`}
                    size="sm"
                  />
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      {(user.role === UserRole.FAMILY_ADMIN || user.role === UserRole.SYSTEM_ADMIN) && (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Dashboard
                        </Link>
                      )}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          // Handle logout
                          setIsProfileOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-4 space-y-2">
            {user && navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
