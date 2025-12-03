'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider, useAuth } from '@/lib/contexts/auth-context';
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

/**
 * Wrapper component to render PerformanceDashboard only for authenticated users in development
 */
function AuthenticatedPerformanceDashboard() {
  const { user } = useAuth();

  // Only show debug dashboard in development environment
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Only render performance dashboard if user is authenticated
  // This prevents it from running on login page and respects user privacy
  if (!user) {
    return null;
  }

  return <PerformanceDashboard />;
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
          {/* Only show PerformanceDashboard for authenticated users */}
          <AuthenticatedPerformanceDashboard />
        </AuthProvider>
        <ShareFolderModal />
      </QueryProvider>
    </ThemeProvider>
  );
}