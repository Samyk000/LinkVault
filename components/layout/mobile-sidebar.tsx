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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
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
   * CRITICAL: Must redirect IMMEDIATELY on first click - no delays, no React state blocking
   */
  const handleLogout = () => {
    // Prevent double-click using ref (no React state update)
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    // CRITICAL: Set logout flag FIRST to prevent StoreInitializer from loading data
    if (typeof window !== 'undefined') {
      localStorage.setItem('linkvault_logging_out', 'true');
    }
    
    // CRITICAL: Do minimal synchronous cleanup, then redirect IMMEDIATELY
    // Don't set React state - it can block the redirect!
    
    // 1. Clear store data immediately (synchronous)
    clearData();
    
    // 2. Clear cache and localStorage (synchronous operations)
    try {
      globalCache.clear();
      if (typeof window !== 'undefined') {
        // Clear all localStorage keys that might contain user data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('linkvault_') || key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
        // Clear logout flag after clearing
        localStorage.removeItem('linkvault_logging_out');
      }
    } catch (cacheError) {
      logger.warn('Error clearing cache:', cacheError);
    }
    
    // 3. Clear performance monitor data (synchronous)
    try {
      performanceMonitor.clearData();
    } catch (perfError) {
      logger.warn('Error clearing performance data:', perfError);
    }
    
    // 4. Unsubscribe from realtime subscriptions (synchronous)
    try {
      supabaseDatabaseService.unsubscribeAll();
    } catch (subError) {
      logger.warn('Error unsubscribing:', subError);
    }
    
    // 5. Clear Supabase session cookies immediately (synchronous)
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          // Clear Supabase auth cookies
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth-token')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          }
        });
      }
    } catch (cookieError) {
      logger.warn('Error clearing cookies:', cookieError);
    }
    
    // 6. Sign out from Supabase (fire and forget - don't wait)
    // This is async but we don't await it
    signOut().catch((error) => {
      logger.error('Sign out error (non-blocking):', error);
    });
    
    // 7. CRITICAL: IMMEDIATE redirect using window.location.replace()
    // This is SYNCHRONOUS and happens IMMEDIATELY - no React, no delays, no state updates
    // Using replace() instead of href prevents browser back button issues
    window.location.replace('/login');
    
    // This code should never execute because redirect happens above
    // But if it does, we have a fallback
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }, 50);
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentView('all');
    setSelectedFolder(folderId);
  };

  const handleViewClick = (view: 'all' | 'favorites' | 'trash') => {
    setCurrentView(view);
    setSelectedFolder(null);
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
                <span className="text-lg font-semibold">LinkVault</span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for LinkVault
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  title="Logout"
                >
                  {isLoggingOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                </Button>
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
