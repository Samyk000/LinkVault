"use client";

/**
 * @file components/providers/store-initializer.tsx
 * @description Initializes store from Supabase and sets up real-time sync
 * @created 2025-10-18
 * @updated 2025-12-06 - Fixed data loading on page refresh
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
  const { setLinks, links } = useLinksStore();
  const { setFolders, folders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading } = useAuth();
  const { isGuestMode, isLoading: guestLoading } = useGuestMode();

  // FIXED: Track initialization state to ensure first load always happens
  const isInitialMount = useRef(true);
  const lastLoadedUserId = useRef<string | null>(null);
  const lastGuestMode = useRef<boolean>(false);
  const loadingInProgress = useRef(false);

  // Memoized data loading function with retry
  const loadUserData = useCallback(async (userId: string) => {
    if (loadingInProgress.current) {
      logger.debug('Data load already in progress, skipping');
      return;
    }

    loadingInProgress.current = true;
    logger.debug('Loading data for user:', userId);

    try {
      // Load all data in parallel with timeout protection
      const timeoutMs = 15000; // 15 second timeout
      const loadPromise = Promise.all([
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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Data load timeout')), timeoutMs)
      );

      const [settings, loadedFolders, loadedLinks] = await Promise.race([
        loadPromise,
        timeoutPromise.then(() => { throw new Error('timeout'); })
      ]) as [any, any[], any[]];

      // Update stores if this is still the current user
      if (lastLoadedUserId.current === userId) {
        setSettings(settings || DEFAULT_SETTINGS);
        setFolders(loadedFolders || []);
        setLinks(loadedLinks || []);
        logger.debug(`Loaded: ${loadedLinks?.length || 0} links, ${loadedFolders?.length || 0} folders`);
      }
    } catch (error) {
      logger.error('Failed to load user data:', error);
      // Set empty state on error but don't overwrite existing data if we have some
      if (lastLoadedUserId.current === userId && links.length === 0 && folders.length === 0) {
        setSettings(DEFAULT_SETTINGS);
        setFolders([]);
        setLinks([]);
      }
    } finally {
      loadingInProgress.current = false;
    }
  }, [setLinks, setFolders, setSettings, links.length, folders.length]);

  // Guest mode data loading function
  const loadGuestData = useCallback(async () => {
    if (loadingInProgress.current) {
      logger.debug('Guest data load already in progress, skipping');
      return;
    }

    loadingInProgress.current = true;
    logger.debug('Loading data for guest mode');

    try {
      const [guestLinks, guestFolders] = await Promise.all([
        guestStorageService.getAllLinksIncludingDeleted(),
        guestStorageService.getFolders(),
      ]);

      setSettings(DEFAULT_SETTINGS);
      setFolders(guestFolders || []);
      setLinks(guestLinks || []);
      logger.debug(`Guest mode loaded: ${guestLinks?.length || 0} links, ${guestFolders?.length || 0} folders`);
    } catch (error) {
      logger.error('Failed to load guest data:', error);
      setSettings(DEFAULT_SETTINGS);
      setFolders([]);
      setLinks([]);
    } finally {
      loadingInProgress.current = false;
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

    // FIXED: Force data load on initial mount OR when we have a user but empty data
    const hasNoData = links.length === 0 && folders.length === 0;
    const needsInitialLoad = isInitialMount.current && (currentUserId || isGuestMode);
    const needsDataReload = currentUserId && hasNoData && !loadingInProgress.current;

    // Handle guest mode
    if (isGuestMode && !currentUserId) {
      if (!lastGuestMode.current || needsInitialLoad || needsDataReload) {
        logger.debug('Loading guest data (initial or refresh)');
        lastGuestMode.current = true;
        lastLoadedUserId.current = null;
        isInitialMount.current = false;

        setIsLoadingData(true);
        loadGuestData().finally(() => {
          setIsLoadingData(false);
        });
      }
      return;
    }

    // Handle no user and not guest mode
    if (!currentUserId && !isGuestMode) {
      if (lastLoadedUserId.current !== null) {
        logger.debug('User logged out, clearing data');
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
        lastLoadedUserId.current = null;
      }
      lastGuestMode.current = false;
      isInitialMount.current = false;
      setIsLoadingData(false);
      return;
    }

    // Reset guest mode flag when authenticated user logs in
    if (currentUserId && lastGuestMode.current) {
      lastGuestMode.current = false;
    }

    // FIXED: Load data if:
    // 1. Initial mount with user
    // 2. User changed
    // 3. User exists but data is empty (e.g., after page refresh)
    const shouldLoadData =
      needsInitialLoad ||
      lastLoadedUserId.current !== currentUserId ||
      needsDataReload;

    if (shouldLoadData && currentUserId) {
      logger.debug(`Loading user data: initial=${needsInitialLoad}, userChanged=${lastLoadedUserId.current !== currentUserId}, noData=${needsDataReload}`);
      lastLoadedUserId.current = currentUserId;
      isInitialMount.current = false;

      setIsLoadingData(true);
      loadUserData(currentUserId).finally(() => {
        setIsLoadingData(false);
      });
    } else {
      isInitialMount.current = false;
    }

    // Set up real-time subscriptions (only for authenticated users)
    let unsubscribeLinks: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;

    const setupSubscriptions = () => {
      if (!currentUserId) return;

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
    const subscriptionTimeout = setTimeout(setupSubscriptions, 1000);

    return () => {
      clearTimeout(subscriptionTimeout);
      if (unsubscribeLinks) unsubscribeLinks();
      if (unsubscribeFolders) unsubscribeFolders();
    };
  }, [user, authLoading, isGuestMode, guestLoading, links.length, folders.length, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData, loadUserData, loadGuestData]);

  return null;
}
