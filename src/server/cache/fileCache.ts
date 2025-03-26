/**
 * File Cache
 * 
 * A specialized cache for file content to improve file operation efficiency.
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileCache');

interface FileCacheEntry {
    content: string;
    timestamp: number;
    size: number;
}

/**
 * FileCache class - Provides caching for file content to reduce disk I/O
 */
export class FileCache {
    private static readonly CACHE_EXPIRY_MS = 5000; // Cache for 5 seconds
    private static readonly MAX_CACHE_SIZE = 20; // Cache up to 20 files
    private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // Limit cached file size to 5MB
    private static cache: Map<string, FileCacheEntry> = new Map();

    /**
     * Get file content, preferably from cache
     */
    public static async getFileContent(filePath: string): Promise<string> {
        const cacheEntry = this.cache.get(filePath);
        const now = Date.now();

        // If cache exists and has not expired, return it
        if (cacheEntry && (now - cacheEntry.timestamp) < this.CACHE_EXPIRY_MS) {
            log.info(`Cache hit for file: ${filePath}`);
            return cacheEntry.content;
        }

        // Read from file system
        log.info(`Cache miss for file: ${filePath}, reading from disk`);
        const fileUri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(fileUri);
        const text = new TextDecoder().decode(content);

        // Only cache files smaller than the size limit
        if (text.length <= this.MAX_FILE_SIZE) {
            // Manage cache size
            if (this.cache.size >= this.MAX_CACHE_SIZE) {
                // Remove oldest entry
                const entries = Array.from(this.cache.entries());
                if (entries.length > 0) {
                    const oldestEntry = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0]!;
                    const oldestKey = oldestEntry[0];
                    this.cache.delete(oldestKey);
                    log.info(`Removed oldest cache entry: ${oldestKey}`);
                }
            }

            // Add to cache
            this.cache.set(filePath, {
                content: text,
                timestamp: now,
                size: text.length
            });
            log.info(`Added to cache: ${filePath}, size: ${text.length} characters`);
        } else {
            log.info(`File too large to cache: ${filePath}, size: ${text.length} characters`);
        }

        return text;
    }

    /**
     * Invalidate a file in the cache
     */
    public static invalidate(filePath: string): void {
        if (this.cache.has(filePath)) {
            log.info(`Invalidating cache for file: ${filePath}`);
            this.cache.delete(filePath);
        }
    }

    /**
     * Clear the entire cache
     */
    public static clear(): void {
        log.info(`Clearing entire file cache with ${this.cache.size} entries`);
        this.cache.clear();
    }

    /**
     * Get cache size info
     */
    public static getCacheInfo(): { entries: number, sizeBytes: number } {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size;
        }
        
        return {
            entries: this.cache.size,
            sizeBytes: totalSize
        };
    }
    
    /**
     * Check if a file is in the cache and not expired
     */
    public static isCached(filePath: string): boolean {
        const entry = this.cache.get(filePath);
        if (!entry) return false;
        
        return (Date.now() - entry.timestamp) < this.CACHE_EXPIRY_MS;
    }
}
