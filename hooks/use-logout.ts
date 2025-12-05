import { useState, useRef } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/store/useStore';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { globalCache } from '@/lib/services/cache-manager';
import { performanceMonitor } from '@/lib/services/performance-monitor.service';

export function useLogout() {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  const handleLogout = async () => {
    // Prevent double-click
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // 1. Show button spinner
    setIsLoggingOut(true);

    // 2. Small delay to ensure spinner renders
    await new Promise(resolve => setTimeout(resolve, 10));

    // CRITICAL: Set logout flag
    if (typeof window !== 'undefined') {
      localStorage.setItem('linkvault_logging_out', 'true');
    }

    // 3. Clear cache and localStorage (synchronous)
    try {
      globalCache.clear();
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('linkvault_') || key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('linkvault_logging_out');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }

    // 4. Clear performance monitor
    try {
      performanceMonitor.clearData();
    } catch (error) {
      console.error('Error clearing performance data:', error);
    }

    // 5. Unsubscribe from realtime
    try {
      supabaseDatabaseService.unsubscribeAll();
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }

    // 6. Clear cookies
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth-token') || name === 'guest_mode') {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          }
        });
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }

    // 7. Sign out from Supabase (non-blocking)
    signOut().catch(console.error);

    // 8. Small delay to ensure spinner is visible before redirect
    await new Promise(resolve => setTimeout(resolve, 100));

    // 9. Redirect immediately
    window.location.replace('/login');
  };

  return {
    handleLogout,
    isLoggingOut
  };
}
