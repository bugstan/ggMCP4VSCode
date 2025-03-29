/**
 * Cache Manager
 * 
 * A general-purpose cache manager that can be used for various caching needs
 * throughout the application. Supports key expiration, size limits, and
 * automatic cache invalidation strategies.
 */

import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('CacheManager');

/**
 * Interface for cache entries
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    size: number;
    metadata?: Record<string, any>;
}

/**
 * Cache options interface
 */
export interface CacheOptions {
    /** Maximum cache size in entries */
    maxSize?: number;
    /** Maximum cache size in bytes (approximate) */
    maxBytes?: number;
    /** Time-to-live in milliseconds */
    ttl?: number;
    /** Cache name for identification in logs */
    name?: string;
}

/**
 * Generic Cache Manager class
 */
export class CacheManager<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private totalSize: number = 0;
    private options: Required<CacheOptions>;
    private readonly DEFAULT_OPTIONS: Required<CacheOptions> = {
        maxSize: 100,
        maxBytes: 10 * 1024 * 1024, // 10MB
        ttl: 60 * 1000, // 1 minute
        name: 'default'
    };

    /**
     * Create a new cache manager
     * @param options Cache configuration options
     */
    constructor(options: CacheOptions = {}) {
        this.options = { ...this.DEFAULT_OPTIONS, ...options };
        log.info(`Created cache manager "${this.options.name}" with options:`, {
            maxSize: this.options.maxSize,
            maxBytes: this.options.maxBytes,
            ttl: this.options.ttl
        });
    }

    /**
     * Get the estimated size of an object in bytes
     * Note: This is a rough approximation
     */
    private getObjectSize(obj: any): number {
        if (obj === null || obj === undefined) {
            return 0;
        }

        if (typeof obj === 'string') {
            return obj.length * 2; // UTF-16 characters are 2 bytes each
        }

        if (typeof obj === 'number') {
            return 8; // Assume 8 bytes for numbers
        }

        if (typeof obj === 'boolean') {
            return 4; // Assume 4 bytes for booleans
        }

        if (obj instanceof ArrayBuffer) {
            return obj.byteLength;
        }

        if (ArrayBuffer.isView(obj)) {
            return obj.byteLength;
        }

        if (Array.isArray(obj)) {
            return obj.reduce((acc, item) => acc + this.getObjectSize(item), 0);
        }

        if (typeof obj === 'object') {
            return Object.entries(obj).reduce(
                (acc, [key, value]) => acc + key.length * 2 + this.getObjectSize(value),
                0
            );
        }

        return 0;
    }

    /**
     * Set a cache entry
     * @param key Cache key
     * @param data Data to cache
     * @param metadata Optional metadata
     * @returns True if set successfully
     */
    public set(key: string, data: T, metadata?: Record<string, any>): boolean {
        try {
            // Calculate approximate size of the data
            const size = this.getObjectSize(data);
            
            // First, check if this would exceed the max bytes limit
            if (size > this.options.maxBytes) {
                log.warn(`Cache entry for "${key}" exceeds max bytes limit (${size} > ${this.options.maxBytes}), skipping`);
                return false;
            }

            // Check if key already exists, update totalSize if so
            if (this.cache.has(key)) {
                this.totalSize -= this.cache.get(key)!.size;
            }

            // Create entry
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                size,
                metadata
            };

            // If adding this would exceed maxBytes, evict entries
            while (this.totalSize + size > this.options.maxBytes && this.cache.size > 0) {
                this.evictOldest();
            }

            // If we're at the size limit, evict the oldest entry
            if (this.cache.size >= this.options.maxSize) {
                this.evictOldest();
            }

            // Add to cache
            this.cache.set(key, entry);
            this.totalSize += size;

            log.info(`Cache set: "${key}" (${size} bytes), total size: ${this.totalSize} bytes, entries: ${this.cache.size}`);
            return true;
        } catch (error) {
            log.error(`Error setting cache entry for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Get a cache entry
     * @param key Cache key
     * @returns Cached data or undefined if not found or expired
     */
    public get(key: string): T | undefined {
        try {
            const entry = this.cache.get(key);
            
            // Return undefined if not found
            if (!entry) {
                log.info(`Cache miss: "${key}"`);
                return undefined;
            }

            // Check if entry has expired
            const now = Date.now();
            if (now - entry.timestamp > this.options.ttl) {
                log.info(`Cache expired: "${key}", age: ${now - entry.timestamp}ms`);
                this.delete(key);
                return undefined;
            }

            log.info(`Cache hit: "${key}", age: ${now - entry.timestamp}ms`);
            return entry.data;
        } catch (error) {
            log.error(`Error getting cache entry for key "${key}":`, error);
            return undefined;
        }
    }

    /**
     * Get cached entry with metadata
     * @param key Cache key
     * @returns Cache entry or undefined if not found or expired
     */
    public getWithMetadata(key: string): CacheEntry<T> | undefined {
        try {
            const entry = this.cache.get(key);
            
            // Return undefined if not found
            if (!entry) {
                log.info(`Cache miss: "${key}"`);
                return undefined;
            }

            // Check if entry has expired
            const now = Date.now();
            if (now - entry.timestamp > this.options.ttl) {
                log.info(`Cache expired: "${key}", age: ${now - entry.timestamp}ms`);
                this.delete(key);
                return undefined;
            }

            log.info(`Cache hit with metadata: "${key}", age: ${now - entry.timestamp}ms`);
            return entry;
        } catch (error) {
            log.error(`Error getting cache entry with metadata for key "${key}":`, error);
            return undefined;
        }
    }

    /**
     * Delete a cache entry
     * @param key Cache key
     * @returns True if entry was found and deleted
     */
    public delete(key: string): boolean {
        try {
            const entry = this.cache.get(key);
            if (entry) {
                this.totalSize -= entry.size;
                this.cache.delete(key);
                log.info(`Cache delete: "${key}", total size: ${this.totalSize} bytes, entries: ${this.cache.size}`);
                return true;
            }
            return false;
        } catch (error) {
            log.error(`Error deleting cache entry for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Clear all cache entries
     */
    public clear(): void {
        try {
            this.cache.clear();
            this.totalSize = 0;
            log.info(`Cache cleared: "${this.options.name}"`);
        } catch (error) {
            log.error(`Error clearing cache "${this.options.name}":`, error);
        }
    }

    /**
     * Evict the oldest entry from the cache
     * @returns True if an entry was evicted
     */
    private evictOldest(): boolean {
        try {
            // Find the oldest entry
            let oldestKey: string | null = null;
            let oldestTime = Infinity;

            for (const [key, entry] of this.cache.entries()) {
                if (entry.timestamp < oldestTime) {
                    oldestTime = entry.timestamp;
                    oldestKey = key;
                }
            }

            // If we found an oldest entry, delete it
            if (oldestKey) {
                const size = this.cache.get(oldestKey)!.size;
                this.cache.delete(oldestKey);
                this.totalSize -= size;
                log.info(`Cache evicted oldest entry: "${oldestKey}", age: ${Date.now() - oldestTime}ms`);
                return true;
            }

            return false;
        } catch (error) {
            log.error(`Error evicting oldest cache entry:`, error);
            return false;
        }
    }

    /**
     * Get the number of entries in the cache
     */
    public get size(): number {
        return this.cache.size;
    }

    /**
     * Get the total size of the cache in bytes
     */
    public get bytes(): number {
        return this.totalSize;
    }

    /**
     * Check if a key exists in the cache and is not expired
     * @param key Cache key
     * @returns True if key exists and is not expired
     */
    public has(key: string): boolean {
        try {
            const entry = this.cache.get(key);
            if (!entry) {
                return false;
            }

            // Check if entry has expired
            const now = Date.now();
            if (now - entry.timestamp > this.options.ttl) {
                this.delete(key);
                return false;
            }

            return true;
        } catch (error) {
            log.error(`Error checking cache key "${key}":`, error);
            return false;
        }
    }

    /**
     * Delete all expired cache entries
     * @returns Number of entries deleted
     */
    public pruneExpired(): number {
        try {
            const now = Date.now();
            let count = 0;

            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > this.options.ttl) {
                    this.delete(key);
                    count++;
                }
            }

            if (count > 0) {
                log.info(`Pruned ${count} expired cache entries`);
            }
            
            return count;
        } catch (error) {
            log.error(`Error pruning expired cache entries:`, error);
            return 0;
        }
    }

    /**
     * Get all cache keys
     * @returns Array of cache keys
     */
    public keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Run a function with caching
     * If the result is cached, return it, otherwise run the function and cache the result
     * @param key Cache key
     * @param fn Function to run
     * @returns Result of the function
     */
    public async getOrCompute<R extends T>(key: string, fn: () => Promise<R>): Promise<R> {
        try {
            // Check cache first
            const cached = this.get(key) as R;
            if (cached !== undefined) {
                return cached;
            }
            
            // Run the function
            const result = await fn();
            
            // Cache the result
            this.set(key, result);
            
            return result;
        } catch (error) {
            log.error(`Error in getOrCompute for key "${key}":`, error);
            throw error;
        }
    }
}

// Create singleton instances for common cache types
export class CacheFactory {
    private static instances: Map<string, CacheManager<any>> = new Map();

    /**
     * Get or create a cache instance
     * @param name Cache name
     * @param options Cache options
     * @returns Cache instance
     */
    public static getCache<T>(name: string, options: CacheOptions = {}): CacheManager<T> {
        if (!this.instances.has(name)) {
            this.instances.set(name, new CacheManager<T>({
                ...options,
                name
            }));
        }
        return this.instances.get(name) as CacheManager<T>;
    }

    /**
     * Clear all cache instances
     */
    public static clearAll(): void {
        for (const cache of this.instances.values()) {
            cache.clear();
        }
        log.info(`Cleared all cache instances (${this.instances.size})`);
    }

    /**
     * Prune expired entries from all caches
     * @returns Total number of pruned entries
     */
    public static pruneAllExpired(): number {
        let count = 0;
        for (const cache of this.instances.values()) {
            count += cache.pruneExpired();
        }
        if (count > 0) {
            log.info(`Pruned ${count} expired entries from all caches`);
        }
        return count;
    }
}
