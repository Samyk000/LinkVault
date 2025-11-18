"use client";

/**
 * @file components/common/view-toggle.tsx
 * @description Toggle between grid and list views
 * @created 2025-10-18
 */

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store";

/**
 * View toggle component for switching between grid and list layouts.
 * Provides visual buttons for each view mode.
 * @returns {JSX.Element} View toggle component
 */
export function ViewToggle() {
  const { settings, updateSettings } = useSettingsStore();
  const viewMode = settings.viewMode;

  return (
    <div 
      className="flex items-center gap-1 rounded-md p-1 bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-sm"
      role="group"
      aria-label="View mode selector"
    >
      <Button
        variant={viewMode === "grid" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateSettings({ viewMode: "grid" })}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8 transition-all hover:scale-105 active:scale-95"
        onClick={() => updateSettings({ viewMode: "list" })}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}
