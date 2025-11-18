/**
 * @file components/folders/folder-tree-item.tsx
 * @description Recursive folder tree item component for hierarchical display
 * @created 2025-10-19
 */

"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Folder } from "@/types";
import { FOLDER_ICONS } from "@/constants/folder-icons";
import { getChildFolders, getSubFolderCount } from "@/utils/folder-utils";
import { FolderActionsMenu } from "@/components/folders/folder-actions-menu";

interface FolderTreeItemProps {
  /**
   * Folder to display
   */
  folder: Folder;
  
  /**
   * All folders for finding children
   */
  allFolders: Folder[];
  
  /**
   * Currently selected folder ID
   */
  selectedId: string | null;
  
  /**
   * Callback when folder is selected
   */
  onSelect: (folderId: string) => void;
  
  /**
   * Current nesting depth (0 = root)
   */
  depth?: number;
  
  /**
   * Maximum allowed depth for display
   */
  maxDepth?: number;
  
  /**
   * Set of expanded folder IDs
   */
  expandedIds: Set<string>;
  
  /**
   * Toggle expand/collapse state
   */
  onToggleExpand: (folderId: string) => void;
  
  /**
   * Callback when folder edit is requested
   */
  onEdit?: (folderId: string) => void;
  
  /**
   * Callback when folder delete is requested
   */
  onDelete?: (folderId: string) => void;
}

/**
 * Recursive folder tree item component
 * Displays a folder with expand/collapse and handles nested children
 * 
 * Features:
 * - Recursive nesting with depth tracking
 * - Expand/collapse interaction
 * - Visual indentation based on depth
 * - Font size scaling for deep nesting
 * - Sub-folder count display
 * 
 * @example
 * <FolderTreeItem
 *   folder={folder}
 *   allFolders={folders}
 *   selectedId={selectedId}
 *   onSelect={handleSelect}
 *   expandedIds={expandedIds}
 *   onToggleExpand={handleToggle}
 * />
 */
export function FolderTreeItem({
  folder,
  allFolders,
  selectedId,
  onSelect,
  depth = 0,
  maxDepth = 5,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
}: FolderTreeItemProps) {
  // Get immediate children of this folder
  const children = getChildFolders(folder.id, allFolders);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  
  // Calculate indentation (20px per level, max 100px)
  const indentPx = Math.min(depth * 20, 100);
  
  // Font size scaling (smaller for deeper levels)
  const fontSize = depth >= 2 ? 'text-xs' : 'text-xs';
  
  // Get folder icon
  const folderIconConfig = FOLDER_ICONS.find((icon) => icon.name === folder.icon);
  const FolderIcon = folderIconConfig?.icon;
  
  // Get sub-folder count for display
  const subFolderCount = getSubFolderCount(folder.id, allFolders);

  /**
   * Handles expand/collapse toggle
   */
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleExpand(folder.id);
  };

  /**
   * Handles folder selection
   */
  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(folder.id);
  };

  return (
    <div className="folder-tree-item">
      {/* Folder Row */}
      <div
        className={`flex items-center gap-0.5 py-1 px-1.5 hover:bg-accent rounded transition-colors ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${indentPx + 6}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 flex-shrink-0 p-0 hover:bg-transparent"
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          // Spacer for alignment when no children
          <div className="h-4 w-4 flex-shrink-0" />
        )}

        {/* Folder Button */}
        <button
          onClick={handleSelect}
          className={`flex items-center gap-1.5 flex-1 min-w-0 py-0.5 px-1.5 rounded transition-colors hover:bg-accent/50 ${fontSize}`}
          aria-label={`Select ${folder.name} folder`}
          aria-pressed={isSelected}
        >
          {/* Folder Icon */}
          {FolderIcon && (
            <FolderIcon
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{ color: folder.color }}
              aria-hidden="true"
            />
          )}

          {/* Folder Name */}
          <span className="truncate text-xs font-medium">{folder.name}</span>

          {/* Sub-folder count badge (if has children) */}
          {hasChildren && subFolderCount > 0 && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              ({subFolderCount})
            </span>
          )}
        </button>

        {/* Actions Menu */}
        {onEdit && onDelete && (
          <FolderActionsMenu
            folder={{
              id: folder.id,
              name: folder.name,
              linkCount: subFolderCount, // This could be enhanced to count actual links
              shareable: !!folder.shareable,
              shareId: folder.shareId || undefined,
            }}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>

      {/* Recursive Children (if expanded) */}
      {hasChildren && isExpanded && depth < maxDepth && (
        <div className="folder-tree-children" role="group">
          {children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
              maxDepth={maxDepth}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}

      {/* Max Depth Warning (if has children but at max depth) */}
      {hasChildren && isExpanded && depth >= maxDepth && (
        <div
          className="text-xs text-muted-foreground italic ml-8 py-1"
          style={{ paddingLeft: `${indentPx + 8}px` }}
        >
          Maximum nesting depth reached
        </div>
      )}
    </div>
  );
}
