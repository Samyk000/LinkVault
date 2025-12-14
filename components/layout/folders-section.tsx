"use client";

/**
 * @file components/layout/folders-section.tsx
 * @description Shared folders section component for sidebar navigation
 * @created 2025-10-27
 */

import React from 'react';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { FolderItem } from "./shared-folder-nav";
import { FolderSectionSkeleton } from "@/components/ui/folder-skeleton";

interface FoldersSectionProps {
  onFolderClick?: (folderId: string) => void;
}

/**
 * Folders section component that displays folder list with add button.
 * Used in both desktop sidebar and mobile sidebar.
 * @param {FoldersSectionProps} props - Component props
 * @returns {JSX.Element} Folders section component
 */
export function FoldersSection({ onFolderClick }: FoldersSectionProps) {
  const folders = useStore((state) => state.folders);
  const isLoadingFolders = useStore((state) => state.isLoadingFolders);
  const isHydrated = useStore((state) => state.isHydrated);
  const isLoadingData = useStore((state) => state.isLoadingData);
  const setCreateFolderModalOpen = useStore((state) => state.setCreateFolderModalOpen);
  const setSelectedFolder = useStore((state) => state.setSelectedFolder);
  const setCurrentView = useStore((state) => state.setCurrentView);


  const handleFolderClick = (folderId: string) => {
    if (onFolderClick) {
      onFolderClick(folderId);
    } else {
      setCurrentView('all');
      setSelectedFolder(folderId);
    }
  };

  // Show skeleton loading when:
  // 1. Data is actively loading (NEW: primary condition)
  // 2. Loading folders
  // 3. Not hydrated yet
  // 4. Folders array is empty but we're still in initial loading phase
  if (isLoadingData || isLoadingFolders || !isHydrated || (folders.length === 0 && !isHydrated)) {
    return (
      <FolderSectionSkeleton
        showHeader={true}
        folderCount={10}
        animate={true}
      />
    );
  }

  return (
    <div>
      {/* Persistent Folder Header - Always visible regardless of loading state */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Folders
        </h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-primary/10"
          onClick={() => setCreateFolderModalOpen(true)}
          aria-label="Add folder"
        >
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      </div>

      {/* Show folder content - never show empty state during loading */}
      {folders.length > 0 ? (
        <nav className="space-y-0.5">
          {folders.filter(f => f.parentId === null).map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              onFolderClick={handleFolderClick}
            />
          ))}
        </nav>
      ) : isLoadingData ? (
        // Show skeleton loading for folder items when data is loading
        <FolderSectionSkeleton
          showHeader={false} // Don't show header skeleton since we have persistent header
          folderCount={10}
          animate={true}
        />
      ) : (
        // Only show empty state when loading is complete and no folders exist
        <div className="text-sm text-muted-foreground py-4 text-center">
          No folders yet. Create your first folder to organize your links.
        </div>
      )}
    </div>
  );
}
