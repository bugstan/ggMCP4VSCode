/**
 * Response Cache System
 * 
 * This module provides a caching mechanism for HTTP responses to improve the performance
 * of frequently requested endpoints. It implements time-based expiration and selective
 * caching for safe (read-only) requests.
 */

import { Logger } from '../../utils/logger';
import { CacheManager } from '../cache/cacheManager';

// Create module-specific logger
const log = Logger.forModule('ResponseCache');

// Create a cache manager for responses
const responseCache = new CacheManager<any>({
    name: 'httpResponses',
    maxSize: 50,
    ttl: 5000, // 5 seconds
});

/**
 * ResponseCache class for storing and retrieving cached responses
 */
export class ResponseCache {
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
        
        const cachedData = responseCache.get(cacheKey);
        if (!cachedData) {
            log.info(`Cache miss for ${toolName}`);
            return null;
        }
        
        log.info(`Cache hit for ${toolName}`);
        return cachedData;
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
        
        // Store the data in cache
        responseCache.set(cacheKey, data, {
            requestHash,
            toolName
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
        for (const key of responseCache.keys()) {
            if (key.startsWith(`${toolName}:`)) {
                responseCache.delete(key);
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
        const cacheSize = responseCache.size;
        responseCache.clear();
        log.info(`Cleared entire response cache (${cacheSize} entries)`);
    }
    
    /**
     * Get cache statistics
     * @returns Object with cache statistics
     */
    public static getStats(): { entries: number, tools: string[], bytes: number } {
        const tools = new Set<string>();
        
        // Extract unique tool names from cache keys
        for (const key of responseCache.keys()) {
            const toolName = key.split(':')[0];
            if (toolName) {
                tools.add(toolName);
            }
        }
        
        return {
            entries: responseCache.size,
            tools: Array.from(tools),
            bytes: responseCache.bytes
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
            
            // Ensure Object.keys is only used on object types
            if (typeof safeArgs === 'object' && safeArgs !== null) {
                // Use type assertion to ensure TypeScript knows safeArgs is definitely an object at this point
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