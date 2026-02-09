'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      maxLength,
      showCount = false,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            `
            w-full px-4 py-3 rounded-lg resize-y min-h-[100px]
            bg-white dark:bg-gray-800
            border-2 border-gray-200 dark:border-gray-700
            text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            transition-all duration-200
            focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation
            `,
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        <div className="flex justify-between mt-1.5">
          {(error || helperText) && (
            <p
              className={cn(
                'text-sm',
                error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {error || helperText}
            </p>
          )}
          {showCount && maxLength && (
            <p
              className={cn(
                'text-sm ml-auto',
                currentLength >= maxLength ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
