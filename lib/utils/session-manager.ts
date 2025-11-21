/**
 * @file lib/utils/session-manager.ts
 * @description Enhanced session management for cross-browser compatibility
 * @created 2025-11-12
 * 
 * Handles session persistence across all browsers including Safari iOS/desktop,
 * Chrome mobile, and other browsers with aggressive storage clearing policies.
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from './logger';
import type { Session, User } from '@supabase/supabase-js';

interface SessionBackup {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
  lastValidated: number;
}

/**
 * Enhanced Session Manager with multi-strategy persistence
 * 
 * Strategies:
 * 1. Supabase native session (primary)
 * 2. localStorage backup (secondary)
 * 3. sessionStorage backup (tertiary - for Safari private mode)
 * 4. IndexedDB backup (quaternary - for Safari storage limits)
 * 5. In-memory cache (fallback)
 */
export class SessionManager {
  private static instance: SessionManager | null = null;
  private supabase = createClient();
  private refreshInterval: NodeJS.Timeout | null = null;
  private inMemorySession: Session | null = null;
  private isMobile: boolean = false;
  private isSafari: boolean = false;
  private isPrivateMode: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Detect browser type
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // Detect private/incognito mode
      this.detectPrivateMode();

      // Setup auto-refresh
      this.setupAutoRefresh();

      // Setup visibility change listener (for mobile)
      this.setupVisibilityListener();

      // Setup storage listener (for multi-tab sync)
      this.setupStorageListener();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Detect if browser is in private/incognito mode
   */
  private async detectPrivateMode(): Promise<void> {
    try {
      // Try to use localStorage
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
      this.isPrivateMode = false;
    } catch (e) {
      this.isPrivateMode = true;
      logger.warn('Private/Incognito mode detected, using alternative storage');
    }
  }

  /**
   * Enhanced session validation with multiple fallback strategies
   */
  async validateSession(): Promise<Session | null> {
    try {
      // Strategy 1: Try Supabase native session
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (!error && session) {
        // Valid session found
        await this.backupSession(session);
        this.inMemorySession = session;
        return session;
      }

      // Strategy 2: Try to recover from backups
      if (this.isMobile || this.isSafari) {
        logger.debug('Primary session failed, attempting recovery...');
        return await this.recoverSession();
      }

      return null;
    } catch (error) {
      logger.error('Session validation error:', error);

      // Try recovery as last resort
      return await this.recoverSession();
    }
  }

  /**
   * Backup session to multiple storage locations
   */
  private async backupSession(session: Session): Promise<void> {
    const backup: SessionBackup = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: session.user,
      expiresAt: session.expires_at || 0,
      lastValidated: Date.now(),
    };

    const backupString = JSON.stringify(backup);

