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
   */
  const handleLogout = async () => {
    // Prevent double-click
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // 1. Show button spinner
    setIsLoggingOut(true);

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
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin-gpu" />
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
