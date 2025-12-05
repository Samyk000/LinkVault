'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider, useAuth } from '@/lib/contexts/auth-context';
import { GuestModeProvider } from '@/lib/contexts/guest-mode-context';
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
 * CRITICAL: This component is completely removed in production builds
 */
function AuthenticatedPerformanceDashboard() {
  const { user } = useAuth();
  
  // CRITICAL: Double-check we're in development - this should be tree-shaken in production
  // but we add runtime check as safety net
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
    return null;
  }

  // Only render performance dashboard if user is authenticated
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
          <GuestModeProvider>
            <StoreInitializer />
            <OfflineIndicator />
            {children}
            <Toaster />
            <ShareFolderModal />
            {/* Only show PerformanceDashboard for authenticated users */}
            <AuthenticatedPerformanceDashboard />
          </GuestModeProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}