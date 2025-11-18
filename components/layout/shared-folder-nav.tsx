"use client";

/**
 * @file components/layout/shared-folder-nav.tsx
 * @description Shared folder navigation component for sidebar and mobile sidebar
 * @created 2025-10-27
 */

import * as React from "react";
import { MoreVertical, Edit, Trash, ChevronRight, ChevronDown, FolderPlus, Share2 } from "lucide-react";
import { FOLDER_ICONS } from "@/constants/folder-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/store/useStore";
import { useFolderActions } from "@/hooks/use-folder-actions";

interface FolderItemProps {
  folder: any;
  isSubFolder?: boolean;
  onFolderClick?: (folderId: string) => void;
}

/**
 * Renders a single folder item with navigation, expansion, and actions
 */
export function FolderItem({ folder, isSubFolder = false, onFolderClick }: FolderItemProps) {
  const selectedFolderId = useStore((state) => state.selectedFolderId);
  const currentView = useStore((state) => state.currentView);
  const folders = useStore((state) => state.folders);
  const expandedFolders = useStore((state) => state.expandedFolders);
  const toggleFolderExpanded = useStore((state) => state.toggleFolderExpanded);
  
  const {
    handleEditFolder,
    handleAddSubFolder,
    handleDeleteFolder,
    getFolderCount,
  } = useFolderActions();
  
  // Share modal state
  const isShareFolderModalOpen = useStore((state) => state.isShareFolderModalOpen);
  const setShareFolderModalOpen = useStore((state) => state.setShareFolderModalOpen);
  const setFolderToShare = useStore((state) => state.setFolderToShare);

  const IconOption = FOLDER_ICONS.find(icon => icon.name === folder.icon);
  const FolderIcon = IconOption?.icon || FOLDER_ICONS[15].icon;
  const iconColor = IconOption?.color || folder.color;
  const subFolders = folders.filter(f => f.parentId === folder.id);
  const hasSubFolders = subFolders.length > 0 && !isSubFolder;
  const isExpanded = expandedFolders.has(folder.id);

  const handleClick = () => {
    if (onFolderClick) {
      onFolderClick(folder.id);
    }
  };

  return (
    <>
      <div className={`group relative ${isSubFolder ? 'h-8' : 'h-9'}`}>
        {/* Chevron Button */}
        {hasSubFolders && (
          <Button
            variant="ghost"
            size="icon"
            className={`absolute left-0 top-0 ${isSubFolder ? 'h-8' : 'h-9'} w-6 shrink-0 z-20`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFolderExpanded(folder.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        )}
        
        {/* Main Folder Button */}
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedFolderId === folder.id && currentView === 'all' ? "secondary" : "ghost"}
                className={`absolute ${hasSubFolders ? 'left-6' : 'left-0'} top-0 ${isSubFolder ? 'h-8' : 'h-9'} justify-start`}
                style={{ width: hasSubFolders ? 'calc(100% - 24px - 60px)' : 'calc(100% - 60px)' }}
                onClick={handleClick}
              >
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  <FolderIcon
                    className={`${isSubFolder ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0`}
                    style={{ color: iconColor }}
                  />
                  <span className={`truncate ${isSubFolder ? 'text-xs' : 'text-xs'}`}>{folder.name}</span>
                </div>
              </Button>
            </TooltipTrigger>
            {folder.name.length > (isSubFolder ? 18 : 20) && (
              <TooltipContent side="right" className="max-w-xs">
                <p>{folder.name}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        {/* Count Badge - Fixed Position */}
        <div className={`absolute right-8 top-0 ${isSubFolder ? 'h-8' : 'h-9'} flex items-center pointer-events-none z-30`}>
          <span className="text-[11px] text-muted-foreground font-medium">{getFolderCount(folder.id)}</span>
        </div>
        
        {/* Three-Dots Menu - Fixed Position */}
        <div className={`absolute right-0 top-0 ${isSubFolder ? 'h-8' : 'h-9'} flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-40`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={isSubFolder ? 'h-7 w-7' : 'h-8 w-8'}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Folder options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isSubFolder && (
                <DropdownMenuItem onSelect={() => handleAddSubFolder(folder.id)}>
                  <FolderPlus className="mr-2 size-4" />
                  Add Sub-folder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => handleEditFolder(folder.id)}>
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-orange-600"
                onSelect={() => {
                  // Set the folder to share and open the modal
                  setFolderToShare({
                    id: folder.id,
                    name: folder.name,
                    linkCount: getFolderCount(folder.id)
                  });
                  setShareFolderModalOpen(true);
                }}
              >
                <Share2 className="mr-2 size-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => handleDeleteFolder(folder.id, folder.name)}
              >
                <Trash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sub-folders */}
      {hasSubFolders && isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-border pl-2">
          {subFolders.map((subFolder) => (
            <FolderItem
              key={subFolder.id}
              folder={subFolder}
              isSubFolder={true}
              onFolderClick={onFolderClick}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface QuickAccessNavProps {
  allLinksCount: number;
  favoritesCount: number;
  trashCount: number;
  onViewClick?: (view: 'all' | 'favorites' | 'trash') => void;
}

/**
 * Renders quick access navigation buttons (All Links, Favorites, Trash)
 */
export function QuickAccessNav({ allLinksCount, favoritesCount, trashCount, onViewClick }: QuickAccessNavProps) {
  const { Star, Trash2, Folder } = require("lucide-react");
  const currentView = useStore((state) => state.currentView);
  const selectedFolderId = useStore((state) => state.selectedFolderId);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const setSelectedFolder = useStore((state) => state.setSelectedFolder);

  const handleViewClick = (view: 'all' | 'favorites' | 'trash') => {
    if (onViewClick) {
      onViewClick(view);
    } else {
      setCurrentView(view);
      setSelectedFolder(null);
    }
  };

  return (
    <nav className="space-y-1">
      <Button
        variant={currentView === 'all' && selectedFolderId === null ? "secondary" : "ghost"}
        className="w-full justify-between gap-2"
        onClick={() => handleViewClick('all')}
      >
        <div className="flex items-center gap-2">
          <Folder className="size-4" />
          <span className="text-sm md:text-base">All Links</span>
        </div>
        <span className="text-xs text-muted-foreground">{allLinksCount}</span>
      </Button>
      <Button
        variant={currentView === 'favorites' ? "secondary" : "ghost"}
        className="w-full justify-between gap-2"
        onClick={() => handleViewClick('favorites')}
      >
        <div className="flex items-center gap-2">
          <Star className="size-4" />
          <span className="text-sm md:text-base">Favorites</span>
        </div>
        <span className="text-xs text-muted-foreground">{favoritesCount}</span>
      </Button>
      <Button
        variant={currentView === 'trash' ? "secondary" : "ghost"}
        className="w-full justify-between gap-2"
        onClick={() => handleViewClick('trash')}
      >
        <div className="flex items-center gap-2">
          <Trash2 className="size-4" />
          <span className="text-sm md:text-base">Trash</span>
        </div>
        <span className="text-xs text-muted-foreground">{trashCount}</span>
      </Button>
    </nav>
  );
}
