/**
 * @file hooks/use-online-status.ts
 * @description Hook to detect online/offline status and network connectivity
 * @created 2025-11-04
 */

import { useState, useEffect } from 'react';

/**
 * Hook to track online/offline status
 * @returns {boolean} Whether the user is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

