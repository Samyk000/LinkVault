"use client";

/**
 * @file components/providers/store-initializer.tsx
 * @description Initializes store from Supabase and sets up real-time sync
 * @created 2025-10-18
 * @updated 2025-12-04 - Simplified session handling to fix data loading issues
 */

import { useEffect, useRef } from 'react';
import { useLinksStore } from '@/store/useLinksStore';
import { useFoldersStore } from '@/store/useFoldersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_SETTINGS } from '@/constants';
import { Link, Folder, AppSettings } from '@/types';

export function StoreInitializer() {
  const { setLinks } = useLinksStore();
  const { setFolders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading } = useAuth();
  
  const prevUserId = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const currentUserId = user?.id || null;

    // Handle user change (login/logout/switch)
    if (prevUserId.current !== currentUserId) {
      logger.debug('User changed:', { from: prevUserId.current, to: currentUserId });
      
      // Clear data when user changes
      if (prevUserId.current !== null || currentUserId === null) {
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
      }
      
      prevUserId.current = currentUserId;
      isLoadingRef.current = false; // Allow new load
    }

    // No user - just mark as hydrated
    if (!user) {
      setHydrated(true);
      setIsLoadingData(false);
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    // Load user data
    const loadData = async () => {
      isLoadingRef.current = true;
      setIsLoadingData(true);
      setHydrated(true); // Allow UI to render immediately

      try {
        logger.debug('Loading user data...');

        // Load all data in parallel with timeout
        const loadPromise = Promise.all([
          supabaseDatabaseService.getSettings().catch(() => null),
          supabaseDatabaseService.getFolders().catch(() => []),
          supabaseDatabaseService.getLinks().catch(() => [])
        ]);

        const timeoutPromise = new Promise<[AppSettings | null, Folder[], Link[]]>((_, reject) =>
          setTimeout(() => reject(new Error('Data load timeout')), 15000)
        );

        const [settings, folders, links] = await Promise.race([loadPromise, timeoutPromise]);

        // Only update if user hasn't changed during load
        if (user?.id === currentUserId) {
          setSettings(settings || DEFAULT_SETTINGS);
          setFolders(folders || []);
          setLinks(links || []);
          logger.debug(`Loaded: ${links?.length || 0} links, ${folders?.length || 0} folders`);
        }
      } catch (error) {
        logger.error('Failed to load data:', error);
        
        // Set empty state on error
        if (user?.id === currentUserId) {
          setSettings(DEFAULT_SETTINGS);
          setFolders([]);
          setLinks([]);
        }
        
        // Allow retry on next effect run
        isLoadingRef.current = false;
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();

    // Set up real-time subscriptions
    let unsubscribeLinks: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;
    let subscriptionTimeout: NodeJS.Timeout | null = null;

    const setupSubscriptions = () => {
      try {
        unsubscribeLinks = supabaseDatabaseService.subscribeToLinks((updatedLinks) => {
          if (user?.id === currentUserId) {
            setLinks(updatedLinks);
          }
        });

        unsubscribeFolders = supabaseDatabaseService.subscribeToFolders((updatedFolders) => {
          if (user?.id === currentUserId) {
            setFolders(updatedFolders);
          }
        });
      } catch (error) {
        logger.warn('Real-time subscriptions failed:', error);
      }
    };

    // Delay subscriptions to prioritize initial load
    subscriptionTimeout = setTimeout(setupSubscriptions, 1000);

    return () => {
      if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
      if (unsubscribeLinks) unsubscribeLinks();
      if (unsubscribeFolders) unsubscribeFolders();
    };
  }, [user, authLoading, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData]);

  return null;
}
