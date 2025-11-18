"use client";

/**
 * @file components/layout/sidebar.tsx
 * @description Application sidebar with folders and navigation
 * @created 2025-10-18
 */

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronUp, LogOut, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { QuickAccessSection } from "./quick-access-section";
import { FoldersSection } from "./folders-section";
import { FolderDeleteModal } from "./folder-delete-modal";
import { ProfileModal } from "@/components/modals/profile-modal";
import { useAuth } from "@/lib/contexts/auth-context";
import { useStore } from "@/store/useStore";
import { logger } from "@/lib/utils/logger";
import { supabaseDatabaseService } from "@/lib/services/supabase-database.service";
import { globalCache } from "@/lib/services/cache-manager";
import { performanceMonitor } from "@/lib/services/performance-monitor.service";

export function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const clearData = useStore((state) => state.clearData);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false); // Use ref to prevent double-click without React state

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

  return (
    <>
      <aside className="hidden md:flex w-64 lg:w-72 max-w-72 flex-col border-r border-border/40 bg-background/50 backdrop-blur-sm">
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-5 space-y-2">
            {/* Quick Access Section */}
            <QuickAccessSection />

            {/* Folders Section */}
            <FoldersSection />
          </div>
        </ScrollArea>

        {/* User Profile Section */}
        <div className="p-4 lg:p-5 border-t border-border/40 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex-1 justify-start gap-3 h-auto p-2.5 hover:bg-muted/80 rounded-lg transition-colors"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-semibold shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="font-medium text-sm truncate text-foreground block">
                  {displayName}
                </span>
              </div>
              <ChevronUp className="size-4 text-muted-foreground flex-shrink-0" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-10 w-10 p-2 hover:bg-destructive/10 text-destructive hover:text-destructive/90 disabled:opacity-50 rounded-lg transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

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
