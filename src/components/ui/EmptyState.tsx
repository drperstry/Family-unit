'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion, Users, Calendar, Image, Bell, Search } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-built empty states
export function NoMembersState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8" />}
      title="No family members yet"
      description="Start building your family tree by adding family members."
      action={onAdd ? { label: 'Add Member', onClick: onAdd } : undefined}
    />
  );
}

export function NoEventsState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="w-8 h-8" />}
      title="No upcoming events"
      description="Keep your family connected by creating events and celebrations."
      action={onAdd ? { label: 'Create Event', onClick: onAdd } : undefined}
    />
  );
}

export function NoPhotosState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Image className="w-8 h-8" />}
      title="No photos yet"
      description="Preserve your family memories by uploading photos."
      action={onAdd ? { label: 'Upload Photos', onClick: onAdd } : undefined}
    />
  );
}

export function NoNotificationsState() {
  return (
    <EmptyState
      icon={<Bell className="w-8 h-8" />}
      title="All caught up!"
      description="You have no new notifications."
    />
  );
}

export function NoSearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8" />}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or filters.`}
    />
  );
}

export function GenericEmptyState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={<FileQuestion className="w-8 h-8" />}
      title="Nothing here yet"
      description={message || "This section is empty. Check back later!"}
    />
  );
}
