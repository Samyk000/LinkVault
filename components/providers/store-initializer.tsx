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
  const { setLinks } = useLinksStore();
  const { setFolders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading, isSessionReady } = useAuth();
  const { isGuestMode, isLoading: guestLoading } = useGuestMode();

  // FIXED: Track initialization state to ensure first load always happens
  const isInitialMount = useRef(true);
  const lastLoadedUserId = useRef<string | null>(null);
  const lastGuestMode = useRef<boolean>(false);
  const loadingInProgress = useRef(false);
  const hasLoadedData = useRef(false); // Track if we've successfully loaded data

  // Memoized data loading function with retry
  // FIXED: Removed links.length and folders.length from dependencies to prevent circular updates
  const loadUserData = useCallback(async (userId: string) => {
    if (loadingInProgress.current) {
      logger.debug('Data load already in progress, skipping');
      return;
    }

    loadingInProgress.current = true;
    logger.debug('Loading data for user:', userId);

    try {
      // Load all data in parallel with timeout protection
      const timeoutMs = 20000; // 20 second timeout (increased for reliability)
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
        hasLoadedData.current = true; // Mark that we've successfully loaded data
        logger.debug(`Loaded: ${loadedLinks?.length || 0} links, ${loadedFolders?.length || 0} folders`);
      }
    } catch (error) {
      logger.error('Failed to load user data:', error);
      // Set empty state on error only if we haven't loaded data before
      if (lastLoadedUserId.current === userId && !hasLoadedData.current) {
        setSettings(DEFAULT_SETTINGS);
        setFolders([]);
        setLinks([]);
      }
    } finally {
      loadingInProgress.current = false;
    }
  }, [setLinks, setFolders, setSettings]); // FIXED: Removed circular dependencies

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

    // HARDENED: Wait for auth and guest mode to finish loading
    // Don't proceed until we have a definitive auth state
    if (authLoading || guestLoading) {
      setIsLoadingData(true); // Show loading while auth is determining
      return;
    }

    const currentUserId = user?.id || null;

    // HARDENED: Deterministic data loading conditions
    // No timing assumptions - only load when state is definitively known
    
    // Case 1: Guest mode (no auth needed)
    if (isGuestMode && !currentUserId) {
      const shouldLoadGuest = !lastGuestMode.current || isInitialMount.current;
      
      if (shouldLoadGuest && !loadingInProgress.current) {
        logger.debug('Loading guest data');
        lastGuestMode.current = true;
        lastLoadedUserId.current = null;
        isInitialMount.current = false;
        hasLoadedData.current = false;

        setIsLoadingData(true);
        loadGuestData().finally(() => {
          setIsLoadingData(false);
          hasLoadedData.current = true;
        });
      }
      return;
    }

    // Case 2: No user and not guest mode
    // CHROMIUM FIX: Only clear data if session is definitively ready
    // On Chromium mobile, isSessionReady=false means we're still waiting for IndexedDB
    if (!currentUserId && !isGuestMode) {
      if (isSessionReady) {
        // Session is definitively "no user" - clear data
        if (lastLoadedUserId.current !== null || isInitialMount.current) {
          logger.debug('No user (confirmed), clearing data');
          setLinks([]);
          setFolders([]);
          setSettings(DEFAULT_SETTINGS);
          lastLoadedUserId.current = null;
          hasLoadedData.current = false;
        }
        lastGuestMode.current = false;
        isInitialMount.current = false;
        setIsLoadingData(false);
      } else {
        // CHROMIUM FIX: Session not ready yet - stay in loading state
        // Don't clear data or mark as initialized - user may appear later
        logger.debug('No user yet, but session not ready - waiting for auth confirmation');
        setIsLoadingData(true);
      }
      return;
    }

    // Case 3: Authenticated user - wait for session to be ready
    if (currentUserId && !isSessionReady) {
      // Session exists but not ready - keep loading state, don't fetch yet
      logger.debug('User exists but session not ready, waiting...');
      setIsLoadingData(true);
      return;
    }

    // Case 4: Authenticated user with ready session
    if (currentUserId && isSessionReady) {
      // Reset guest mode flag when authenticated user logs in
      if (lastGuestMode.current) {
        lastGuestMode.current = false;
        hasLoadedData.current = false;
      }

      // Determine if we need to load data
      const userChanged = lastLoadedUserId.current !== currentUserId;
      const needsLoad = isInitialMount.current || userChanged || !hasLoadedData.current;

      if (needsLoad && !loadingInProgress.current) {
        logger.debug(`Loading user data: initial=${isInitialMount.current}, userChanged=${userChanged}, hasData=${hasLoadedData.current}`);
        lastLoadedUserId.current = currentUserId;
        isInitialMount.current = false;

        setIsLoadingData(true);
        loadUserData(currentUserId).finally(() => {
          setIsLoadingData(false);
        });
      } else {
        isInitialMount.current = false;
        // Data already loaded, ensure loading state is false
        if (!loadingInProgress.current) {
          setIsLoadingData(false);
        }
      }
    }

    // Set up real-time subscriptions (only for authenticated users with ready session)
    let unsubscribeLinks: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;

    const setupSubscriptions = () => {
      if (!currentUserId || !isSessionReady) return;

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
  }, [user, authLoading, isGuestMode, guestLoading, isSessionReady, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData, loadUserData, loadGuestData]);

  return null;
}
