"use client";

/**
 * @file components/providers/store-initializer.tsx
 * @description Initializes store from Supabase and sets up real-time sync
 * @created 2025-10-18
 * @updated 2025-11-02 - Added Supabase integration with real-time sync
 * @updated 2025-11-02 - Fixed authentication timing issue
 * @updated 2025-11-12 - Fixed undefined function references
 */

import React, { useEffect, useRef } from 'react';
import { useLinksStore } from '@/store/useLinksStore';
import { useFoldersStore } from '@/store/useFoldersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/lib/contexts/auth-context';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { performanceMonitor } from '@/lib/services/performance-monitor.service';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_SETTINGS } from '@/constants';
import { createClient } from '@/lib/supabase/client';
import { Link, Folder, AppSettings } from '@/types';
import type { AuthResponse } from '@supabase/supabase-js';
import { getStorageService, isFreeUser } from '@/lib/services/storage-provider';

export function StoreInitializer() {
  // Use modular stores
  const { setLinks } = useLinksStore();
  const { setFolders } = useFoldersStore();
  const { setSettings } = useSettingsStore();
  const { setHydrated, setIsLoadingData } = useUIStore();
  const { user, loading: authLoading, isFreeUser: isFreeUserAuth } = useAuth();
  const hasLoaded = useRef(false);
  const prevUserId = useRef<string | null>(null);
  const prevIsFreeUser = useRef<boolean>(false);

  useEffect(() => {
    // CRITICAL: Check for logout flag in localStorage (set by logout handler)
    // This prevents loading data after logout
    if (typeof window !== 'undefined') {
      const isLoggingOut = localStorage.getItem('linkvault_logging_out');
      if (isLoggingOut === 'true') {
        // Logout in progress, don't load data
        setHydrated(true);
        return;
      }
    }

    // Wait for authentication to complete
    if (authLoading) {
      return; // Still loading auth, don't do anything yet
    }

    // Check if user has changed (logout or login with different user)
    const currentUserId = user?.id || null;
    const currentIsFreeUser = isFreeUserAuth || isFreeUser();
    
    if (prevUserId.current !== currentUserId || prevIsFreeUser.current !== currentIsFreeUser) {
      // User changed, clear old data and reset loading state
      setLinks([]);
      setFolders([]);
      setSettings(DEFAULT_SETTINGS); // Reset to defaults, will be loaded properly later
      hasLoaded.current = false;
      // Force re-render by setting isHydrated to false
      setHydrated(false);
    }
    prevUserId.current = currentUserId;
    prevIsFreeUser.current = currentIsFreeUser;

    // Only load data if user is authenticated (including free users)
    if (!user && !currentIsFreeUser) {
      // No user and not free user, don't try to load data
      // Set hydrated to true so app doesn't show infinite loading
      setHydrated(true);
      return;
    }

    // Prevent double loading
    if (hasLoaded.current) {
      return;
    }
    hasLoaded.current = true;

    // CRITICAL: Enhanced session validation with mobile-specific handling
    const validateSessionAndLoad = async () => {
      // Skip session validation for free users - they use localStorage
      const isLocalMode = isFreeUser();
      if (isLocalMode) {
        logger.debug('Free user mode detected, skipping session validation');
        initializeData();
        return;
      }
      
      try {
        // Mobile browsers need special handling due to storage limitations
        const isMobile = typeof window !== 'undefined' &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
          logger.debug('Mobile browser detected, using enhanced session validation');

          // Try multiple session validation strategies for mobile
          let session = null;
          let validationError = null;

          // Strategy 1: Direct Supabase session check
          try {
            const { data: { session: supabaseSession }, error } = await createClient().auth.getSession();
            if (!error && supabaseSession) {
              session = supabaseSession;
              logger.debug('Mobile session validated via Supabase');
            }
          } catch (error) {
            validationError = error;
            logger.warn('Mobile Supabase session validation failed:', error);
          }

          // Strategy 2: If no session found, try manual localStorage check
          if (!session && typeof window !== 'undefined') {
            try {
              const storedSession = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
              if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                if (sessionData?.access_token && sessionData?.user) {
                  // Try to set the session manually
                  const { data: { session: manualSession }, error } = await createClient().auth.setSession({
                    access_token: sessionData.access_token,
                    refresh_token: sessionData.refresh_token
                  });

                  if (!error && manualSession) {
                    session = manualSession;
                    logger.debug('Mobile session recovered via localStorage');
                  }
                }
              }
            } catch (storageError) {
              logger.warn('Mobile localStorage session recovery failed:', storageError);
            }
          }

          if (!session) {
            logger.warn('Mobile session validation failed completely, skipping data load');
            setHydrated(true);
            return;
          }
        } else {
          // Standard session validation for desktop
          // RETRY LOGIC: Try to get session multiple times if it fails initially
          // This fixes race conditions where useAuth has user (from SSR) but client SDK isn't ready
          let session = null;
          const maxRetries = 3;

          for (let i = 0; i < maxRetries; i++) {
            const { data: { session: currentSession }, error } = await createClient().auth.getSession();

            if (currentSession && !error) {
              session = currentSession;
              break;
            }

            // If we have a user but no session, wait and retry
            if (user && i < maxRetries - 1) {
              logger.debug(`Session not ready yet, retrying (${i + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          if (!session) {
            logger.warn('Desktop session validation failed after retries, skipping data load');
            setHydrated(true);
            return;
          }
        }

        // Session is valid, proceed with data loading
        initializeData();
      } catch (error) {
        logger.error('Session validation error:', error);
        setHydrated(true);
      }
    };

    // Function to load data from storage (local or Supabase)
    const loadDataFromStorage = async () => {
      const isLocalMode = isFreeUser();
      const storageService = getStorageService();
      
      try {
        logger.debug(`Loading data from ${isLocalMode ? 'localStorage' : 'Supabase'}...`);

        // Load all data in parallel
        const [settingsResult, foldersResult, linksResult] = await Promise.allSettled([
          storageService.getSettings(),
          storageService.getFolders(),
          storageService.getLinks()
        ]);

        // Extract results with fallbacks
        const settings: AppSettings = settingsResult.status === 'fulfilled' && settingsResult.value
          ? settingsResult.value
          : DEFAULT_SETTINGS;
        const folders: Folder[] = foldersResult.status === 'fulfilled' && foldersResult.value
          ? foldersResult.value
          : [];
        const links: Link[] = linksResult.status === 'fulfilled' && linksResult.value
          ? linksResult.value
          : [];

        logger.debug(`Loaded ${links.length} links, ${folders.length} folders from ${isLocalMode ? 'localStorage' : 'Supabase'}`);

        // Update stores
        setLinks(links);
        setFolders(folders);
        setSettings(settings);
      } catch (error) {
        logger.error(`Error loading data from ${isLocalMode ? 'localStorage' : 'Supabase'}:`, error);
        // Set defaults on error
        setLinks([]);
        setFolders([]);
        setSettings(DEFAULT_SETTINGS);
        throw error;
      }
    };
    
    // Legacy function for Supabase fallback
    const loadDataFromSupabase = loadDataFromStorage;

    // OPTIMIZED: Initial load from Supabase - completely non-blocking
    const initializeData = async () => {
      // OPTIMIZED: Set hydrated immediately to allow instant UI render
      // This ensures LCP happens as fast as possible
      setHydrated(true);

      // NEW: Set data loading state to true
      setIsLoadingData(true);

      // OPTIMIZED: Use requestIdleCallback if available for even better performance
      // Otherwise use setTimeout(0) to defer to next tick
      // CRITICAL: Defer data loading to prevent blocking LCP
      const deferLoad = typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (fn: () => void) => {
          (window as any).requestIdleCallback(fn, { timeout: 200 });
        }
        : (fn: () => void) => setTimeout(fn, 0);

      // Load data in background without blocking - deferred to next tick
      deferLoad(async () => {
        try {
          await loadDataFromSupabase();
        } catch (error) {
          logger.error('Failed to load initial data:', error);

          // Enhanced error recovery with progressive fallbacks
          try {
            logger.debug('Attempting enhanced fallback data load...');

            // Try to load individual components that might still work
            const supabase = createClient();

            supabase.auth.getUser().then(async (response: AuthResponse) => {
              const authUser = response.data.user;
              if (!authUser) {
                setHydrated(true);
                setLinks([]);
                setFolders([]);
                setSettings(DEFAULT_SETTINGS);
                return;
              }

              // OPTIMIZED: Load all data in parallel with individual error handling
              const [settingsResult, foldersResult, linksResult] = await Promise.allSettled([
                supabaseDatabaseService.getSettings().catch(() => null),
                supabaseDatabaseService.getFolders().catch(() => []),
                Promise.race([
                  supabaseDatabaseService.getLinks(),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Links fallback timeout')), 5000)
                  )
                ]).catch(() => [])
              ]);

              // Extract results with fallbacks
              const settings: AppSettings = settingsResult.status === 'fulfilled' && settingsResult.value
                ? settingsResult.value
                : DEFAULT_SETTINGS;
              const folders: Folder[] = foldersResult.status === 'fulfilled' && foldersResult.value
                ? foldersResult.value
                : [];
              const links: Link[] = linksResult.status === 'fulfilled' && linksResult.value
                ? linksResult.value
                : [];

              logger.debug(`Fallback load: ${links.length} links, ${folders.length} folders, settings: ${settings ? 'loaded' : 'default'}`);

              // Set partial data
              setHydrated(true);
              setLinks(links || []);
              setFolders(folders || []);
              setSettings(settings || DEFAULT_SETTINGS);

              logger.debug('Enhanced fallback load completed with partial data');
            }).catch((fallbackError: unknown) => {
              logger.error('Enhanced fallback load also failed:', fallbackError);

              // Final safety net: ensure app doesn't get stuck
              setHydrated(true);
              setLinks([]);
              setFolders([]);
              setSettings(DEFAULT_SETTINGS);

              logger.debug('Safety net activated - app ready with minimal state');
            });
          } catch (fallbackError: unknown) {
            logger.error('Fallback initialization failed:', fallbackError);
          }

          // Track the error for monitoring
          performanceMonitor.trackError({
            message: `Store initialization failed: ${(error as Error).message}`,
            severity: 'high',
            context: {
              hasUser: !!user,
              errorType: (error as Error).constructor.name,
              fallbackUsed: true
            }
          });

          // Reset hasLoaded to allow retry on next auth change
          hasLoaded.current = false;
        } finally {
          // NEW: Always set data loading to false when done
          setIsLoadingData(false);
        }
      });
    };

    // Start validation and data loading
    validateSessionAndLoad();

    // Set up real-time subscriptions with proper error handling and retry logic
    // Note: Skip for free users as they use localStorage
    let unsubscribeLinks: (() => void) | null = null;
    let unsubscribeFolders: (() => void) | null = null;
    let subscriptionTimeout: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const setupSubscriptions = () => {
      if (!isComponentMounted) return;
      
      // Skip real-time subscriptions for free users
      if (isFreeUser()) {
        logger.debug('Free user mode - skipping real-time subscriptions');
        return;
      }

      try {
        // OPTIMIZED: Make realtime subscriptions gracefully degrade if they fail
        // This prevents blocking the app if WebSocket connections fail
        unsubscribeLinks = supabaseDatabaseService.subscribeToLinks((updatedLinks) => {
          if (isComponentMounted) {
            setLinks(updatedLinks);
            retryCount = 0; // Reset retry count on successful update
          }
        });

        unsubscribeFolders = supabaseDatabaseService.subscribeToFolders((updatedFolders) => {
          if (isComponentMounted) {
            setFolders(updatedFolders);
            retryCount = 0; // Reset retry count on successful update
          }
        });
      } catch (error) {
        // OPTIMIZED: Gracefully handle subscription failures
        // App continues to work without realtime updates
        logger.warn('Real-time subscriptions unavailable, app will continue without live updates:', error);

        // OPTIMIZED: Don't retry aggressively - realtime is not critical
        // App will refetch data on navigation/refresh
        if (retryCount === 0 && isComponentMounted) {
          // Only retry once after 5 seconds
          retryCount++;
          retryTimeout = setTimeout(() => {
            if (isComponentMounted) {
              setupSubscriptions();
            }
          }, 5000);
        }
      }
    };

    // OPTIMIZED: Delay realtime subscriptions to prioritize initial data load
    // Realtime is nice-to-have, not critical for app functionality
    // Skip entirely for free users
    if (!isFreeUser()) {
      subscriptionTimeout = setTimeout(setupSubscriptions, 2000);
    }

    // Cleanup subscriptions on unmount
    return () => {
      isComponentMounted = false;

      if (subscriptionTimeout) {
        clearTimeout(subscriptionTimeout);
      }

      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      // Safely cleanup subscriptions
      try {
        if (unsubscribeLinks) {
          unsubscribeLinks();
        }
        if (unsubscribeFolders) {
          unsubscribeFolders();
        }
      } catch (error) {
        logger.error('Error cleaning up subscriptions:', error);
      }
    };
  }, [user, authLoading, isFreeUserAuth, setLinks, setFolders, setSettings, setHydrated, setIsLoadingData]);

  return null;
}
