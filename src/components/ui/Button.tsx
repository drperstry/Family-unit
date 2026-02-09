'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98] touch-manipulation
      rounded-lg
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-amber-500 to-orange-500
        hover:from-amber-600 hover:to-orange-600
        text-white shadow-md hover:shadow-lg
        focus:ring-amber-500
      `,
      secondary: `
        bg-gradient-to-r from-teal-500 to-emerald-500
        hover:from-teal-600 hover:to-emerald-600
        text-white shadow-md hover:shadow-lg
        focus:ring-teal-500
      `,
      outline: `
        border-2 border-amber-500 text-amber-600
        hover:bg-amber-50 dark:hover:bg-amber-950
        focus:ring-amber-500
      `,
      ghost: `
        text-gray-600 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:ring-gray-500
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-rose-500
        hover:from-red-600 hover:to-rose-600
        text-white shadow-md hover:shadow-lg
        focus:ring-red-500
      `,
      success: `
        bg-gradient-to-r from-green-500 to-emerald-500
        hover:from-green-600 hover:to-emerald-600
        text-white shadow-md hover:shadow-lg
        focus:ring-green-500
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      icon: 'p-2 aspect-square',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
