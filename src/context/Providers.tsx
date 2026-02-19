'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
