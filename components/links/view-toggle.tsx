/**
 * @file components/links/view-toggle.tsx
 * @description Component for toggling between grid and list view modes with instant response
 * @created 2024-01-01
 */

'use client';

import React from 'react';
import { Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store';
import { logger } from '@/lib/utils/logger';

/**
 * ViewToggle component for switching between grid and list view modes
 * Provides instant visual feedback without delays or notifications
 * 
 * @example
 * <ViewToggle />
 * 
 * @returns The view toggle component
 */
export function ViewToggle() {
  const { settings, updateSettings } = useSettingsStore();

  /**
   * Handles view mode toggle with instant response
   * Updates settings optimistically for immediate UI feedback
   */
  const handleToggle = (): void => {
    const newViewMode = settings.viewMode === 'grid' ? 'list' : 'grid';
    
    // Update settings optimistically for instant response
    updateSettings({ viewMode: newViewMode }).catch((error) => {
      logger.error('Failed to update view mode:', error);
      // Silent error handling - no user notification needed for view toggle
    });
  };

  return (
    <div className="flex items-center gap-1 rounded-lg p-1 bg-background">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`size-8 p-0 transition-all duration-150 ${
          settings.viewMode === 'grid' 
            ? 'bg-muted text-foreground' 
            : 'hover:bg-muted/50 hover:text-foreground'
        }`}
        aria-label="Switch to grid view"
      >
        <Grid3X3 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`size-8 p-0 transition-all duration-150 ${
          settings.viewMode === 'list' 
            ? 'bg-muted text-foreground' 
            : 'hover:bg-muted/50 hover:text-foreground'
        }`}
        aria-label="Switch to list view"
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}
