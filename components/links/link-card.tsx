/**
 * @file components/links/link-card.tsx
 * @description Link card component for grid view with subtle animations
 * @author LinksVault Team
 * @created 2025-10-18
 * @modified 2025-10-19
 */

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, MoreVertical, Edit, Trash, Link as LinkIcon, RotateCcw, Copy, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLinksStore, useUIStore } from "@/store";
import { Link } from "@/types";
import { getPlatformConfig } from "@/utils/platform";
import { FolderBadge } from "./folder-badge";
import { formatRelativeTime } from "@/utils/date";
import { useToast } from "@/hooks/use-toast";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import { logger } from "@/lib/utils/logger";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { cn as themeCn } from "@/lib/theme";
import { isAllowedImageDomain, getImageQuality, getFetchPriority, getBlurDataURL, getPlaceholder } from "@/utils/image.utils";



interface LinkCardProps {
  link: Link;
  isInTrash?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (linkId: string) => void;
  isSelectionModeActive?: boolean;
  priority?: boolean; // For LCP optimization - prioritize above-the-fold images
}

/**
 * Link card component for grid view
 * Displays link with thumbnail, title, description, and metadata
 * Includes actions: edit, favorite, delete, restore
 * 
 * @param link - Link object to display
 * @param isInTrash - Whether the link is in trash view
 */
