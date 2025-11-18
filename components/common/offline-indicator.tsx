"use client";

/**
 * @file components/common/offline-indicator.tsx
 * @description Global indicator shown when the user is offline
 * @created 2025-11-12
 */

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Displays a sticky alert banner when the user goes offline.
 * Automatically dismisses when connection is restored.
 * @example
 * <OfflineIndicator />
 * // Shows "You're offline. Changes will sync when you're back online."
 * @returns {JSX.Element | null} Alert banner or null if online
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // User just went offline
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // User came back online - show recovery message briefly
      const timer = setTimeout(() => {
        setShow(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <Alert
        variant={isOnline ? "default" : "destructive"}
        className={`rounded-none border-x-0 border-t-0 ${
          isOnline ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""
        }`}
      >
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          {isOnline
            ? "You're back online! All changes have been synced."
            : "You're offline. Changes will sync when you're back online."}
        </AlertDescription>
      </Alert>
    </div>
  );
}

