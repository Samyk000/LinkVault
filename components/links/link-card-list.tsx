/**
 * @file components/links/link-card-list.tsx
 * @description List view variant of link card - horizontal layout
 * @created 2025-10-18
 */

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, Star, MoreVertical, Edit, Trash2, Copy, RotateCcw, XCircle, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { cn } from "@/lib/utils"
import { cn as themeCn } from "@/lib/theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link as LinkType } from "@/types";
import { getPlatformConfig } from "@/utils/platform";
import { formatRelativeTime } from "@/utils/date";
import { useStore } from "@/store/useStore";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/hooks/use-toast";
import { FolderBadge } from "./folder-badge";
import * as LucideIcons from "lucide-react";

/**
 * Check if an image URL is from an allowed domain
 * @param url - Image URL to check
 * @returns {boolean} Whether the domain is in the allowed list
 */
function isAllowedImageDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedDomains = [
      'img.youtube.com',
      'i.ytimg.com',
      'pbs.twimg.com',
      'scontent.cdninstagram.com',
      'instagram.com',
      'media.licdn.com',
      'avatars.githubusercontent.com',
      'github.com',
      'miro.medium.com',
      'cdn-images-1.medium.com',
      'external-preview.redd.it',
      'preview.redd.it',
      'scontent.xx.fbcdn.net',
      'p16-sign-sg.tiktokcdn.com',
      'images.unsplash.com',
      'via.placeholder.com',
      'c1.tablecdn.com',
      'www.google.com',
      'www.google.com.sg',
      'favicons.githubusercontent.com',
      'logo.clearbit.com',
      'icons.duckduckgo.com',
      'www.favicon.cc',
    ];
    return allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
  } catch {
    // If URL parsing fails, assume it's not allowed
    return false;
  }
}

interface LinkCardListProps {
  link: LinkType;
  isInTrash?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (linkId: string) => void;
  isSelectionModeActive?: boolean;
  priority?: boolean; // For LCP optimization - prioritize above-the-fold images
}

/**
 * List view card component
 * Displays link information in horizontal layout for list view
 * OPTIMIZED: On desktop, hides descriptions and uses smaller elements for compact display
 *
 * @example
 * <LinkCardList link={link} />
 */