function LinkCardComponent({ link, isInTrash = false, isSelected = false, onToggleSelect, isSelectionModeActive = false, priority = false }: LinkCardProps) {
  const { updateLink, deleteLink, restoreLink, permanentlyDeleteLink } = useLinksStore();
  const { setEditingLink, setAddLinkModalOpen } = useUIStore();
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  // Performance monitoring - disable render tracking to reduce overhead
  const { trackInteraction, trackError, trackMetric } = usePerformanceMonitor({
    componentName: 'LinkCard',
    trackRenders: false, // Disabled to reduce overhead - only track interactions and errors
    trackInteractions: true,
    trackErrors: true
  });

  // Get platform icon with fallback
  const platformConfig = getPlatformConfig(link.platform);
  const PlatformIcon = (LucideIcons as any)[platformConfig.icon] || LinkIcon;

  /**
   * Opens edit modal with current link data
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();

    trackInteraction('click', 'edit_button', {
      linkId: link.id,
      linkTitle: link.title,
      platform: link.platform
    });

    setEditingLink(link.id);
    setAddLinkModalOpen(true);
  };

  /**
   * Toggles favorite status of the link
   */
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const wasFavorite = link.isFavorite;
    const startTime = performance.now();

    try {
      await updateLink(link.id, { isFavorite: !link.isFavorite });

      const duration = performance.now() - startTime;
      trackMetric('favorite_toggle_time', duration, {
        action: wasFavorite ? 'unfavorite' : 'favorite',
        linkId: link.id
      });

      trackInteraction('click', 'favorite_button', {
        linkId: link.id,
        action: wasFavorite ? 'unfavorite' : 'favorite',
        duration
      });

      toast({
        title: wasFavorite ? "Unfavorited" : "Favorited",
        variant: "success",
        icon: <Star className={`size-4 ${!wasFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />,
      });
    } catch (error) {
      logger.error('Error toggling favorite:', error);
      trackError(error as Error, {
        action: 'toggle_favorite',
        linkId: link.id,
        wasFavorite
      });

      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  /**
   * Soft deletes link (moves to trash)
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();

    const startTime = performance.now();
    const linkId = link.id;

    try {
      deleteLink(linkId);

      const duration = performance.now() - startTime;
      trackMetric('delete_link_time', duration, {
        linkId,
        platform: link.platform
      });

      trackInteraction('click', 'delete_button', {
        linkId,
        linkTitle: link.title,
        duration
      });

      toast({
        title: "Deleted",
        variant: "destructive",
        icon: <Trash className="size-4" />,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUndoDelete(linkId)}
            className="h-6 px-2 text-xs bg-white text-black border-gray-300 hover:bg-gray-50 dark:bg-white dark:text-black dark:border-gray-300 dark:hover:bg-gray-50"
          >
            Undo
          </Button>
        ),
      });
    } catch (error) {
      trackError(error as Error, {
        action: 'delete_link',
        linkId,
        linkTitle: link.title
      });
    }
  };

  /**
   * Restores link from trash
   */
  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    restoreLink(link.id);
    toast({
      title: "Restored",
      variant: "success",
      icon: <RotateCcw className="size-4" />,
    });
  };

  /**
   * Copies link URL to clipboard
   */
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();

    const startTime = performance.now();

    try {
      navigator.clipboard.writeText(link.url);

      const duration = performance.now() - startTime;
      trackMetric('copy_link_time', duration, {
        linkId: link.id,
        platform: link.platform
      });

      trackInteraction('click', 'copy_link', {
        linkId: link.id,
        linkTitle: link.title,
        duration
      });

      toast({
        title: "Copied",
        variant: "info",
        icon: <Copy className="size-4" />,
      });
    } catch (error) {
      trackError(error as Error, {
        action: 'copy_link',
        linkId: link.id,
        url: link.url
      });
    }
  };

  /**
   * Handles selection toggle
   */
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    trackInteraction('click', 'select_toggle', {
      linkId: link.id,
      isSelected: !isSelected
    });

    onToggleSelect?.(link.id);
  };

  /**
   * Handles undo delete operation
   */
  const handleUndoDelete = (linkId: string) => {
    const startTime = performance.now();

    try {
      restoreLink(linkId);

      const duration = performance.now() - startTime;
      trackMetric('undo_delete_time', duration, {
        linkId
      });

      trackInteraction('click', 'undo_delete', {
        linkId,
        duration
      });

      toast({
        title: "Restored",
        variant: "success",
        icon: <RotateCcw className="size-4" />,
      });
    } catch (error) {
      trackError(error as Error, {
        action: 'undo_delete',
        linkId
      });
    }
  };

  /**
   * Opens link in new tab when card is clicked
   * Prevents opening if clicking on interactive elements
   * In selection mode, toggles selection instead
   */
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open if clicking on buttons or dropdown
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // If in selection mode, toggle selection instead of opening link
    if (isSelectionModeActive && onToggleSelect) {
      trackInteraction('click', 'card_select', {
        linkId: link.id,
        isSelected: !isSelected
      });
      onToggleSelect(link.id);
      return;
    }

    // Otherwise, open the link
    const startTime = performance.now();

    try {
      window.open(link.url, '_blank', 'noopener,noreferrer');

      const duration = performance.now() - startTime;
      trackMetric('link_open_time', duration, {
        linkId: link.id,
        platform: link.platform,
        url: link.url
      });

      trackInteraction('click', 'open_link', {
        linkId: link.id,
        linkTitle: link.title,
        platform: link.platform,
        url: link.url,
        duration
      });
    } catch (error) {
      trackError(error as Error, {
        action: 'open_link',
        linkId: link.id,
        url: link.url
      });
    }
  };

  /**
   * Permanently deletes link with confirmation
   */
  const handlePermanentDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  /**
   * Confirms permanent deletion
   */
  const confirmPermanentDelete = () => {
    permanentlyDeleteLink(link.id);
    toast({
      title: "Deleted permanently",
      variant: "destructive",
      icon: <Trash className="size-4" />,
    });
  };

  return (
    <>
      <Card
        className={`group relative overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/5 cursor-pointer border-2 rounded-xl will-change-transform ${isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/50'
          : 'border-border/50 hover:border-border'
          }`}
        onClick={handleCardClick}
      >
        {/* Three-Dot Menu - Top Right Corner */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                aria-label="Link options"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isInTrash ? (
                <>
                  <DropdownMenuItem onClick={handleRestore}>
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handlePermanentDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="mr-2 size-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleSelect}>
                    <CheckSquare className="mr-2 size-4" />
                    Select
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink} className="md:hidden">
                    <Copy className="mr-2 size-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleFavorite} className="md:hidden">
                    <Star className={`mr-2 size-4 ${link.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {link.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="mr-2 size-4" />
                    Trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thumbnail */}
        <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-muted/50 rounded-t-xl">
          {link.thumbnail && !imageError ? (
            <Image
              src={link.thumbnail}
              alt={link.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-400 ease-in-out group-hover:scale-[1.03] will-change-transform"
              onError={() => setImageError(true)}
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              // OPTIMIZED: Use utility functions for consistent image optimization
              placeholder={getPlaceholder(priority)}
              blurDataURL={getBlurDataURL(priority)}
              // Use unoptimized for external images that might not be in the allowed list
              unoptimized={!isAllowedImageDomain(link.thumbnail)}
              // OPTIMIZED: Variable quality for faster loading (75 for priority, 60 for others)
              quality={getImageQuality(priority)}
              // OPTIMIZED: fetchPriority for browser-level optimization
              //@ts-ignore - fetchPriority is a valid HTML attribute
              fetchPriority={getFetchPriority(priority)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <PlatformIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/60" />
            </div>
          )}

          {/* Favorite star - Top-left corner (visible when favorited or on hover) */}
          {!isInTrash && (
            <div className={`absolute top-2.5 left-2.5 z-10 transition-all duration-200 ${link.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/90 backdrop-blur-md hover:bg-background shadow-sm border border-border/50 transition-all duration-200 hover:scale-[1.05] active:scale-95 rounded-lg"
                onClick={handleToggleFavorite}
                aria-label={link.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className={`size-4 transition-all duration-200 ${link.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                    }`}
                />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-3 sm:p-4">
          {/* Title */}
          <div className="mb-2">
            <h3 className="line-clamp-1 text-xs sm:text-sm font-semibold leading-tight text-foreground pr-6">
              {link.title || 'Untitled Link'}
            </h3>
          </div>

          {/* Description */}
          {link.description && (
            <p className="mb-2.5 line-clamp-2 text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
              {link.description}
            </p>
          )}

          {/* Footer with metadata */}
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-muted-foreground pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <PlatformIcon
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                style={{ color: platformConfig.color }}
              />
              <span className="truncate capitalize font-medium">{link.platform}</span>
              {link.folderId && !isInTrash && (
                <FolderBadge folderId={link.folderId} className="ml-1" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs flex-shrink-0 tabular-nums">
                {formatRelativeTime(link.createdAt)}
              </span>
              {/* Copy icon - Desktop only */}
              {!isInTrash && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hidden md:flex opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 rounded-lg"
                  onClick={handleCopyLink}
                  aria-label="Copy link"
                >
                  <Copy className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmPermanentDelete}
        title="Delete permanently?"
        description={`"${link.title}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}

// Memoize LinkCard to prevent unnecessary re-renders
export const LinkCard = React.memo(LinkCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.link.id === nextProps.link.id &&
    prevProps.link.isFavorite === nextProps.link.isFavorite &&
    prevProps.link.deletedAt === nextProps.link.deletedAt &&
    prevProps.link.folderId === nextProps.link.folderId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isInTrash === nextProps.isInTrash &&
    prevProps.isSelectionModeActive === nextProps.isSelectionModeActive &&
    prevProps.priority === nextProps.priority &&
    prevProps.onToggleSelect === nextProps.onToggleSelect
  );
});
