/**
 * Response Cache System
 * 
 * This module provides a caching mechanism for HTTP responses to improve the performance
 * of frequently requested endpoints. It implements time-based expiration and selective
 * caching for safe (read-only) requests.
 */

import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('ResponseCache');

/**
 * Interface for cache entries
 */
interface CacheEntry {
    /** The cached response data */
    data: any;
    /** Timestamp when the entry was created */
    timestamp: number;
    /** Hash of the request parameters (for validation) */
    requestHash: string;
}

/**
 * ResponseCache class for storing and retrieving cached responses
 */
export class ResponseCache {
    /** Map of cache entries keyed by toolName + requestHash */
    private static cache: Map<string, CacheEntry> = new Map();
    
    /** Default cache expiry time in milliseconds (5 seconds) */
    private static readonly DEFAULT_EXPIRY_MS = 5000;
    
    /** Maximum number of cache entries */
    private static readonly MAX_CACHE_SIZE = 50;
    
    /** List of tools that should not be cached (write operations, nondeterministic, etc.) */
    private static readonly UNCACHEABLE_TOOLS = new Set([
        // Write operations
        'replace_file_text_by_path',
        'replace_selected_text',
        'replace_current_file_text',
        'create_new_file_with_text',
        'delete_entities',
        'delete_observations',
        'delete_relations',
        'commit_changes',
        'pull_changes',
        'switch_branch',
        'create_branch',
        'toggle_debugger_breakpoint',
        'run_configuration',
        'execute_terminal_command',
        'execute_action_by_id',
        'refactor_code_at_location',
        
        // Non-deterministic tools or tools with side effects
        'wait',
        'get_terminal_text',
        
        // Tools that should always return fresh data
        'read_graph',
        'get_progress_indicators',
        'get_file_diff'
    ]);
    
    /**
     * Get a cached response for a tool request
     * @param toolName The name of the tool
     * @param args The arguments passed to the tool
     * @returns The cached response or null if not in cache or expired
     */
    public static get(toolName: string, args: any): any | null {
        // Don't cache responses for uncacheable tools
        if (this.UNCACHEABLE_TOOLS.has(toolName)) {
            return null;
        }
        
        // Create hash from args to use as a cache key component
        const requestHash = this.hashRequest(args);
        const cacheKey = `${toolName}:${requestHash}`;
        
        const entry = this.cache.get(cacheKey);
        if (!entry) {
            log.info(`Cache miss for ${toolName}`);
            return null;
        }
        
        const now = Date.now();
        // Check if entry has expired
        if (now - entry.timestamp > this.DEFAULT_EXPIRY_MS) {
            log.info(`Cache expired for ${toolName}`);
            this.cache.delete(cacheKey);
            return null;
        }
        
        // Verify request hash matches to ensure the exact same request
        if (entry.requestHash !== requestHash) {
            log.info(`Cache hash mismatch for ${toolName}`);
            return null;
        }
        
        log.info(`Cache hit for ${toolName}`);
        return entry.data;
    }
    
    /**
     * Store a response in the cache
     * @param toolName The name of the tool
     * @param args The arguments passed to the tool
     * @param data The response data to cache
     */
    public static set(toolName: string, args: any, data: any): void {
        // Don't cache responses for uncacheable tools
        if (this.UNCACHEABLE_TOOLS.has(toolName)) {
            return;
        }
        
        // Skip caching if data indicates an error
        if (data && data.error) {
            log.info(`Not caching error response for ${toolName}`);
            return;
        }
        
        // Create hash from args to use as a cache key component
        const requestHash = this.hashRequest(args);
        const cacheKey = `${toolName}:${requestHash}`;
        
        // Enforce max cache size by removing oldest entries if needed
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const entries = Array.from(this.cache.entries());
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            // Remove oldest entry
            if (entries.length > 0 && entries[0]) {
                this.cache.delete(entries[0][0]);
                log.info(`Removed oldest cache entry to maintain size limit`);
            }
        }
        
        // Store the data in cache
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            requestHash
        });
        
        log.info(`Cached response for ${toolName}`);
    }
    
    /**
     * Invalidate specific cache entries by tool name
     * @param toolName The name of the tool to invalidate
     */
    public static invalidate(toolName: string): void {
        let count = 0;
        
        // Find and delete all entries for the specified tool
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${toolName}:`)) {
                this.cache.delete(key);
                count++;
            }
        }
        
        if (count > 0) {
            log.info(`Invalidated ${count} cache entries for ${toolName}`);
        }
    }
    
    /**
     * Clear all cache entries
     */
    public static clear(): void {
        const count = this.cache.size;
        this.cache.clear();
        log.info(`Cleared entire response cache (${count} entries)`);
    }
    
    /**
     * Get cache statistics
     * @returns Object with cache statistics
     */
    public static getStats(): { entries: number, tools: string[] } {
        const tools = new Set<string>();
        
        // Extract unique tool names from cache keys
        for (const key of this.cache.keys()) {
            const toolName = key.split(':')[0];
            if (toolName) {
                tools.add(toolName);
            }
        }
        
        return {
            entries: this.cache.size,
            tools: Array.from(tools)
        };
    }
    
    /**
     * Create a hash of the request arguments for cache key
     * @param args The arguments to hash
     * @returns A string hash of the arguments
     */
    private static hashRequest(args: any): string {
        try {
            // Ensure args is a valid value
            const safeArgs = args || {};
            
            // Only use Object.keys for object types
            if (typeof safeArgs === 'object' && safeArgs !== null) {
                // Use type assertion to ensure TypeScript knows safeArgs is definitely an object
                const objArgs = safeArgs as Record<string, any>;
                const keys = Object.keys(objArgs).sort();
                return JSON.stringify(objArgs, keys);
            } else {
                // If not an object, convert directly to string
                return JSON.stringify(safeArgs);
            }
        } catch (error) {
            log.warn('Failed to hash request arguments', error);
            // Fallback to random string to effectively disable caching for this request
            return `no-cache-${Date.now()}-${Math.random()}`;
        }
    }
}