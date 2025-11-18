"use client";

/**
 * @file components/layout/header.tsx
 * @description Main application header
 * @created 2025-10-18
 */

import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useStore } from "@/store/useStore";
import React, { useState } from "react";
import { LazySettingsModal } from "@/components/lazy";

export function Header() {
  const setAddLinkModalOpen = useStore((state) => state.setAddLinkModalOpen);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
              LinkVault
            </span>
          </div>

          {/* Spacer */}
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
