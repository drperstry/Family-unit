'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <Loader2
      className={cn('animate-spin text-amber-500', sizes[size], className)}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}

interface LoadingCardProps {
  count?: number;
  className?: string;
}

export function LoadingCard({ count = 1, className }: LoadingCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse',
            className
          )}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      ))}
    </>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
}

export function LoadingTable({ rows = 5, columns = 4 }: LoadingTableProps) {
  return (
    <div className="w-full animate-pulse">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-gray-200 dark:border-gray-700"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 bg-gray-100 dark:bg-gray-800 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
}
