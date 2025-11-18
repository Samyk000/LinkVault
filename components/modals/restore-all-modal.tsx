/**
 * @file components/modals/restore-all-modal.tsx
 * @description Modal for confirming restore all action
 * @created 2025-10-31
 */

"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { cn as themeCn } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RestoreAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trashCount: number;
}

/**
 * Restore all confirmation modal
 * Confirms user wants to restore all trashed items
 * 
 * @param {RestoreAllModalProps} props - Component props
 * @returns {JSX.Element} Restore all modal component
 */
export function RestoreAllModal({
  isOpen,
  onClose,
  onConfirm,
  trashCount,
}: RestoreAllModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 dark:bg-green-500/20">
              <RotateCcw className="h-6 w-6 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <DialogTitle>Restore All Items?</DialogTitle>
              <DialogDescription className="mt-1">
                Restore all items from trash
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            All <span className="font-semibold text-foreground">{trashCount}</span> {trashCount === 1 ? 'item' : 'items'} in the trash will be restored. 
            {trashCount === 1 ? 'It' : 'They'} will be moved back to {trashCount === 1 ? 'its' : 'their'} original location.
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
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={themeCn(
              "h-9 bg-green-600 hover:bg-green-700 text-white",
              "dark:bg-green-600 dark:hover:bg-green-700"
            )}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
