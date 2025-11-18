"use client";

/**
 * @file components/layout/folder-delete-modal.tsx
 * @description Shared folder delete confirmation modal
 * @created 2025-10-28
 */

import { ConfirmModal } from "@/components/modals/confirm-modal";
import { useFolderActions } from "@/hooks/use-folder-actions";

/**
 * Folder delete confirmation modal component.
 * Displays appropriate message based on folder content.
 * @returns {JSX.Element} Folder delete modal component
 */
export function FolderDeleteModal() {
  const { 
    confirmDeleteFolder,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    folderToDelete,
  } = useFolderActions();

  return (
    <ConfirmModal
      isOpen={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      onConfirm={confirmDeleteFolder}
      title="Delete folder?"
      description={
        folderToDelete
          ? folderToDelete.linkCount > 0
            ? `"${folderToDelete.name}" contains ${folderToDelete.linkCount} link${folderToDelete.linkCount > 1 ? 's' : ''}. Links will remain in "All Links".`
            : `"${folderToDelete.name}" is empty and will be deleted.`
          : ""
      }
      confirmText="Delete"
      variant="destructive"
    />
  );
}
