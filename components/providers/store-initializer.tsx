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
import { useGuestMode } from '@/lib/contexts/guest-mode-context';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { guestStorageService } from '@/lib/services/guest-storage.service';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_SETTINGS } from '@/constants';

export function StoreInitializer() {
  const { setLinks } = useLinksStore();
  const { setFolders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading } = useAuth();
  const { isGuestMode, isLoading: guestLoading } = useGuestMode();
  
  // Track the last loaded user ID to detect user changes
  const lastLoadedUserId = useRef<string | null>(null);
  const lastGuestMode = useRef<boolean>(false);
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

  // Guest mode data loading function
  const loadGuestData = useCallback(async () => {
    logger.debug('Loading data for guest mode');
    
    try {
      // Load ALL links including deleted ones (for trash view)
      const [links, folders] = await Promise.all([
        guestStorageService.getAllLinksIncludingDeleted(),
        guestStorageService.getFolders(),
      ]);

      setSettings(DEFAULT_SETTINGS);
      setFolders(folders || []);
      setLinks(links || []);
      logger.debug(`Guest mode loaded: ${links?.length || 0} links, ${folders?.length || 0} folders`);
    } catch (error) {
      logger.error('Failed to load guest data:', error);
      setSettings(DEFAULT_SETTINGS);
      setFolders([]);
      setLinks([]);
    }
  }, [setLinks, setFolders, setSettings]);

  useEffect(() => {
    // Always mark as hydrated immediately so UI can render
    setHydrated(true);

    // Wait for auth and guest mode to finish loading
    if (authLoading || guestLoading) {
      return;
    }

    const currentUserId = user?.id || null;

    // Handle guest mode
    if (isGuestMode && !currentUserId) {
      // Guest mode is active - load guest data if not already loaded
      if (!lastGuestMode.current || loadingPromise.current === null) {
        logger.debug('Guest mode activated, loading guest data');
        lastGuestMode.current = true;
        lastLoadedUserId.current = null;
        
        setIsLoadingData(true);
        loadingPromise.current = loadGuestData().finally(() => {
          setIsLoadingData(false);
          loadingPromise.current = null;
        });
      }
      return;
    }

    // Handle no user and not guest mode
    if (!currentUserId && !isGuestMode) {
      // Only clear data if authenticated user logged out (not guest mode exit)
      // Guest data is preserved in localStorage for when they return
      if (lastLoadedUserId.current !== null) {
        logger.debug('Authenticated user logged out, clearing data');
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
        lastLoadedUserId.current = null;
      }
      // Reset guest mode flag but don't clear UI data - it will be cleared on navigation
      if (lastGuestMode.current) {
        logger.debug('Guest mode deactivated, preserving data in localStorage');
        lastGuestMode.current = false;
      }
      setIsLoadingData(false);
      return;
    }

    // Reset guest mode flag when authenticated user logs in
    if (currentUserId && lastGuestMode.current) {
      lastGuestMode.current = false;
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

    // Start loading (currentUserId is guaranteed to be non-null at this point)
    setIsLoadingData(true);
    
    loadingPromise.current = loadUserData(currentUserId!).finally(() => {
      setIsLoadingData(false);
      loadingPromise.current = null;
    });

    // Set up real-time subscriptions (only for authenticated users, not guest mode)
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
  }, [user, authLoading, isGuestMode, guestLoading, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData, loadUserData, loadGuestData]);

  return null;
}
