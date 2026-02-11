'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion, Users, Calendar, Image, Bell, Search, LucideIcon } from 'lucide-react';
import { Button } from './Button';

// Icon can be either a ReactNode (already rendered) or a Lucide icon component
type IconType = React.ReactNode | LucideIcon | React.ComponentType<{ className?: string }>;

// Action can be either an object with label/onClick or a raw ReactNode
// Also supports false for conditional rendering like `!searchQuery && <Button>`
type ActionType = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
} | React.ReactNode | false;

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  action?: ActionType;
  className?: string;
}

// Type guard to check if action is the object format
function isActionObject(action: ActionType): action is { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'outline' } {
  return action !== null && typeof action === 'object' && 'label' in action && 'onClick' in action;
}

// Type guard to check if icon is a component type
function isIconComponent(icon: IconType): icon is LucideIcon | React.ComponentType<{ className?: string }> {
  return typeof icon === 'function';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  // Render icon - handle both ReactNode and component types
  const renderIcon = () => {
    if (!icon) return null;
    if (isIconComponent(icon)) {
      const IconComponent = icon;
      return <IconComponent className="w-8 h-8" />;
    }
    return icon;
  };

  // Render action - handle both object and ReactNode types
  const renderAction = () => {
    // Filter out falsy values (from conditional rendering like `!searchQuery && <Button>`)
    if (!action) return null;
    if (isActionObject(action)) {
      return (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      );
    }
    return action;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <div className="text-gray-400 dark:text-gray-500">{renderIcon()}</div>
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
      {renderAction()}
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
