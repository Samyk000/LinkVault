/**
 * @file lib/contexts/guest-mode-context.tsx
 * @description React context for guest mode state management
 * @created 2025-12-05
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { guestStorageService } from '@/lib/services/guest-storage.service';
import { logger } from '@/lib/utils/logger';

interface GuestModeContextType {
  isGuestMode: boolean;
  isLoading: boolean;
  activateGuestMode: () => void;
  deactivateGuestMode: () => void;
  clearGuestData: () => void;
  showUpgradePrompt: (feature: string) => void;
  upgradePromptFeature: string | null;
  closeUpgradePrompt: () => void;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

interface GuestModeProviderProps {
  children: React.ReactNode;
}

/**
 * Guest Mode provider component that manages guest mode state
 */
export function GuestModeProvider({ children }: GuestModeProviderProps): React.JSX.Element {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradePromptFeature, setUpgradePromptFeature] = useState<string | null>(null);

  // Initialize guest mode state on mount
  useEffect(() => {
    const initializeGuestMode = () => {
      try {
        const isGuest = guestStorageService.isGuestMode();
        setIsGuestMode(isGuest);
        
        if (isGuest) {
          guestStorageService.updateLastAccessed();
          logger.debug('Guest mode session restored');
        }
      } catch (error) {
        logger.error('Error initializing guest mode:', error);
        setIsGuestMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeGuestMode();
  }, []);


  /**
   * Activate guest mode
   */
  const activateGuestMode = useCallback(() => {
    try {
      guestStorageService.activateGuestMode();
      setIsGuestMode(true);
      logger.info('Guest mode activated via context');
    } catch (error) {
      logger.error('Error activating guest mode:', error);
    }
  }, []);

  /**
   * Deactivate guest mode (keeps data)
   */
  const deactivateGuestMode = useCallback(() => {
    try {
      guestStorageService.deactivateGuestMode();
      setIsGuestMode(false);
      logger.info('Guest mode deactivated via context');
    } catch (error) {
      logger.error('Error deactivating guest mode:', error);
    }
  }, []);

  /**
   * Clear all guest data and deactivate (used on logout or auth transition)
   */
  const clearGuestData = useCallback(() => {
    try {
      guestStorageService.clearAllGuestData();
      setIsGuestMode(false);
      logger.info('Guest data cleared via context');
    } catch (error) {
      logger.error('Error clearing guest data:', error);
    }
  }, []);

  /**
   * Show upgrade prompt for a restricted feature
   */
  const showUpgradePrompt = useCallback((feature: string) => {
    setUpgradePromptFeature(feature);
  }, []);

  /**
   * Close upgrade prompt
   */
  const closeUpgradePrompt = useCallback(() => {
    setUpgradePromptFeature(null);
  }, []);

  const value: GuestModeContextType = {
    isGuestMode,
    isLoading,
    activateGuestMode,
    deactivateGuestMode,
    clearGuestData,
    showUpgradePrompt,
    upgradePromptFeature,
    closeUpgradePrompt,
  };

  return (
    <GuestModeContext.Provider value={value}>
      {children}
    </GuestModeContext.Provider>
  );
}

/**
 * Hook to use guest mode context
 * @returns GuestModeContextType
 * @throws Error when used outside GuestModeProvider
 */
export function useGuestMode(): GuestModeContextType {
  const context = useContext(GuestModeContext);

  if (context === undefined) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }

  return context;
}

/**
 * Hook to check if guest mode is active (safe version that doesn't throw)
 * Useful for components that may render outside the provider
 */
export function useIsGuestMode(): boolean {
  const context = useContext(GuestModeContext);
  return context?.isGuestMode ?? false;
}
