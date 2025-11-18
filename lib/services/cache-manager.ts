/**
 * @file cache-manager.ts
 * @description Smart cache manager with selective invalidation, varied TTLs, and persistence
 * @created 2025-01-01
 */

import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
  enablePersistence?: boolean;
  persistenceKey?: string;
  maxStorageSize?: number; // Max size in bytes for localStorage
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  persist?: boolean; // Whether to persist this entry
}

/**
 * Smart cache manager with LRU eviction, tag-based invalidation, and persistence
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private hits = 0; // Track cache hits
  private misses = 0; // Track cache misses
  private persistTimer?: NodeJS.Timeout;
  private lastMemoryCheck = 0;
  private memoryCheckInterval = 60000; // Check memory every minute

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTtl: config.defaultTtl || 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 60 * 1000, // 1 minute
      enablePersistence: config.enablePersistence !== false, // Default to true
      persistenceKey: config.persistenceKey || 'linkvault_cache',
      maxStorageSize: config.maxStorageSize || 5 * 1024 * 1024, // 5MB default
    };

    // Load persisted cache on initialization
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    this.startCleanupTimer();
    this.startPersistenceTimer();
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {T | null} Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;
    this.accessOrder.set(key, ++this.accessCounter);
    this.hits++;

    return entry.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {T} data - Data to cache
   * @param {CacheOptions} options - Cache options
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl || this.config.defaultTtl;
    
    // Adjust TTL based on priority
    const adjustedTtl = this.adjustTtlByPriority(ttl, options.priority);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: adjustedTtl,
      tags: options.tags || [],
      accessCount: 1,
      lastAccessed: now,
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    // Persist if enabled and option allows
    if (this.config.enablePersistence && options.persist !== false) {
      // Debounce persistence to avoid excessive writes
      this.schedulePersistence();
    }
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   * @param {string} key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    
    // Update persistence if enabled
    if (this.config.enablePersistence) {
      this.schedulePersistence();
    }
  }

  /**
   * Invalidate cache entries by tags
   * @param {string[]} tags - Tags to invalidate
   */
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Invalidate cache entries by pattern
   * @param {RegExp} pattern - Pattern to match keys
   */
  invalidateByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.hits = 0;
    this.misses = 0;
    
    // Clear persistence
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.config.persistenceKey!);
      } catch (error) {
        logger.error('Error clearing persisted cache:', error);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
      totalSize += JSON.stringify(entry.data).length;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expiredCount,
      totalSize,
      hitRate: this.calculateHitRate(),
      hits: this.hits,
      misses: this.misses,
      totalRequests: this.hits + this.misses,
    };
  }

  /**
   * Adjust TTL based on priority
   * @param {number} baseTtl - Base TTL
   * @param {string} priority - Priority level
   * @returns {number} Adjusted TTL
   */
  private adjustTtlByPriority(baseTtl: number, priority?: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high':
        return baseTtl * 2; // Double TTL for high priority
      case 'low':
        return baseTtl * 0.5; // Half TTL for low priority
      case 'medium':
      default:
        return baseTtl;
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    // Find the least recently used key
    let lruKey: string | null = null;
    let lruOrder = Infinity;

    for (const [key, order] of this.accessOrder.entries()) {
      if (order < lruOrder) {
        lruOrder = order;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Calculate cache hit rate (based on actual hits and misses)
   * @returns {number} Hit rate percentage
   */
  private calculateHitRate(): number {
    const totalRequests = this.hits + this.misses;
    if (totalRequests === 0) return 0;
    return Math.round((this.hits / totalRequests) * 100);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
        cleanedCount++;
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    // Adaptive cleanup interval based on memory pressure
    if (cleanedCount > 0) {
      this.optimizeCleanupInterval();
    }
  }

  /**
   * Start cleanup timer with adaptive interval
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Optimize cleanup interval based on memory pressure
   */
  private optimizeCleanupInterval(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }
    this.lastMemoryCheck = now;

    if (typeof window === 'undefined' || !('performance' in window) || !('memory' in (performance as any))) {
      return;
    }

    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1048576;
    const limitMB = memory.jsHeapSizeLimit / 1048576;
    const memoryPressure = usedMB / limitMB;

    // Adjust cleanup interval based on memory pressure
    if (memoryPressure > 0.8) {
      // High memory pressure - cleanup more frequently
      this.config.cleanupInterval = 15 * 1000; // 15 seconds
    } else if (memoryPressure > 0.6) {
      // Medium memory pressure
      this.config.cleanupInterval = 30 * 1000; // 30 seconds
    } else {
      // Low memory pressure - cleanup less frequently
      this.config.cleanupInterval = 60 * 1000; // 1 minute
    }

    this.startCleanupTimer();
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.persistenceKey!);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const now = Date.now();
      let loadedCount = 0;

      for (const [key, entry] of Object.entries(parsed)) {
        const cacheEntry = entry as CacheEntry<any>;
        
        // Only load non-expired entries
        if (now - cacheEntry.timestamp < cacheEntry.ttl) {
          this.cache.set(key, cacheEntry);
          this.accessOrder.set(key, cacheEntry.lastAccessed);
          loadedCount++;
        }
      }

      if (loadedCount > 0) {
        logger.debug(`Loaded ${loadedCount} cache entries from storage`);
      }
    } catch (error) {
      logger.error('Error loading cache from storage:', error);
      // Clear corrupted cache
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.config.persistenceKey!);
      }
    }
  }

  /**
   * Save cache to localStorage (debounced)
   */
  private persistTimerId?: NodeJS.Timeout;
  
  private schedulePersistence(): void {
    if (this.persistTimerId) {
      clearTimeout(this.persistTimerId);
    }

    // Debounce persistence to avoid excessive writes
    this.persistTimerId = setTimeout(() => {
      this.persistToStorage();
    }, 1000); // Wait 1 second after last change
  }

  /**
   * Persist cache to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === 'undefined' || !this.config.enablePersistence) return;

    try {
      const now = Date.now();
      const persistableEntries: Record<string, CacheEntry<any>> = {};
      let totalSize = 0;
      const maxSize = this.config.maxStorageSize || 5 * 1024 * 1024; // 5MB default

      // Only persist non-expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp < entry.ttl) {
          const entrySize = JSON.stringify(entry).length;
          if (totalSize + entrySize > maxSize) {
            break; // Don't exceed storage limit
          }
          persistableEntries[key] = entry;
          totalSize += entrySize;
        }
      }

      const serialized = JSON.stringify(persistableEntries);
      localStorage.setItem(this.config.persistenceKey!, serialized);
    } catch (error) {
      // Handle quota exceeded or other storage errors
      if ((error as any).name === 'QuotaExceededError') {
        logger.warn('Cache storage quota exceeded, clearing old entries');
        // Clear oldest entries and retry
        this.evictOldestEntries(0.3); // Evict 30% oldest entries
        this.persistToStorage();
      } else {
        logger.error('Error persisting cache to storage:', error);
      }
    }
  }

  /**
   * Start persistence timer (periodic saves)
   */
  private startPersistenceTimer(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
    }

    // Persist every 30 seconds
    this.persistTimer = setInterval(() => {
      this.persistToStorage();
    }, 30 * 1000);
  }

  /**
   * Evict oldest entries by percentage
   */
  private evictOldestEntries(percentage: number): void {
    const entriesToEvict = Math.floor(this.cache.size * percentage);
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, entriesToEvict);

    sortedEntries.forEach(([key]) => {
      this.delete(key);
    });
  }

  /**
   * Stop cleanup timer and clear cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
    }
    if (this.persistTimerId) {
      clearTimeout(this.persistTimerId);
    }
    
    // Final persistence before destruction
    if (this.config.enablePersistence) {
      this.persistToStorage();
    }
    
    this.clear();
  }
}

// Predefined cache configurations for different data types
export const CACHE_CONFIGS = {
  USER_PROFILE: { ttl: 15 * 60 * 1000, tags: ['user'], priority: 'high' as const },
  USER_SETTINGS: { ttl: 30 * 60 * 1000, tags: ['user', 'settings'], priority: 'high' as const },
  LINKS: { ttl: 5 * 60 * 1000, tags: ['links'], priority: 'medium' as const },
  FOLDERS: { ttl: 10 * 60 * 1000, tags: ['folders'], priority: 'medium' as const },
  METADATA: { ttl: 60 * 60 * 1000, tags: ['metadata'], priority: 'low' as const },
  SEARCH_RESULTS: { ttl: 2 * 60 * 1000, tags: ['search'], priority: 'low' as const },
} as const;

// Global cache instance with persistence enabled
export const globalCache = new CacheManager({
  maxSize: 2000,
  defaultTtl: 5 * 60 * 1000,
  cleanupInterval: 60 * 1000, // Start with 1 minute, adapts based on memory pressure
  enablePersistence: true,
  persistenceKey: 'linkvault_cache',
  maxStorageSize: 5 * 1024 * 1024, // 5MB max storage
});