    try {
      // Backup to localStorage (if available)
      if (!this.isPrivateMode) {
        localStorage.setItem('linkvault_session_backup', backupString);
      }

      // Backup to sessionStorage (works in private mode)
      sessionStorage.setItem('linkvault_session_backup', backupString);

      // Backup to IndexedDB (for Safari)
      if (this.isSafari) {
        await this.saveToIndexedDB('session_backup', backup);
      }
    } catch (error) {
      logger.warn('Failed to backup session:', error);
    }
  }

  /**
   * Recover session from backup storage
   */
  private async recoverSession(): Promise<Session | null> {
    try {
      let backup: SessionBackup | null = null;

      // Try in-memory cache first (fastest)
      if (this.inMemorySession) {
        const now = Date.now();
        const expiresAt = this.inMemorySession.expires_at ? this.inMemorySession.expires_at * 1000 : 0;

        if (now < expiresAt) {
          logger.debug('Session recovered from memory cache');
          return this.inMemorySession;
        }
      }

      // Try localStorage
      if (!this.isPrivateMode) {
        const stored = localStorage.getItem('linkvault_session_backup');
        if (stored) {
          backup = JSON.parse(stored);
          logger.debug('Session recovered from localStorage');
        }
      }

      // Try sessionStorage
      if (!backup) {
        const stored = sessionStorage.getItem('linkvault_session_backup');
        if (stored) {
          backup = JSON.parse(stored);
          logger.debug('Session recovered from sessionStorage');
        }
      }

      // Try IndexedDB (Safari)
      if (!backup && this.isSafari) {
        backup = await this.getFromIndexedDB('session_backup');
        if (backup) {
          logger.debug('Session recovered from IndexedDB');
        }
      }

      // Validate and restore backup
      if (backup) {
        const now = Date.now();
        const backupAge = now - backup.lastValidated;

        // Backup must be less than 7 days old
        if (backupAge < 7 * 24 * 60 * 60 * 1000) {
          // Try to restore session
          const { data, error } = await this.supabase.auth.setSession({
            access_token: backup.accessToken,
            refresh_token: backup.refreshToken,
          });

          if (!error && data.session) {
            logger.info('Session successfully recovered and restored');
            this.inMemorySession = data.session;
            return data.session;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Session recovery failed:', error);
      return null;
    }
  }

  /**
   * Refresh session if needed
   */
  async refreshIfNeeded(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();

      if (!error && session) {
        await this.backupSession(session);
        this.inMemorySession = session;
        logger.debug('Session refreshed successfully');
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Session refresh failed:', error);
      return null;
    }
  }

  /**
   * Setup automatic session refresh
   * Refreshes every 5 minutes or 30 minutes before expiry (whichever is shorter)
   */
  private setupAutoRefresh(): void {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 5 minutes
    this.refreshInterval = setInterval(async () => {
      await this.refreshIfNeeded();
    }, 5 * 60 * 1000);
  }

  /**
   * Setup visibility change listener (mobile-specific)
   * Revalidates session when app comes to foreground
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        logger.debug('App visible, revalidating session...');
        await this.validateSession();
      }
    });

    // Also listen for focus events
    window.addEventListener('focus', async () => {
      logger.debug('Window focused, revalidating session...');
      await this.validateSession();
    });
  }

  /**
   * Check if user has explicitly logged out to prevent session recovery
   */
  private hasUserLoggedOut(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const localStorageLogout = localStorage.getItem('user_logged_out');
      const sessionStorageLogout = sessionStorage.getItem('user_logged_out');

      // Check if logout marker exists and is recent (within last 10 minutes)
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;

      if (localStorageLogout && (now - parseInt(localStorageLogout)) < tenMinutes) {
        return true;
      }

      if (sessionStorageLogout && (now - parseInt(sessionStorageLogout)) < tenMinutes) {
        return true;
      }

      // Clean up old logout markers to prevent indefinite blocking
      if (localStorageLogout && (now - parseInt(localStorageLogout)) >= tenMinutes) {
        localStorage.removeItem('user_logged_out');
      }

      if (sessionStorageLogout && (now - parseInt(sessionStorageLogout)) >= tenMinutes) {
        sessionStorage.removeItem('user_logged_out');
      }

      return false;
    } catch (error) {
      logger.warn('Error checking logout status:', error);
      return false;
    }
  }

  /**
   * Setup storage listener for multi-tab sync
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'linkvault_session_backup' && event.newValue) {
        // Don't sync session if user has explicitly logged out
        if (this.hasUserLoggedOut()) {
          logger.debug('Session sync blocked - user explicitly logged out');
          return;
        }

        logger.debug('Session updated in another tab');
        try {
          const backup: SessionBackup = JSON.parse(event.newValue);
          // Update in-memory cache
          if (backup.accessToken) {
            this.supabase.auth.setSession({
              access_token: backup.accessToken,
              refresh_token: backup.refreshToken,
            });
          }
        } catch (error) {
          logger.warn('Failed to sync session from another tab:', error);
        }
      }
    });
  }

  /**
   * Save data to IndexedDB (for Safari)
   */
  private async saveToIndexedDB(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('LinkVaultDB', 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions');
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['sessions'], 'readwrite');
          const store = transaction.objectStore('sessions');
          store.put(value, key);

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };

          transaction.onerror = () => reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get data from IndexedDB (for Safari)
   */
  private async getFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('LinkVaultDB', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains('sessions')) {
            db.close();
            resolve(null);
            return;
          }

          const transaction = db.transaction(['sessions'], 'readonly');
          const store = transaction.objectStore('sessions');
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            db.close();
            resolve(getRequest.result);
          };

          getRequest.onerror = () => {
            db.close();
            reject(getRequest.error);
          };
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all session data with enhanced cleanup
   */
  async clearSession(): Promise<void> {
    try {
      // Mark session as explicitly logged out to prevent recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_logged_out', Date.now().toString());
        sessionStorage.setItem('user_logged_out', Date.now().toString());
      }

      // Clear Supabase session
      await this.supabase.auth.signOut();

      // Clear all auth-related storage
      const storageKeys = [
        'linkvault_session_backup',
        'supabase.auth.token',
        'sb-' + (process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token'
      ];

      storageKeys.forEach(key => {
        if (!this.isPrivateMode) {
          localStorage.removeItem(key);
        }
        sessionStorage.removeItem(key);
      });

      // Clear IndexedDB
      if (this.isSafari) {
        await this.saveToIndexedDB('session_backup', null);
        // Also clear any other session data
        await this.saveToIndexedDB('supabase_session', null);
      }

      // Clear cookies
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth') || name.includes('session')) {
            const domains = [
              window.location.hostname,
              `.${window.location.hostname}`,
              ''
            ];
            domains.forEach(domain => {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;${domain ? `domain=${domain};` : ''}secure;samesite=lax`;
            });
          }
        });
      }

      // Clear in-memory cache
      this.inMemorySession = null;

      logger.debug('Session cleared from all storage and cookies');
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
export default sessionManager;

