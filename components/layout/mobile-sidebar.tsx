"use client";

/**
 * @file components/layout/mobile-sidebar.tsx
 * @description Mobile sidebar with slide-out navigation
 * @created 2025-10-18
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, ChevronUp, LogOut, Loader2, User } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/store/useStore';
import { QuickAccessSection } from './quick-access-section';
import { FoldersSection } from './folders-section';
import { FolderDeleteModal } from './folder-delete-modal';
import { ProfileModal } from '../modals/profile-modal';
import { logger } from '@/lib/utils/logger';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { globalCache } from '@/lib/services/cache-manager';
import { performanceMonitor } from '@/lib/services/performance-monitor.service';

export function MobileSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const clearData = useStore((state) => state.clearData);
  const setSelectedFolder = useStore((state) => state.setSelectedFolder);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const isLoggingOutRef = React.useRef(false); // Use ref to prevent double-click without React state

  // Get display name or fallback
  const displayName = user?.profile?.display_name || user?.email?.split('@')[0] || 'User';

  /**
   * Handle user logout with instant cleanup and secure session clearing
   */
  const handleLogout = async () => {
    // Prevent double-click
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // 1. Show button spinner
    setIsLoggingOut(true);
    // Note: We keep the sheet open so the user sees the spinner on the button

    // 2. Small delay to ensure spinner renders
    await new Promise(resolve => setTimeout(resolve, 10));

    // CRITICAL: Set logout flag
    if (typeof window !== 'undefined') {
      localStorage.setItem('linkvault_logging_out', 'true');
    }

    // 3. Clear cache and localStorage (synchronous)
    // NOTE: We do NOT call clearData() here to prevent the UI from flashing "empty"
    // before the redirect. The hard navigation will clear memory anyway.
    try {
      globalCache.clear();
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('linkvault_') || key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('linkvault_logging_out');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }

    // 4. Clear performance monitor
    try {
      performanceMonitor.clearData();
    } catch (error) {
      console.error('Error clearing performance data:', error);
    }

    // 5. Unsubscribe from realtime
    try {
      supabaseDatabaseService.unsubscribeAll();
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }

    // 6. Clear cookies
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth-token')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          }
        });
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }

    // 7. Sign out from Supabase (non-blocking)
    signOut().catch(console.error);

    // 8. Small delay to ensure spinner is visible before redirect
    await new Promise(resolve => setTimeout(resolve, 100));

    // 9. Redirect immediately
    window.location.replace('/login');
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentView('all');
    setSelectedFolder(folderId);
    setIsOpen(false);
  };

  const handleViewClick = (view: 'all' | 'favorites' | 'trash') => {
    setCurrentView(view);
    setSelectedFolder(null);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden focus:outline-none focus-visible:ring-0"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">L</span>
                </div>
                <span className="text-lg font-semibold">LinksVault</span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for LinksVault
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-80px)]">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1">
                {/* Quick Access */}
                <QuickAccessSection onViewClick={handleViewClick} />

                {/* Folders */}
                <FoldersSection onFolderClick={handleFolderClick} />
              </div>
            </ScrollArea>

            {/* Profile Section */}
            <div className="p-4 mt-auto">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex-1 justify-start gap-3 h-auto p-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-orange-500 text-black text-sm font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate text-gray-600 dark:text-gray-400">{displayName}</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">View profile</span>
                  </div>
                  <ChevronUp className="size-4 text-gray-600 dark:text-gray-400" />
                </Button>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="size-4 animate-spin-gpu" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    <span>Logout</span>
                  </Button>
                </SheetClose>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Folder Delete Confirmation Modal */}
      <FolderDeleteModal />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
