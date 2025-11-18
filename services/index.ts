/**
 * @file services/index.ts
 * @description Services exports and composition
 * @created 2025-11-12
 * @modified 2025-11-12
 */

// Import services
import { authService } from './auth.service';
import { linksService } from './links.service';
import { foldersService } from './folders.service';
import { settingsService } from './settings.service';

// Import types
import type { AuthService } from './auth.service';
import type { LinksService } from './links.service';
import type { FoldersService } from './folders.service';
import type { SettingsService } from './settings.service';
import type { User } from '@supabase/supabase-js';
import type { Link, Folder, AppSettings } from '@/types';

// Export services
export { authService, linksService, foldersService, settingsService };

// Export types
export type { AuthService, LinksService, FoldersService, SettingsService };
export type { User, Link, Folder, AppSettings };

/**
 * Combined services interface
 * Provides a unified interface to all services
 */
export interface AppServices {
  auth: AuthService;
  links: LinksService;
  folders: FoldersService;
  settings: SettingsService;
}

/**
 * Hook that provides access to all services
 * @returns {AppServices} Combined services interface
 */
export function useServices(): AppServices {
  return {
    auth: authService,
    links: linksService,
    folders: foldersService,
    settings: settingsService,
  };
}

/**
 * Creates a service instance with optional overrides for testing
 * @param {Partial<AppServices>} overrides - Service overrides for testing
 * @returns {AppServices} Service instance with overrides applied
 */
export function createServices(overrides: Partial<AppServices> = {}): AppServices {
  return {
    auth: overrides.auth || authService,
    links: overrides.links || linksService,
    folders: overrides.folders || foldersService,
    settings: overrides.settings || settingsService,
  };
}

/**
 * Service configuration options
 */
export interface ServiceConfig {
  enableLogging?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  timeout?: number;
}

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  enableLogging: true,
  enableCaching: false,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  retryAttempts: 3,
  timeout: 30000, // 30 seconds
};

/**
 * Service utilities and helpers
 */
export const ServiceUtils = {
  /**
   * Wraps a service call with error handling and logging
   * @param {() => Promise<T>} serviceCall - Service function to call
   * @param {string} operationName - Name of the operation for logging
   * @param {ServiceConfig} config - Service configuration
   * @returns {Promise<T>} Service call result
   */
  async withErrorHandling<T>(
    serviceCall: () => Promise<T>,
    operationName: string,
    config: ServiceConfig = DEFAULT_SERVICE_CONFIG
  ): Promise<T> {
    try {
      const result = await serviceCall();
      
      if (config.enableLogging) {
        console.debug(`[SERVICE] ${operationName} completed successfully`);
      }
      
      return result;
    } catch (error) {
      if (config.enableLogging) {
        console.error(`[SERVICE] ${operationName} failed:`, error);
      }
      
      throw error;
    }
  },
  
  /**
   * Validates required authentication for service calls
   * @param {User | null} user - Current user
   * @param {string} operationName - Name of the operation for error message
   */
  requireAuth(user: User | null, operationName: string): void {
    if (!user) {
      throw new Error(`Authentication required for ${operationName}`);
    }
  },
  
  /**
   * Validates required parameters for service calls
   * @param {T} param - Parameter to validate
   * @param {string} paramName - Name of the parameter for error message
   * @param {(param: T) => boolean} validator - Validation function
   */
  requireParam<T>(
    param: T,
    paramName: string,
    validator: (param: T) => boolean
  ): void {
    if (!validator(param)) {
      throw new Error(`Invalid parameter: ${paramName}`);
    }
  },
};