/**
 * @file components/common/bulk-action-bar.tsx
 * @description Floating bulk action bar for selected items
 * @created 2025-10-25
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Folder, Star, Trash2, CheckSquare, Square, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLinksStore, useUIStore } from "@/store";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { LazyBulkMoveModal } from "@/components/lazy";
import { useComponentTheme, cn } from "@/lib/theme";

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  totalVisibleItems: number;
}

/**
 * Floating bulk action bar that appears when items are selected.
 * Provides actions for moving, favoriting, and deleting multiple items.
 * @param {BulkActionBarProps} props - Component props
 * @returns {JSX.Element | null} Bulk action bar component or null if no selection
 */
export const BulkActionBar = memo(function BulkActionBar({
  selectedIds,
  onClearSelection,
  totalVisibleItems,
}: BulkActionBarProps) {
  // Use selector function to prevent unnecessary re-renders
  const { links, bulkToggleFavoriteLinks, bulkDeleteLinks, bulkRestoreLinks } = useLinksStore();
  const { toast } = useToast();
  const theme = useComponentTheme('bulkActionBar');

  const [showMoveModal, setShowMoveModal] = useState(false);

  // Memoize selection state calculations
  const allSelected = useMemo(() =>
    selectedIds.length === totalVisibleItems && totalVisibleItems > 0,
    [selectedIds.length, totalVisibleItems]
  );
  const someSelected = useMemo(() =>
    selectedIds.length > 0 && selectedIds.length < totalVisibleItems,
    [selectedIds.length, totalVisibleItems]
  );
  const noneSelected = useMemo(() =>
    selectedIds.length === 0,
    [selectedIds.length]
  );

  // Memoize selected links to prevent recalculation on every render
  const selectedLinks = useMemo(() =>
    links.filter(link => selectedIds.includes(link.id)),
    [links, selectedIds]
  );

  // Memoize has favorites check
  const hasFavorites = useMemo(() =>
    selectedLinks.some(link => link.isFavorite),
    [selectedLinks]
  );

  /**
   * Handles select all toggle
   */
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onClearSelection();
    } else {
      // Select all visible items by emitting event to parent
      const event = new CustomEvent('selectAllVisible');
      window.dispatchEvent(event);
    }
  }, [allSelected, onClearSelection]);

  /**
   * Handles bulk favorite toggle
   */
  const handleBulkFavorite = useCallback(async () => {
    try {
      const hasMixedStates = selectedLinks.some(link => link.isFavorite) &&
        selectedLinks.some(link => !link.isFavorite);

      // If mixed states, favorite all; otherwise toggle based on first item's state
      const shouldFavorite = hasMixedStates ? true : !selectedLinks[0]?.isFavorite;

      await bulkToggleFavoriteLinks(selectedIds, shouldFavorite);

      toast({
        title: `${shouldFavorite ? "Favorited" : "Unfavorited"} (${selectedIds.length})`,
        variant: "info",
        icon: <Star className={`size-4 ${shouldFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />,
      });

      onClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
        icon: <Star className="size-4" />,
      });
    }
  }, [selectedLinks, selectedIds, bulkToggleFavoriteLinks, toast, onClearSelection]);

  /**
   * Handles undo delete operation
   */
  const handleUndoDelete = useCallback(async () => {
    try {
      await bulkRestoreLinks(selectedIds);

      toast({
        title: `Restored (${selectedIds.length})`,
        variant: "info",
        icon: <Undo2 className="size-4" />,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
        icon: <Undo2 className="size-4" />,
      });
    }
  }, [selectedIds, bulkRestoreLinks, toast]);

  /**
   * Handles bulk delete with undo functionality
   */
  const handleBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteLinks(selectedIds);

      toast({
        title: `Moved to Trash (${selectedIds.length})`,
        variant: "info",
        icon: <Trash2 className="size-4" />,
        action: (
          <ToastAction altText="Undo" onClick={handleUndoDelete}>
            Undo
          </ToastAction>
        ),
      });

      onClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
        icon: <Trash2 className="size-4" />,
      });
    }
  }, [selectedIds, bulkDeleteLinks, toast, onClearSelection, handleUndoDelete]);

  /**
   * Handles bulk move completion
   */
  const handleMoveComplete = useCallback((movedCount: number) => {
    if (movedCount > 0) {
      toast({
        title: `Moved (${movedCount})`,
        variant: "success",
        icon: <Folder className="size-4" />,
      });
      onClearSelection();
    }
  }, [toast, onClearSelection]);

  // Don't render if nothing selected
  if (noneSelected) return null;

  return (
    <>
      {/* Floating Action Bar - Enhanced Design with Theme-Aware Colors */}
      <div
        className={cn(
          "fixed top-16 sm:top-18 left-1/2 transform -translate-x-1/2 z-40",
          "rounded-xl shadow-xl px-4 py-3 flex items-center gap-3",
          "min-w-[300px] sm:min-w-[360px] max-w-[95vw] border",
          "bg-background/95 backdrop-blur-sm border-border/50",
          "animate-in slide-in-from-top-2 fade-in duration-300"
        )}
      >
        {/* Action Buttons - First */}
        {/* Mobile: Vertical layout with text below icons */}
        <div className="md:hidden flex items-center gap-3">
          {/* Move Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveModal(true)}
              className={cn(
                "h-10 w-10 rounded-lg p-0",
                "transition-transform duration-200 active:scale-95 hover:bg-muted/50"
              )}
              aria-label="Move selected items"
            >
              <Folder className="size-4" />
            </Button>
            <span className="text-[10px] font-medium leading-tight text-muted-foreground">
              Move
            </span>
          </div>

          {/* Favorite Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkFavorite}
              className={cn(
                "h-10 w-10 rounded-lg p-0",
                "transition-transform duration-200 active:scale-95 hover:bg-muted/50"
              )}
              aria-label="Toggle favorite for selected items"
            >
              <Star className={`size-4 ${hasFavorites ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
            <span className="text-[10px] font-medium leading-tight text-muted-foreground">
              Favorite
            </span>
          </div>

          {/* Delete Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              className={cn(
                "h-10 w-10 rounded-lg p-0",
                "transition-transform duration-200 active:scale-95 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              )}
              aria-label="Delete selected items"
            >
              <Trash2 className="size-4 text-red-500" />
            </Button>
            <span className="text-[10px] font-medium leading-tight text-muted-foreground">
              Delete
            </span>
          </div>
        </div>

        {/* Desktop: Horizontal layout with text beside icons */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Move Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoveModal(true)}
            className={cn(
              "gap-1.5 px-3 h-9 rounded-lg text-sm font-medium",
              "transition-transform duration-200 active:scale-[0.98] hover:bg-muted/50"
            )}
            aria-label="Move selected items"
          >
            <Folder className="size-4" />
            <span>Move</span>
          </Button>

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkFavorite}
            className={cn(
              "gap-1.5 px-3 h-9 rounded-lg text-sm font-medium",
              "transition-transform duration-200 active:scale-[0.98] hover:bg-muted/50"
            )}
            aria-label="Toggle favorite for selected items"
          >
            <Star className={`size-4 ${hasFavorites ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            <span>Favorite</span>
          </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            className={cn(
              "gap-1.5 px-3 h-9 rounded-lg text-sm font-medium",
              "transition-transform duration-200 active:scale-[0.98] hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-red-500"
            )}
            aria-label="Delete selected items"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>
        </div>

        {/* Divider - Mobile only */}
        <div className="md:hidden h-7 w-px bg-border/50 flex-shrink-0" />

        {/* Selection Count + Select All - Mobile grouped together */}
        <div className="md:hidden flex items-center gap-1 flex-shrink-0">
          {/* Selection Count + Select All in same row */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              {/* Selection Count */}
              <div className="text-xs font-medium tabular-nums opacity-80 text-muted-foreground">
                <span>{selectedIds.length}</span>
              </div>

              {/* Select All Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSelectAll}
                className="h-8 w-8 rounded-lg p-0 transition-transform duration-200 active:scale-95 hover:bg-muted/50"
                aria-label="Select all visible items"
              >
                {allSelected ? (
                  <CheckSquare className="size-3.5" />
                ) : (
                  <Square className="size-3.5" />
                )}
              </Button>
            </div>

            {/* Text Label below both */}
            <span className="text-[10px] font-medium leading-tight text-muted-foreground">
              Select All
            </span>
          </div>
        </div>

        {/* Desktop Divider */}
        <div className="hidden md:block h-7 w-px bg-border/50" />

        {/* Desktop Selection Count */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 text-xs font-medium flex-shrink-0 tabular-nums opacity-80 text-muted-foreground">
            <span>{selectedIds.length} selected</span>
          </div>
        </div>

        {/* Desktop Select All Checkbox */}
        <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
          <Checkbox
            checked={allSelected}
            ref={(el: any) => {
              if (el) el.indeterminate = someSelected;
            }}
            onCheckedChange={handleSelectAll}
            aria-label="Select all visible items"
            className="h-4 w-4 rounded border-2 data-[state=checked]:text-primary-foreground"
          />
          <span className="text-sm font-medium text-muted-foreground">
            Select all
          </span>
        </div>

        {/* Close Button - Last - Right aligned on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-10 w-10 md:h-9 md:w-9 rounded-lg flex-shrink-0 ml-auto md:ml-0 transition-transform duration-200 active:scale-95 opacity-70 hover:opacity-100 hover:bg-muted/50"
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Bulk Move Modal */}
      {showMoveModal && (
        <React.Suspense fallback={<div className="sr-only">Loading move modal...</div>}>
          <LazyBulkMoveModal
            isOpen={showMoveModal}
            onClose={() => setShowMoveModal(false)}
            selectedIds={selectedIds}
            onComplete={handleMoveComplete}
          />
        </React.Suspense>
      )}
    </>
  );
});
