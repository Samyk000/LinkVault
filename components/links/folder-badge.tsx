/**
 * @file components/links/folder-badge.tsx
 * @description Folder badge component for link cards - shows folder icon with tooltip
 * @created 2025-10-18
 */

"use client";

import { Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/store/useStore";
import { FOLDER_ICONS } from "@/constants/folder-icons";

interface FolderBadgeProps {
  /**
   * ID of the folder to display
   */
  folderId: string | null;
  
  /**
   * Optional click handler - navigates to folder by default
   */
  onClick?: (folderId: string) => void;
  
  /**
   * Optional class name for custom styling
   */
  className?: string;
}

/**
 * Displays a folder icon badge with tooltip showing folder name
 * Clicking navigates to the folder view
 * 
 * @example
 * <FolderBadge folderId={link.folderId} />
 */
export function FolderBadge({ folderId, onClick, className = "" }: FolderBadgeProps) {
  const folders = useStore((state) => state.folders);
  const setSelectedFolder = useStore((state) => state.setSelectedFolder);
  const setCurrentView = useStore((state) => state.setCurrentView);

  // Don't render if no folder ID
  if (!folderId) {
    return null;
  }

  // Find the folder
  const folder = folders.find((f) => f.id === folderId);

  // Don't render if folder not found (defensive check)
  if (!folder) {
    return null;
  }

  // Get the folder icon component
  const folderIconConfig = FOLDER_ICONS.find((icon) => icon.name === folder.icon);
  const IconComponent = folderIconConfig?.icon || FolderIcon;

  /**
  * Handles a folder badge click, preventing default behavior and delegating action.
  * @example
  * handleFolderBadgeClick(event)
  * // Navigates to the clicked folder or calls custom onClick
  * @param {React.MouseEvent} event - The click event associated with the folder badge.
  * @returns {void} No return value; performs navigation or custom callback.
  **/
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Don't trigger card click
    
    if (onClick) {
      onClick(folderId);
    } else {
      // Default behavior: navigate to folder
      setCurrentView('all');
      setSelectedFolder(folderId);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${className}`}
            onClick={handleClick}
            aria-label={`Go to ${folder.name} folder`}
          >
            <IconComponent
              className="h-4 w-4"
              style={{ color: folder.color }}
              aria-hidden="true"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{folder.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
