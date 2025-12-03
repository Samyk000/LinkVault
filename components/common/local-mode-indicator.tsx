/**
 * @file components/common/local-mode-indicator.tsx
 * @description Subtle indicator showing the user is in local/free user mode
 * @created 2025-12-03
 */

"use client";

import { useState, useEffect } from "react";
import { HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/contexts/auth-context";

/**
 * Displays a subtle badge indicating the user is in local storage mode.
 * Only renders when the user is in free user mode.
 * Uses useEffect to avoid hydration mismatch.
 */
export function LocalModeIndicator() {
  const { isFreeUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server or before mount
  if (!mounted || !isFreeUser) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="gap-1 text-xs font-normal text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 cursor-help"
          >
            <HardDrive className="size-3" />
            Local Mode
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <p className="text-sm">
            Your data is stored locally in this browser. 
            Upgrade to a full account to sync across devices.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
