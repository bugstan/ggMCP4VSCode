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

/**
 * Initialize interceptor system and register default interceptors
 */
export function initializeInterceptors(): void {
  const chain = InterceptorChain.getInstance();
  
  // Register cache interceptor (high priority)
  chain.register(new CacheInterceptor());
  
  // Register operation interceptor (medium priority)
  chain.register(new OperationInterceptor());
}