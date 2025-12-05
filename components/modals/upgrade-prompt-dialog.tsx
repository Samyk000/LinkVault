/**
 * @file components/modals/upgrade-prompt-dialog.tsx
 * @description Dialog prompting guest users to sign up for restricted features
 * @created 2025-12-05
 */

"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradePromptDialogProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
}

/**
 * Feature descriptions for upgrade prompts
 */
const featureDescriptions: Record<string, string> = {
  'sub-folders': 'Create nested folders to organize your links in a hierarchical structure.',
  'folder-sharing': 'Share your folders with others via a public link.',
  default: 'Access all features by creating a free account.',
};

/**
 * Dialog that prompts guest users to sign up when accessing restricted features
 * Requirements: 6.2, 6.4, 6.5
 */
export function UpgradePromptDialog({
  isOpen,
  feature,
  onClose,
}: UpgradePromptDialogProps) {
  const router = useRouter();

  const description = featureDescriptions[feature] || featureDescriptions.default;

  const handleSignUp = () => {
    onClose();
    router.push('/login?tab=signup');
  };

  const handleLogin = () => {
    onClose();
    router.push('/login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#FF4D00]" />
            <DialogTitle>Unlock This Feature</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            Sign up for a free account to unlock all features including cloud sync, 
            sub-folders, and folder sharing.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleLogin}>
            Login
          </Button>
          <Button onClick={handleSignUp}>
            Sign Up Free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
