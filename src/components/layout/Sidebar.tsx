'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import {
  Home,
  Users,
  Calendar,
  Image,
  FileText,
  Bell,
  Settings,
  Shield,
  Award,
  MapPin,
  Newspaper,
  HelpCircle,
  ClipboardList,
  Gift,
  TreePine,
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  userRole?: UserRole;
  pendingApprovals?: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles?: UserRole[];
}

export function Sidebar({ userRole, pendingApprovals = 0 }: SidebarProps) {
  const pathname = usePathname();

  const mainNavigation: NavItem[] = [
    { name: 'Family Tree', href: '/family', icon: TreePine },
    { name: 'Members', href: '/family/members', icon: Users },
    { name: 'Events', href: '/family/events', icon: Calendar },
    { name: 'Gallery', href: '/family/gallery', icon: Image },
    { name: 'News', href: '/family/news', icon: Newspaper },
    { name: 'Activities', href: '/family/activities', icon: ClipboardList },
    { name: 'Achievements', href: '/family/achievements', icon: Award },
    { name: 'Offers', href: '/family/offers', icon: Gift },
    { name: 'Locations', href: '/family/locations', icon: MapPin },
    { name: 'Procedures', href: '/family/procedures', icon: FileText },
  ];

  const adminNavigation: NavItem[] = [
    {
      name: 'Approvals',
      href: '/dashboard/approvals',
      icon: Shield,
      badge: pendingApprovals,
      roles: [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
    },
    {
      name: 'Audit Logs',
      href: '/dashboard/audit',
      icon: FileText,
      roles: [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN],
    },
  ];

  const systemAdminNavigation: NavItem[] = [
    {
      name: 'All Families',
      href: '/admin/families',
      icon: Home,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      name: 'All Users',
      href: '/admin/users',
      icon: Users,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
      roles: [UserRole.SYSTEM_ADMIN],
    },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const renderNavItem = (item: NavItem) => {
    // Check role access
    if (item.roles && userRole && !item.roles.includes(userRole)) {
      return null;
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive(item.href)
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{item.name}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge variant="danger" size="sm">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:top-16 lg:left-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
      <nav className="flex-1 px-4 py-6 space-y-6">
        {/* Main Navigation */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Family
          </h3>
          <div className="space-y-1">
            {mainNavigation.map(renderNavItem)}
          </div>
        </div>

        {/* Admin Navigation */}
        {userRole && [UserRole.FAMILY_ADMIN, UserRole.SYSTEM_ADMIN].includes(userRole) && (
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Administration
            </h3>
            <div className="space-y-1">
              {adminNavigation.map(renderNavItem)}
            </div>
          </div>
        )}

        {/* System Admin Navigation */}
        {userRole === UserRole.SYSTEM_ADMIN && (
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              System
            </h3>
            <div className="space-y-1">
              {systemAdminNavigation.map(renderNavItem)}
            </div>
          </div>
        )}
      </nav>

      {/* Help Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </Link>
      </div>
    </aside>
  );
}

// Mobile Bottom Navigation
export function MobileNav({ pendingApprovals = 0 }: { pendingApprovals?: number }) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/family', icon: Home },
    { name: 'Members', href: '/family/members', icon: Users },
    { name: 'Events', href: '/family/events', icon: Calendar },
    { name: 'Gallery', href: '/family/gallery', icon: Image },
    { name: 'More', href: '/family/more', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]',
              isActive(item.href)
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
