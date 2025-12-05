/**
 * @file components/modals/guest-mode-warning-dialog.tsx
 * @description Warning dialog shown before activating guest mode
 * @created 2025-12-05
 */

"use client";

import { AlertTriangle, CloudOff, Trash2, FolderX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GuestModeWarningDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Warning dialog that displays guest mode limitations before activation
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export function GuestModeWarningDialog({
  isOpen,
  onConfirm,
  onCancel,
}: GuestModeWarningDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <DialogTitle>Try Guest Mode</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Guest mode lets you try the app without creating an account. Please note the following limitations:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 text-sm">
            <CloudOff className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Your links won&apos;t be synced across devices
            </span>
          </div>
          
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              You won&apos;t be able to access your links except in this browser
            </span>
          </div>
          
          <div className="flex items-start gap-3 text-sm">
            <Trash2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Once you clear the history, you&apos;ll lose all your saved data
            </span>
          </div>

          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium text-foreground mb-2">Feature limitations:</p>
            <div className="flex items-start gap-3 text-sm">
              <FolderX className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                No sub-folder creation and no folder sharing functionality
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Continue as Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
