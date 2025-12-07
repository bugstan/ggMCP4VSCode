/**
 * Cache Interceptor
 *
 * Cache interceptor for handling HTTP request and response caching
 */

import { Interceptor, RequestContext, ResponseContext } from './types';
import { Logger } from '../../utils/logger';
import { ResponseCache } from '../cache/responseCache';
import { getConfig } from '../../config';

// Create module-specific logger
const log = Logger.forModule('CacheInterceptor');

/**
 * Cache Interceptor
 * Checks cache before request processing and updates cache after response processing
 */
export class CacheInterceptor implements Interceptor {
    name = 'CacheInterceptor';
    priority = 100; // High priority, ensures execution before other interceptors

    /**
     * Called before request processing
     * Checks if there's a matching response in the cache
     */
    async beforeRequest(context: RequestContext): Promise<RequestContext | null> {
        try {
            // Check if caching is enabled in configuration
            const config = getConfig();
            if (!config.isCacheEnabled()) {
                log.info(`Cache is disabled, skipping for ${context.toolName}`);
                return context;
            }

            // Try to get response from cache
            const cachedResponse = ResponseCache.get(context.toolName, context.params);

            if (cachedResponse) {
                // Cache hit
                log.info(`Cache hit for ${context.toolName}`);

                // Update context with cached response
                return {
                    ...context,
                    cachedResponse,
                };
            } else {
                // Cache miss
                log.info(`Cache miss for ${context.toolName}`);
                return context;
            }
        } catch (error) {
            // Error handling: log error and continue request processing
            log.error(`Error in cache lookup for ${context.toolName}:`, error);
            return context;
        }
    }

    /**
     * Called after response processing
     * Stores response in cache (if applicable)
     */
    async afterResponse(
        request: RequestContext,
        response: ResponseContext
    ): Promise<ResponseContext> {
        try {
            // Check if caching is enabled in configuration
            const config = getConfig();
            if (!config.isCacheEnabled()) {
                return response;
            }

            // Cache response if successful and status code is 200
            if (response.statusCode === 200 && !response.response.isError) {
                ResponseCache.set(request.toolName, request.params, response.response);
                log.info(`Cached response for ${request.toolName}`);
            }

            return response;
        } catch (error) {
            // Error handling: log error and return original response
            log.error(`Error in cache storage for ${request.toolName}:`, error);
            return response;
        }
    }
}
