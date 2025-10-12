import { ReactNode } from 'react';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Nunito } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { APP_CONFIG } from '@/config/app-config';
import { getPreference } from '@/server/server-actions';
import { PreferencesStoreProvider } from '@/stores/preferences/preferences-provider';
import { THEME_MODE_VALUES, type ThemeMode } from '@/types/preferences/theme';

import './globals.css';
import { cn } from '@impactium/utils';

const inter = Inter({ subsets: ['latin'] });

const nunito = Nunito({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeMode = await getPreference<ThemeMode>('theme_mode', THEME_MODE_VALUES, 'light');

  return (
    <html lang='en' className={themeMode === 'dark' ? 'dark' : ''} data-theme-preset='default' suppressHydrationWarning>
      <body className={cn(inter.className, nunito.className, 'min-h-screen antialiased')}>
        <PreferencesStoreProvider themeMode={themeMode}>
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