function LinkCardListComponent({ link, isInTrash = false, isSelected = false, onToggleSelect, isSelectionModeActive = false, priority = false }: LinkCardListProps) {
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const deleteLink = useStore((state) => state.deleteLink);
  const restoreLink = useStore((state) => state.restoreLink);
  const permanentlyDeleteLink = useStore((state) => state.permanentlyDeleteLink);
  const setEditingLink = useStore((state) => state.setEditingLink);
  const setAddLinkModalOpen = useStore((state) => state.setAddLinkModalOpen);
  const { toast } = useToast();

  const platformConfig = getPlatformConfig(link.platform);
  const PlatformIcon = (LucideIcons as any)[platformConfig.icon] || Link;

  const handleOpenLink = () => {
    // If in selection mode, toggle selection instead of opening link
    if (isSelectionModeActive && onToggleSelect) {
      onToggleSelect(link.id);
      return;
    }
    // Otherwise, open the link
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const handleSelect = () => {
    onToggleSelect?.(link.id);
  };

  /**
  * Handles toggling the favorite status of a link and displays a toast notification in one line
  * @example
  * handleToggleFavorite(e)
  * // Nothing is returned
  * @param {React.MouseEvent} e - Mouse event triggered by the user.
  * @returns {void} No return value.
  **/
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasFavorite = link.isFavorite;
    try {
      await toggleFavorite(link.id);
      toast({
        title: wasFavorite ? "Unfavorited" : "Favorited",
        variant: "success",
        icon: <Star className={`size-4 ${!wasFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />,
      });
    } catch (error) {
      logger.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link.url);
    toast({
      title: "Copied",
      variant: "info",
      icon: <Copy className="size-4" />,
    });
  };

  const handleEdit = () => {
    setEditingLink(link.id);
    setAddLinkModalOpen(true);
  };

  /**
  * Deletes the specified link and shows a toast notification with an undo option.
  * @example
  * deleteLinkHandler(link)
  * // Displays a toast and removes the link; returns nothing.
  * @param {{Object}} {{link}} - Link object containing at least an `id` property.
  * @returns {{void}} No return value.
  **/
  const handleDelete = () => {
    const linkId = link.id;
    deleteLink(linkId);
    toast({
      title: "Deleted",
      variant: "destructive",
      icon: <Trash2 className="size-4" />,
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
  };

  const handleRestore = () => {
    restoreLink(link.id);
    toast({
      title: "Restored",
      variant: "success",
      icon: <RotateCcw className="size-4" />,
    });
  };

  const handlePermanentDelete = () => {
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
      icon: <XCircle className="size-4" />,
    });
  };

  /**
   * Handles undo delete operation
   */
  const handleUndoDelete = (linkId: string) => {
    restoreLink(linkId);
    toast({
      title: "Restored",
      description: "(1)",
      variant: "success",
      icon: <RotateCcw className="size-4" />,
    });
  };

  return (
    <>
      <Card
        className={`group relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out hover:shadow-md border-2 rounded-xl will-change-transform ${isSelected 
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/50' 
            : 'border-border/50 hover:border-border'
        }`}
        onClick={handleOpenLink}
      >
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 md:p-2">
        {/* Thumbnail - Micro-compact for extreme density */}
        <div className="relative h-8 w-12 sm:h-10 sm:w-14 md:h-10 md:w-14 flex-shrink-0 overflow-hidden rounded-sm bg-muted/50">
          {link.thumbnail && !imageError ? (
            <Image
              src={link.thumbnail}
              alt={link.title}
              fill
              sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 128px"
              className="object-cover transition-transform duration-400 ease-in-out group-hover:scale-[1.03] will-change-transform"
              onError={() => setImageError(true)}
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              // Use unoptimized for external images that might not be in the allowed list
              unoptimized={!isAllowedImageDomain(link.thumbnail)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <PlatformIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 text-muted-foreground/60" />
            </div>
          )}
        </div>

        {/* Content - Title only for extreme compactness */}
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-1 text-xs font-semibold leading-tight text-foreground">
            {link.title}
          </h3>
          {/* REMOVE descriptions completely for maximum density */}
          
          {/* Metadata Row - Ultra-minimal for mobile */}
          <div className="flex items-center gap-1 mt-0 pt-0">
            <div
              className="flex items-center justify-center"
              style={{ color: platformConfig.color }}
              title={platformConfig.name}
            >
              <PlatformIcon className="h-2 w-2" />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRelativeTime(link.createdAt)}
            </span>
          </div>
        </div>

        {/* Right: Actions - Desktop hover, mobile menu-only */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Favorite Star - Desktop hover only */}
          <div className={`hidden md:flex flex-shrink-0 transition-all duration-300 ${
            link.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-3.5 w-3.5 hover:scale-[1.05] active:scale-95 transition-transform duration-200"
              onClick={handleToggleFavorite}
              aria-label={link.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`h-2 w-2 transition-all duration-200 ${
                  link.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                }`}
              />
            </Button>
          </div>

          {/* Copy Button - Desktop hover only */}
          {!isInTrash && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyLink();
              }}
              aria-label="Copy link"
            >
              <Copy className="h-2 w-2 text-muted-foreground hover:text-foreground" />
            </Button>
          )}

          {/* More Actions Menu - Mobile-optimized */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="size-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {isInTrash ? (
                <>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleRestore();
                    }}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handlePermanentDelete();
                    }}
                  >
                    <XCircle className="mr-2 size-4" />
                    Delete Forever
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleSelect();
                    }}
                  >
                    <CheckSquare className="mr-2 size-4" />
                    Select
                  </DropdownMenuItem>
                  {/* Star - Mobile only */}
                  <DropdownMenuItem
                    className="md:hidden"
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleToggleFavorite(e as any);
                    }}
                  >
                    <Star className={`mr-2 size-4 ${
                      link.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                    }`} />
                    {link.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="md:hidden"
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleCopyLink();
                    }}
                  >
                    <Copy className="mr-2 size-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleEdit();
                    }}
                  >
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => {
                      e?.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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

// Memoize LinkCardList to prevent unnecessary re-renders
export const LinkCardList = React.memo(LinkCardListComponent, (prevProps, nextProps) => {
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
