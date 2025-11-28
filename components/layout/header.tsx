"use client";

/**
 * @file components/layout/header.tsx
 * @description Main application header
 * @created 2025-10-18
 */

import { Plus, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useStore } from "@/store/useStore";
import React, { useState, useCallback } from "react";
import { LazySettingsModal } from "@/components/lazy";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";

export function Header() {
  const setAddLinkModalOpen = useStore((state) => state.setAddLinkModalOpen);
  const searchFilters = useStore((state) => state.searchFilters);
  const setSearchFilters = useStore((state) => state.setSearchFilters);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Performance monitoring
  const { trackMetric, trackInteraction, trackError } = usePerformanceMonitor({
    componentName: 'Header',
    trackRenders: false,
    trackInteractions: true,
    trackErrors: true
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const startTime = performance.now();
    const query = e.target.value;

    try {
      setSearchFilters({ query });

      const duration = performance.now() - startTime;
      trackMetric('search_input_time', duration, {
        queryLength: query.length.toString(),
        hasQuery: (!!query).toString()
      });

      trackInteraction('input', 'search_query', {
        queryLength: query.length.toString(),
        hasQuery: (!!query).toString(),
        duration: duration.toString()
      });
    } catch (error) {
      trackError('Search input error', {
        action: 'search_input',
        queryLength: query.length
      });
    }
  }, [setSearchFilters, trackMetric, trackInteraction, trackError]);

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

          {/* Search Bar - Centered/Flexible */}
          <div className="flex-1 max-w-sm mx-4">
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search links..."
                value={searchFilters.query}
                onChange={handleSearchChange}
                className="pl-8 sm:pl-9 h-8 sm:h-9 w-full bg-muted/50 border-transparent focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors text-xs sm:text-sm"
              />
            </div>
          </div>

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
            {/* Settings - Mobile and Desktop (Rightmost) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
              className="h-10 w-10 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      {isSettingsOpen && (
        <React.Suspense fallback={<div className="sr-only">Loading settings...</div>}>
          <LazySettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
}
