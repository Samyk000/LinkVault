'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { StoreInitializer } from '@/components/providers/store-initializer';
import { ResourceHints } from '@/components/providers/resource-hints';
import { OfflineIndicator } from '@/components/common/offline-indicator';
import { Toaster } from '@/components/ui/toaster';
import { PerformanceDashboard } from '@/components/debug/performance-dashboard';
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
      disableTransitionOnChange
    >
      <QueryProvider>
        <ResourceHints />
        <AuthProvider initialUser={initialUser}>
          <StoreInitializer />
          <OfflineIndicator />
          {children}
          <Toaster />
        </AuthProvider>
        <PerformanceDashboard />
        <ShareFolderModal />
      </QueryProvider>
    </ThemeProvider>
  );
}