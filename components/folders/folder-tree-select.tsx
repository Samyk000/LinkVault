/**
 * @file components/folders/folder-tree-select.tsx
 * @description Hierarchical folder selector with tree structure
 * @created 2025-10-19
 */

"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { FolderPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { FolderTreeItem } from "./folder-tree-item";
import { getRootFolders } from "@/utils/folder-utils";

interface FolderTreeSelectProps {
  /**
   * Currently selected folder ID
   */
  value: string | null;

  /**
   * Callback when selection changes
   */
  onChange: (folderId: string | null) => void;

  /**
   * Optional placeholder text
   */
  placeholder?: string;

  /**
   * Allow clearing selection
   */
  allowClear?: boolean;
}

/**
 * Hierarchical folder tree selector component
 * 
 * Features:
 * - Tree structure with expand/collapse
 * - Search/filter functionality
 * - Sub-folder count display
 * - Visual depth indication
 * - Keyboard navigation support
 * - Clear selection option
 * 
 * @example
 * <FolderTreeSelect
 *   value={selectedFolderId}
 *   onChange={setSelectedFolderId}
 *   allowClear
 * />
 */
export function FolderTreeSelectComponent({
  value,
  onChange,
  placeholder = "Select a folder",
  allowClear = true,
}: FolderTreeSelectProps) {
  const folders = useStore((state) => state.folders);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Toggles expand/collapse state for a folder
   */
  const handleToggleExpand = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  /**
   * Handles folder selection
   */
  const handleSelect = (folderId: string) => {
    onChange(folderId);
    setIsOpen(false); // Close dropdown after selection
  };

  // Get root folders
  const rootFolders = useMemo(() => {
    return getRootFolders(folders);
  }, [folders]);

  // Get selected folder for display
  const selectedFolder = useMemo(() => {
    if (!value) return null;
    return folders.find((f) => f.id === value);
  }, [value, folders]);

  return (
    <div ref={containerRef} className="folder-tree-select relative">
      {/* Dropdown Trigger with positioning context */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${isOpen ? 'rounded-b-none border-b-0' : ''}`}
        >
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border mr-2">Folder</span>
          <span className={selectedFolder ? "text-foreground text-sm flex-1 text-left" : "text-muted-foreground text-xs flex-1 text-left"}>
            {selectedFolder ? selectedFolder.name : "Select folder (optional)"}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 opacity-50 flex-shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0 ml-2" />
          )}
        </button>

        {/* Dropdown Content - Opens seamlessly above button */}
        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="rounded-t-md border border-b-0 bg-popover shadow-md">
              <div className="max-h-[180px] overflow-y-auto overflow-x-hidden py-1 custom-scrollbar animate-in fade-in duration-150 delay-75">
                {rootFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-center px-2">
                    <FolderPlus className="size-5 text-muted-foreground mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                      No folders yet
                    </p>
                  </div>
                ) : (
                  <>
                    {/* None option */}
                    {allowClear && (
                      <button
                        type="button"
                        onClick={() => {
                          onChange(null);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
                      >
                        <span className="text-muted-foreground italic">None</span>
                      </button>
                    )}

                    {/* Folder tree */}
                    <div className="space-y-0.5 mt-0.5" role="tree" aria-label="Folder tree">
                      {rootFolders.map((folder) => (
                        <FolderTreeItem
                          key={folder.id}
                          folder={folder}
                          allFolders={folders}
                          selectedId={value}
                          onSelect={handleSelect}
                          expandedIds={expandedIds}
                          onToggleExpand={handleToggleExpand}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const FolderTreeSelect = React.memo(FolderTreeSelectComponent);

