/**
 * @file hooks/use-free-user.ts
 * @description Hook for accessing free user state and helper methods
 * @created 2025-12-03
 */

'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook that provides free user state and helper methods.
 * Use this hook to check if the current user is in free user mode
 * and to conditionally render UI elements.
 */
export function useFreeUser() {
  const { isFreeUser, signInAsFreeUser, signOutFreeUser, user } = useAuth();
  const router = useRouter();

  /**
   * Checks if the user is authenticated (either as free user or with account)
   */
  const isAuthenticated = isFreeUser || !!user;

  /**
   * Checks if the user has a full account (not free user)
   */
  const hasFullAccount = !!user && !isFreeUser;

  /**
   * Handles upgrade to full account by redirecting to signup
   */
  const handleUpgrade = useCallback(() => {
    router.push('/signup');
  }, [router]);

  /**
   * Handles logout for free users
   */
  const handleLogout = useCallback(() => {
    signOutFreeUser();
    router.push('/login');
  }, [signOutFreeUser, router]);

  /**
   * Checks if a feature should be hidden for free users
   * @param feature - The feature to check
   */
  const shouldHideFeature = useCallback((feature: 'share' | 'sync' | 'cloud') => {
    if (!isFreeUser) return false;
    
    const hiddenFeatures = ['share', 'sync', 'cloud'];
    return hiddenFeatures.includes(feature);
  }, [isFreeUser]);

  return {
    isFreeUser,
    isAuthenticated,
    hasFullAccount,
    signInAsFreeUser,
    signOutFreeUser,
    handleUpgrade,
    handleLogout,
    shouldHideFeature,
  };
}
