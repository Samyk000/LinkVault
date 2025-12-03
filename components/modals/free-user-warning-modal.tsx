/**
 * @file components/modals/free-user-warning-modal.tsx
 * @description Modal warning users about local storage limitations before entering free user mode
 * @created 2025-12-03
 */

"use client";

import { AlertTriangle, HardDrive, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FreeUserWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Warning modal displayed when a user chooses to continue as a free user.
 * Explains the limitations of local storage mode.
 */
export function FreeUserWarningModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: FreeUserWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <HardDrive className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle>Local Storage Mode</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <p>
                Data stays in this browser only and will be lost if you clear browser data.
              </p>
            </div>
            <div className="text-muted-foreground text-sm space-y-1">
              <p className="font-medium text-foreground">Limitations:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>No sync across devices</li>
                <li>No folder sharing</li>
                <li>No sub-folders</li>
              </ul>
            </div>
            <p className="text-muted-foreground text-xs">
              Upgrade anytime to unlock all features.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
