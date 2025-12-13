'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { GuestModeProvider } from '@/lib/contexts/guest-mode-context';
import { StoreInitializer } from '@/components/providers/store-initializer';
import { ResourceHints } from '@/components/providers/resource-hints';
import { OfflineIndicator } from '@/components/common/offline-indicator';
import { CookieConsent } from '@/components/common/cookie-consent';
import { Toaster } from '@/components/ui/toaster';
import { ShareFolderModal } from '@/components/modals/share-folder-modal';
import { AuthUser } from '@/lib/types/auth';

interface LayoutClientProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function LayoutClient({ children, initialUser }: LayoutClientProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryProvider>
        <ResourceHints />
        <AuthProvider initialUser={initialUser}>
          <GuestModeProvider>
            <StoreInitializer />
            <OfflineIndicator />
            {children}
            <Toaster />
            <ShareFolderModal />
            <CookieConsent />
          </GuestModeProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}