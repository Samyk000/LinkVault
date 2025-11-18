/**
 * @file components/modals/empty-trash-modal.tsx
 * @description Modal for confirming empty trash action
 * @created 2025-10-30
 */

"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EmptyTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trashCount: number;
}

/**
 * Empty trash confirmation modal
 * Warns user that all trashed items will be permanently deleted
 * 
 * @param {EmptyTrashModalProps} props - Component props
 * @returns {JSX.Element} Empty trash modal component
 */
export function EmptyTrashModal({
  isOpen,
  onClose,
  onConfirm,
  trashCount,
}: EmptyTrashModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Empty Trash?</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            All <span className="font-semibold text-foreground">{trashCount}</span> {trashCount === 1 ? 'item' : 'items'} in the trash will be permanently deleted. 
            You will not be able to restore {trashCount === 1 ? 'it' : 'them'}.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="h-9"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Empty Trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
