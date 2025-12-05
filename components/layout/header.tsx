"use client";

/**
 * @file components/layout/header.tsx
 * @description Main application header
 * @created 2025-10-18
 */

import { Plus, Settings, User, LogOut, Loader2, UserCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useStore } from "@/store/useStore";
import React, { useState } from "react";
import { LazySettingsModal } from "@/components/lazy";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/contexts/auth-context";
import { useGuestMode } from "@/lib/contexts/guest-mode-context";
import { useLogout } from "@/hooks/use-logout";
import { ProfileModal } from "@/components/modals/profile-modal";
import { useRouter } from "next/navigation";

export function Header() {
  const setAddLinkModalOpen = useStore((state) => state.setAddLinkModalOpen);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();
  const { isGuestMode, isLoading: guestLoading, deactivateGuestMode } = useGuestMode();
  const { handleLogout, isLoggingOut } = useLogout();
  const router = useRouter();

  // Prevent hydration mismatch by only showing guest-specific UI after mount
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle guest logout - deactivate and redirect with hard navigation
  const handleGuestLogout = () => {
    deactivateGuestMode();
    // Use hard navigation to ensure cookies are properly cleared before middleware checks
    window.location.replace('/login');
  };

  // Only show guest mode UI after client-side mount to prevent hydration mismatch
  const showGuestMode = isMounted && !guestLoading && isGuestMode;

  // Get display name or fallback
  const displayName = showGuestMode ? 'Guest' : (user?.profile?.display_name || user?.email?.split('@')[0] || 'User');
  const userInitials = displayName.charAt(0).toUpperCase();

  // Performance monitoring
  const { trackMetric, trackInteraction, trackError } = usePerformanceMonitor({
    componentName: 'Header',
    trackRenders: false,
    trackInteractions: true,
    trackErrors: true
  });

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="flex h-16 sm:h-18 items-center gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <MobileSidebar />

          {/* Logo - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="text-lg font-bold">L</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              LinksVault
            </span>
          </div>

          {/* Spacer - Flexible */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Add Link - Hidden on mobile (FAB available) */}
            <Button
              onClick={() => setAddLinkModalOpen(true)}
              className="hidden md:flex gap-2 h-10 px-4 text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add Link</span>
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full p-0 hover:bg-transparent"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shadow-sm ring-2 ring-background transition-transform hover:scale-105 ${showGuestMode ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                    {showGuestMode ? <UserCircle className="h-5 w-5" /> : userInitials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {showGuestMode ? 'Data stored locally' : user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {showGuestMode ? (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/login?tab=signup')} className="cursor-pointer text-primary">
                      <User className="mr-2 h-4 w-4" />
                      <span>Sign Up Free</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/login')} className="cursor-pointer">
                      <LogIn className="mr-2 h-4 w-4" />
                      <span>Login</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleGuestLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Exit Guest Mode</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isSettingsOpen && (
        <React.Suspense fallback={<div className="sr-only">Loading settings...</div>}>
          <LazySettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </React.Suspense>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
