/**
 * Interceptors index
 *
 * Exports all interceptor implementations and interceptor chain manager
 */

export * from './types';
export * from './interceptorChain';
export * from './cacheInterceptor';
export * from './operationInterceptor';

// Utility function: Initialize and register default interceptors
import { InterceptorChain } from './interceptorChain';
import { CacheInterceptor } from './cacheInterceptor';
import { OperationInterceptor } from './operationInterceptor';

// Track initialization state to prevent duplicate registration
let interceptorsInitialized = false;

/**
 * Initialize interceptor system and register default interceptors.
 * This function is idempotent - calling it multiple times has no effect after first call.
 */
export function initializeInterceptors(): void {
    // Guard against multiple initialization
    if (interceptorsInitialized) {
        return;
    }

    const chain = InterceptorChain.getInstance();

    // Register cache interceptor (high priority)
    chain.register(new CacheInterceptor());

    // Register operation interceptor (medium priority)
    chain.register(new OperationInterceptor());

    interceptorsInitialized = true;
}

/**
 * Check if interceptors have been initialized
 * @returns True if interceptors have been initialized
 */
export function isInterceptorsInitialized(): boolean {
    return interceptorsInitialized;
}

/**
 * Reset interceptor initialization state (for testing purposes only)
 */
export function resetInterceptors(): void {
    const chain = InterceptorChain.getInstance();
    chain.clear();
    interceptorsInitialized = false;
}
