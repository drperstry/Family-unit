'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', status, ...props }, ref) => {
    const getInitials = (name: string): string => {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-14 h-14 text-lg',
      xl: 'w-20 h-20 text-xl',
      '2xl': 'w-28 h-28 text-2xl',
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5',
    };

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
    };

    // Generate a consistent background color based on name
    const getBackgroundColor = (name?: string): string => {
      if (!name) return 'bg-gray-400';
      const colors = [
        'bg-amber-500',
        'bg-orange-500',
        'bg-teal-500',
        'bg-emerald-500',
        'bg-blue-500',
        'bg-indigo-500',
        'bg-purple-500',
        'bg-pink-500',
      ];
      const index = name.charCodeAt(0) % colors.length;
      return colors[index];
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex flex-shrink-0', className)}
        {...props}
      >
        <div
          className={cn(
            'rounded-full flex items-center justify-center overflow-hidden',
            sizes[size],
            !src && getBackgroundColor(name)
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={alt || name || 'Avatar'}
              fill
              className="object-cover"
            />
          ) : name ? (
            <span className="font-medium text-white">{getInitials(name)}</span>
          ) : (
            <User className="w-1/2 h-1/2 text-white" />
          )}
        </div>

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-800',
              statusSizes[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarProps['size'];
  children: React.ReactNode;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 4, size = 'md', children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const displayChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    const overlap = {
      xs: '-ml-2',
      sm: '-ml-2.5',
      md: '-ml-3',
      lg: '-ml-4',
      xl: '-ml-5',
      '2xl': '-ml-6',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {displayChildren.map((child, index) => (
          <div
            key={index}
            className={cn(index !== 0 && overlap[size], 'ring-2 ring-white dark:ring-gray-800 rounded-full')}
          >
            {React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
              : child}
          </div>
        ))}
        {remainingCount > 0 && (
          <Avatar
            name={`+${remainingCount}`}
            size={size}
            className={cn(overlap[size], 'ring-2 ring-white dark:ring-gray-800')}
          />
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };
