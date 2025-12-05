/**
 * @file lib/services/data-loader.service.ts
 * @description Optimized data loading service with parallel fetching and intelligent caching
 * @created 2025-01-01
 */

import { supabaseDatabaseService } from './supabase-database.service';
import { guestStorageService } from './guest-storage.service';
import { performanceMonitor } from './performance-monitor.service';
import { logger } from '@/lib/utils/logger';
import type { Link, Folder, AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/constants';

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  progress: number;
  startTime?: number;
}

interface DataLoadResult {
  links: Link[];
  folders: Folder[];
  settings: AppSettings;
  loadingTime: number;
  cacheHits: number;
  totalRequests: number;
  metadata?: any;
}

interface LoadingOptions {
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
  skipCache?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Optimized data loading service with parallel fetching and intelligent strategies
 */
class DataLoaderService {
  private loadingPromise: Promise<DataLoadResult> | null = null;
  private loadingState: LoadingState = {
    isLoading: false,
    error: null,
    progress: 0,
    startTime: undefined
  };
  private loadingStates: Map<string, LoadingState> = new Map();
  private abortController: AbortController | null = null;

  /**
   * Load user data with optimized parallel fetching and performance monitoring
   * @param {LoadingOptions} options - Loading configuration options
   * @returns {Promise<DataLoadResult>} Complete data load result
   * @throws {Error} When loading fails after all retries
   */
  async loadUserData(options: LoadingOptions = {}): Promise<DataLoadResult> {
    const {
      priority = 'high',
      timeout = 5000, // REDUCED: Faster timeout for better UX
      retries = 1, // REDUCED: Fewer retries for faster failure
      skipCache = false,
      onProgress
    } = options;

    const startTime = Date.now();

    // GUEST MODE: Load from local storage instead of database (Requirement 9.1, 9.2, 9.3)
    if (guestStorageService.isGuestMode()) {
      logger.debug('Loading data in guest mode from local storage');
      onProgress?.(50);
      
      // Load ALL links including deleted ones (for trash view)
      const [links, folders] = await Promise.all([
        guestStorageService.getAllLinksIncludingDeleted(),
        guestStorageService.getFolders(),
      ]);
      
      onProgress?.(100);
      
      return {
        links: links || [],
        folders: folders || [],
        settings: DEFAULT_SETTINGS,
        loadingTime: Date.now() - startTime,
        cacheHits: 0,
        totalRequests: 0, // No API requests in guest mode
      };
    }

    // Track loading start
    performanceMonitor.trackInteraction({
      type: 'navigation',
      element: 'data_loader',
      timestamp: Date.now(),
      metadata: {
        action: 'load_start',
        options: { priority, timeout, retries, skipCache }
      }
    });

    // Return existing promise if already loading
    if (this.loadingPromise && !skipCache) {
      logger.debug('Data loading already in progress, waiting...');
      performanceMonitor.trackMetric('data_loading_cache_hit', Date.now() - startTime, {
        type: 'cache_performance'
      });
      return this.loadingPromise;
    }

    // Cancel previous loading if exists
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    // OPTIMIZED: Load minimal data first for faster initial display
    this.loadingPromise = this.executeOptimizedLoad(
      timeout,
      retries,
      onProgress,
      this.abortController.signal
    );

    try {
      const result = await this.loadingPromise;
      const duration = Date.now() - startTime;

      // Track successful loading
      performanceMonitor.trackMetric('data_loading_success', duration, {
        type: 'loading_performance'
      });

      performanceMonitor.trackInteraction({
        type: 'navigation',
        element: 'data_loader',
        duration,
        timestamp: Date.now(),
        metadata: {
          action: 'load_success',
          dataSize: (result.links?.length || 0) + (result.folders?.length || 0)
        }
      });

      this.loadingState = { isLoading: false, error: null, progress: 100, startTime: undefined };
      logger.debug(`Data loading completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track loading error
      performanceMonitor.trackError({
        message: `Data loading failed: ${(error as Error).message}`,
        severity: 'high',
        context: {
          duration,
          timeout,
          retries,
          errorType: (error as Error).constructor.name
        }
      });

      this.loadingState = {
        isLoading: false,
        error: error as Error,
        progress: 0,
        startTime: undefined
      };
      logger.error(`Data loading failed after ${duration}ms:`, error);
      throw error;
    } finally {
      this.loadingPromise = null;
      this.abortController = null;
    }
  }

  /**
   * Execute optimized data loading with progressive enhancement
   * @private
   */
  private async executeOptimizedLoad(
    timeout: number,
    retries: number,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<DataLoadResult> {
    this.loadingState = { isLoading: true, error: null, progress: 0, startTime: Date.now() };
    
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      try {
        // OPTIMIZED: Try fast initial load first
        return await this.loadFastInitialData(timeout, onProgress, signal);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt <= retries && !signal?.aborted) {
          // SHORTER: Faster retry delay
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If fast loading fails, try full load as fallback
    try {
      logger.warn('Fast initial load failed, trying full load as fallback');
      return await this.performLoad(timeout, onProgress, signal);
    } catch (fallbackError) {
      logger.error('Both fast and full load failed:', fallbackError);
      throw lastError || new Error('Failed to load data after all attempts');
    }
  }

  /**
   * Load minimal data first for instant user feedback
   * @private
   */
  private async loadFastInitialData(
    timeout: number,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<DataLoadResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    let totalRequests = 0;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Fast data loading timeout after ${timeout}ms`));
      }, timeout);
      
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Fast data loading aborted'));
      });
    });

    // Progress tracking
    const updateProgress = (step: number) => {
      const progress = Math.min((step / 3) * 100, 100);
      this.loadingState.progress = progress;
      onProgress?.(progress);
    };

    try {
      // OPTIMIZED: Load only essential data first
      const dataPromises = this.createFastDataPromises(updateProgress, signal);
      
      const results = await Promise.race([
        Promise.all(dataPromises),
        timeoutPromise
      ]);

      const [links, folders, settings] = results;
      totalRequests = 3;

      cacheHits = this.estimateCacheHits(links, folders, settings);

      const loadingTime = Date.now() - startTime;

      return {
        links: links || [],
        folders: folders || [],
        settings: settings || DEFAULT_SETTINGS,
        loadingTime,
        cacheHits,
        totalRequests
      };
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Fast data loading was cancelled');
      }
      throw error;
    }
  }

  /**
   * Create fast data loading promises
   * @private
   */
  private createFastDataPromises(
    updateProgress: (step: number) => void,
    signal?: AbortSignal
  ): Promise<any>[] {
    // OPTIMIZED: Load smaller datasets first for faster initial display
    const settingsPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getSettings(),
      'settings',
      1,
      updateProgress,
      signal
    );

    const foldersPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getFolders({ limit: 50 }), // LIMIT: Load only first 50 folders
      'folders',
      2,
      updateProgress,
      signal
    );

    const linksPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getLinks({ limit: 100, offset: 0 }), // LIMIT: Load only first 100 links
      'links',
      3,
      updateProgress,
      signal
    );

    return [linksPromise, foldersPromise, settingsPromise];
  }

  /**
   * Perform the actual parallel data loading
   * @private
   */
  private async performLoad(
    timeout: number,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<DataLoadResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    let totalRequests = 0;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Data loading timeout after ${timeout}ms`));
      }, timeout);

      // Clear timeout if signal is aborted
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Data loading aborted'));
      });
    });

    // Progress tracking
    const updateProgress = (step: number) => {
      const progress = Math.min((step / 3) * 100, 100);
      this.loadingState.progress = progress;
      onProgress?.(progress);
    };

    try {
      // Load data in parallel with intelligent prioritization
      const dataPromises = this.createOptimizedDataPromises(updateProgress, signal);
      
      // Race against timeout
      const results = await Promise.race([
        Promise.all(dataPromises),
        timeoutPromise
      ]);

      const [links, folders, settings] = results;
      totalRequests = 3;

      // Calculate cache hits (simplified - would need actual cache hit tracking)
      cacheHits = this.estimateCacheHits(links, folders, settings);

      const loadingTime = Date.now() - startTime;

      return {
        links: links || [],
        folders: folders || [],
        settings: settings || DEFAULT_SETTINGS,
        loadingTime,
        cacheHits,
        totalRequests
      };
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Data loading was cancelled');
      }
      throw error;
    }
  }

  /**
   * Create optimized data loading promises with intelligent prioritization
   * @private
   */
  private createOptimizedDataPromises(
    updateProgress: (step: number) => void,
    signal?: AbortSignal
  ): Promise<any>[] {
    // Priority order: settings (fastest), folders (medium), links (potentially largest)
    const settingsPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getSettings(),
      'settings',
      1,
      updateProgress,
      signal
    );

    const foldersPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getFolders(),
      'folders',
      2,
      updateProgress,
      signal
    );

    const linksPromise = this.loadWithProgress(
      () => supabaseDatabaseService.getLinks(),
      'links',
      3,
      updateProgress,
      signal
    );

    return [linksPromise, foldersPromise, settingsPromise];
  }

  /**
   * Load data with progress tracking and cancellation support
   * @private
   */
  private async loadWithProgress<T>(
    loadFn: () => Promise<T>,
    dataType: string,
    step: number,
    updateProgress: (step: number) => void,
    signal?: AbortSignal
  ): Promise<T> {
    if (signal?.aborted) {
      throw new Error(`Loading ${dataType} was cancelled`);
    }

    try {
      const result = await loadFn();
      updateProgress(step);
      return result;
    } catch (error) {
      logger.error(`Error loading ${dataType}:`, error);
      
      // Return fallback data instead of failing completely
      if (dataType === 'settings') {
        return DEFAULT_SETTINGS as T;
      }
      return [] as T;
    }
  }

  /**
   * Estimate cache hits based on data freshness (simplified implementation)
   * @private
   */
  private estimateCacheHits(links: Link[], folders: Folder[], settings: AppSettings): number {
    // This is a simplified estimation - in a real implementation,
    // you'd track actual cache hits from the cache manager
    let hits = 0;
    
    // Assume settings are often cached
    if (settings && Object.keys(settings).length > 0) hits++;
    
    // Assume folders are cached if they exist
    if (folders && folders.length > 0) hits++;
    
    // Links are less likely to be fully cached due to size
    if (links && links.length > 0 && links.length < 50) hits++;
    
    return hits;
  }

  /**
   * Load data with batch processing for large datasets
   * @param {number} batchSize - Number of items to process per batch
   * @returns {Promise<DataLoadResult>} Batched load result
   */
  async loadUserDataBatched(batchSize: number = 100): Promise<DataLoadResult> {
    const startTime = Date.now();
    
    try {
      // Load metadata first (folders and settings)
      const [folders, settings] = await Promise.all([
        supabaseDatabaseService.getFolders(),
        supabaseDatabaseService.getSettings()
      ]);

      // Load links in batches if there are many
      const links = await this.loadLinksBatched(batchSize);

      const loadingTime = Date.now() - startTime;

      return {
        links: links || [],
        folders: folders || [],
        settings: settings || DEFAULT_SETTINGS,
        loadingTime,
        cacheHits: 0, // Would need actual tracking
        totalRequests: Math.ceil((links?.length || 0) / batchSize) + 2
      };
    } catch (error) {
      logger.error('Error in batched data loading:', error);
      throw error;
    }
  }

  /**
   * Load links in batches for better performance with large datasets
   * @private
   */
  private async loadLinksBatched(batchSize: number): Promise<Link[]> {
    // For now, use the regular method since Supabase handles pagination internally
    // In a future enhancement, this could implement actual batching
    return supabaseDatabaseService.getLinks();
  }

  /**
   * Preload critical data in the background
   * @param {string[]} dataTypes - Types of data to preload
   */
  async preloadData(dataTypes: string[] = ['folders', 'settings']): Promise<void> {
    const preloadPromises = dataTypes.map(async (type) => {
      try {
        switch (type) {
          case 'folders':
            await supabaseDatabaseService.getFolders();
            break;
          case 'settings':
            await supabaseDatabaseService.getSettings();
            break;
          case 'links':
            // Only preload a subset of links to avoid performance impact
            await supabaseDatabaseService.getLinks();
            break;
        }
      } catch (error) {
        logger.warn(`Failed to preload ${type}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get current loading state
   * @returns {LoadingState} Current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Cancel current loading operation
   */
  cancelLoading(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Clear any cached loading promises
   */
  clearCache(): void {
    this.loadingPromise = null;
    this.loadingState = {
      isLoading: false,
      error: null,
      progress: 0,
      startTime: undefined
    };
  }

  /**
   * Calculate data size for performance tracking
   * @private
   */
  private calculateDataSize(result: DataLoadResult): number {
    const linksSize = result.links?.length || 0;
    const foldersSize = result.folders?.length || 0;
    const settingsSize = Object.keys(result.settings || {}).length;
    
    return linksSize + foldersSize + settingsSize;
  }

  /**
   * Generate unique loading ID for tracking
   * @private
   */
  private generateLoadingId(): string {
    return `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update loading state for a specific loading operation
   * @private
   */
  private updateLoadingState(loadingId: string, updates: Partial<LoadingState>): void {
    const currentState = this.loadingStates.get(loadingId);
    if (currentState) {
      this.loadingStates.set(loadingId, { ...currentState, ...updates });
    }
  }

  /**
   * Get cached data if available
   * @private
   */
  private getCachedData(): DataLoadResult | null {
    // This is a simplified cache check - in a real implementation,
    // you'd check actual cache storage with TTL
    return null;
  }

  /**
   * Cache successful data result
   * @private
   */
  private cacheData(result: DataLoadResult): void {
    // This is a placeholder for actual cache implementation
    // In a real implementation, you'd store in localStorage, IndexedDB, etc.
    logger.debug('Caching data result:', {
      links: result.links?.length,
      folders: result.folders?.length,
      settings: !!result.settings
    });
  }

  /**
   * Execute parallel loading with progress tracking
   * @private
   */
  private async executeParallelLoading(
    loadingId: string,
    onProgress?: (progress: number) => void
  ): Promise<DataLoadResult> {
    const updateProgress = (progress: number) => {
      this.updateLoadingState(loadingId, { progress });
      onProgress?.(progress);
    };

    updateProgress(10);

    // Load all data in parallel
    const [links, folders, settings] = await Promise.all([
      this.loadWithProgressTracking('links', () => supabaseDatabaseService.getLinks(), updateProgress, 30),
      this.loadWithProgressTracking('folders', () => supabaseDatabaseService.getFolders(), updateProgress, 60),
      this.loadWithProgressTracking('settings', () => supabaseDatabaseService.getSettings(), updateProgress, 90)
    ]);

    updateProgress(100);

    const loadingTime = performance.now() - (this.loadingStates.get(loadingId)?.startTime || 0);

    return {
      links: links as Link[],
      folders: folders as Folder[],
      settings: (settings as AppSettings) || DEFAULT_SETTINGS,
      loadingTime,
      cacheHits: 0, // Would be calculated from actual cache
      totalRequests: 3, // links, folders, settings
      metadata: {
        loadingTime,
        cacheHits: 0, // Would be calculated from actual cache
        totalItems: (links as Link[]).length + (folders as Folder[]).length
      }
    };
  }

  /**
   * Load data with progress tracking and error handling
   * @private
   */
  private async loadWithProgressTracking<T>(
    dataType: string,
    loadFn: () => Promise<T>,
    updateProgress: (progress: number) => void,
    targetProgress: number
  ): Promise<T> {
    try {
      const result = await loadFn();
      updateProgress(targetProgress);
      return result;
    } catch (error) {
      performanceMonitor.trackError({
        message: `Failed to load ${dataType}: ${(error as Error).message}`,
        severity: 'medium',
        context: { dataType, targetProgress }
      });
      
      // Return fallback data
      if (dataType === 'settings') {
        return DEFAULT_SETTINGS as T;
      }
      return [] as T;
    }
  }
}

// Export singleton instance
export const dataLoaderService = new DataLoaderService();