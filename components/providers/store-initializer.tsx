"use client";

/**
 * @file components/providers/store-initializer.tsx
 * @description Initializes store from Supabase and sets up real-time sync
 * @created 2025-10-18
 * @updated 2025-12-04 - Complete rewrite for reliable data loading
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLinksStore } from '@/store/useLinksStore';
import { useFoldersStore } from '@/store/useFoldersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_SETTINGS } from '@/constants';

export function StoreInitializer() {
  const { setLinks } = useLinksStore();
  const { setFolders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading } = useAuth();
  
  // Track the last loaded user ID to detect user changes
  const lastLoadedUserId = useRef<string | null>(null);
  const loadingPromise = useRef<Promise<void> | null>(null);

  // Memoized data loading function
  const loadUserData = useCallback(async (userId: string) => {
    logger.debug('Loading data for user:', userId);
    
    try {
      // Load all data in parallel
      const [settings, folders, links] = await Promise.all([
        supabaseDatabaseService.getSettings().catch((e) => {
          logger.warn('Failed to load settings:', e);
          return null;
        }),
        supabaseDatabaseService.getFolders().catch((e) => {
          logger.warn('Failed to load folders:', e);
          return [];
        }),
        supabaseDatabaseService.getLinks().catch((e) => {
          logger.warn('Failed to load links:', e);
          return [];
        })
      ]);

      // Only update stores if this is still the current user
      if (lastLoadedUserId.current === userId) {
        setSettings(settings || DEFAULT_SETTINGS);
        setFolders(folders || []);
        setLinks(links || []);
        logger.debug(`Loaded: ${links?.length || 0} links, ${folders?.length || 0} folders`);
      }
    } catch (error) {
      logger.error('Failed to load user data:', error);
      // Set empty state on error
      if (lastLoadedUserId.current === userId) {
        setSettings(DEFAULT_SETTINGS);
        setFolders([]);
        setLinks([]);
      }
    }
  }, [setLinks, setFolders, setSettings]);

  useEffect(() => {
    // Always mark as hydrated immediately so UI can render
    setHydrated(true);

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const currentUserId = user?.id || null;

    // Handle no user case
    if (!currentUserId) {
      // Clear data if user logged out
      if (lastLoadedUserId.current !== null) {
        logger.debug('User logged out, clearing data');
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
        lastLoadedUserId.current = null;
      }
      setIsLoadingData(false);
      return;
    }

    // Check if we need to load data for this user
    if (lastLoadedUserId.current === currentUserId && loadingPromise.current === null) {
      // Already loaded for this user
      return;
    }

    // User changed or first load - load data
    if (lastLoadedUserId.current !== currentUserId) {
      logger.debug('User changed, loading new data');
      // Clear old data immediately
      if (lastLoadedUserId.current !== null) {
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
      }
      lastLoadedUserId.current = currentUserId;
    }

    // Start loading
    setIsLoadingData(true);
    
    loadingPromise.current = loadUserData(currentUserId).finally(() => {
      setIsLoadingData(false);
      loadingPromise.current = null;
    });

    // Set up real-time subscriptions
    let unsubscribeLinks: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;

    const setupSubscriptions = () => {
      try {
        unsubscribeLinks = supabaseDatabaseService.subscribeToLinks((updatedLinks) => {
          if (lastLoadedUserId.current === currentUserId) {
            setLinks(updatedLinks);
          }
        });

        unsubscribeFolders = supabaseDatabaseService.subscribeToFolders((updatedFolders) => {
          if (lastLoadedUserId.current === currentUserId) {
            setFolders(updatedFolders);
          }
        });
      } catch (error) {
        logger.warn('Real-time subscriptions failed:', error);
      }
    };

    // Delay subscriptions slightly to prioritize initial load
    const subscriptionTimeout = setTimeout(setupSubscriptions, 500);

    return () => {
      clearTimeout(subscriptionTimeout);
      if (unsubscribeLinks) unsubscribeLinks();
      if (unsubscribeFolders) unsubscribeFolders();
    };
  }, [user, authLoading, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData, loadUserData]);

  return null;
}
