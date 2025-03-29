/**
 * Interceptor Chain
 * 
 * Interceptor chain manager, responsible for registering, sorting, and executing interceptor chains
 */

import { Logger } from '../../utils/logger';
import { Interceptor, RequestContext, ResponseContext } from './types';
import { getConfig } from '../../config';

// Create module-specific logger
const log = Logger.forModule('InterceptorChain');

/**
 * Interceptor Chain Manager
 * Manages all registered interceptors, sorts them by priority, and executes them
 */
export class InterceptorChain {
  private static instance: InterceptorChain;
  private interceptors: Interceptor[] = [];
  private sorted: boolean = false;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): InterceptorChain {
    if (!InterceptorChain.instance) {
      InterceptorChain.instance = new InterceptorChain();
    }
    return InterceptorChain.instance;
  }
  
  /**
   * Register an interceptor
   * @param interceptor Interceptor to register
   */
  public register(interceptor: Interceptor): void {
    this.interceptors.push(interceptor);
    this.sorted = false;
    log.info(`Registered interceptor: ${interceptor.name} with priority ${interceptor.priority}`);
  }
  
  /**
   * Unregister an interceptor
   * @param name Name of the interceptor to unregister
   */
  public unregister(name: string): void {
    const initialLength = this.interceptors.length;
    this.interceptors = this.interceptors.filter(i => i.name !== name);
    
    if (initialLength !== this.interceptors.length) {
      log.info(`Unregistered interceptor: ${name}`);
    } else {
      log.warn(`Attempted to unregister non-existent interceptor: ${name}`);
    }
  }
  
  /**
   * Sort interceptors by priority (higher priority executes first)
   */
  private sortInterceptors(): void {
    if (!this.sorted) {
      this.interceptors.sort((a, b) => b.priority - a.priority);
      this.sorted = true;
      
      // Log sorted interceptor chain
      const interceptorNames = this.interceptors.map(i => `${i.name}(${i.priority})`).join(', ');
      log.info(`Sorted interceptor chain: ${interceptorNames}`);
    }
  }
  
  /**
   * Process pre-request interception
   * @param context Request context
   * @returns Modified context or null (to terminate request processing)
   */
  public async processBeforeRequest(context: RequestContext): Promise<RequestContext | null> {
    this.sortInterceptors();
    let currentContext = { ...context };
    
    // Log start of interception processing
    log.info(`Processing interceptors for request: ${context.toolName}`);
    
    // Execute beforeRequest methods of all interceptors in sequence
    for (const interceptor of this.interceptors) {
      try {
        // Check if interceptor is enabled in configuration
        if (!this.isInterceptorEnabled(interceptor)) {
          log.info(`Skipping disabled interceptor: ${interceptor.name}`);
          continue;
        }
        
        const startTime = performance.now();
        const result = await interceptor.beforeRequest(currentContext);
        const duration = performance.now() - startTime;
        
        // If interceptor returns null, terminate request processing
        if (result === null) {
          log.info(`Interceptor ${interceptor.name} terminated request processing for ${context.toolName}`);
          return null;
        }
        
        // Otherwise update current context
        currentContext = result;
        
        // Log interceptors that take more than 10ms to process
        if (duration > 10) {
          log.info(`Interceptor ${interceptor.name}.beforeRequest took ${duration.toFixed(2)}ms`);
        }
      } catch (error) {
        // Error isolation: log error but continue processing chain
        log.error(`Error in interceptor ${interceptor.name}.beforeRequest:`, error);
      }
    }
    
    return currentContext;
  }
  
  /**
   * Process post-response interception
   * @param request Original request context
   * @param response Response context
   * @returns Modified response context
   */
  public async processAfterResponse(request: RequestContext, response: ResponseContext): Promise<ResponseContext> {
    this.sortInterceptors();
    let currentResponse = { ...response };
    
    // Log start of interception processing
    log.info(`Processing interceptors for response: ${request.toolName}`);
    
    // Execute afterResponse methods of all interceptors in reverse sequence
    // Note: afterResponse execution order is opposite to beforeRequest
    for (const interceptor of [...this.interceptors].reverse()) {
      try {
        // Check if interceptor is enabled in configuration
        if (!this.isInterceptorEnabled(interceptor)) {
          log.info(`Skipping disabled interceptor: ${interceptor.name}`);
          continue;
        }
        
        const startTime = performance.now();
        currentResponse = await interceptor.afterResponse(request, currentResponse);
        const duration = performance.now() - startTime;
        
        // Log interceptors that take more than 10ms to process
        if (duration > 10) {
          log.info(`Interceptor ${interceptor.name}.afterResponse took ${duration.toFixed(2)}ms`);
        }
      } catch (error) {
        // Error isolation: log error but continue processing chain
        log.error(`Error in interceptor ${interceptor.name}.afterResponse:`, error);
      }
    }
    
    return currentResponse;
  }
  
  /**
   * Check if an interceptor is enabled (via configuration)
   * @param interceptor Interceptor to check
   * @returns Whether the interceptor is enabled
   */
  private isInterceptorEnabled(interceptor: Interceptor): boolean {
    const config = getConfig();
    
    // Special handling for cache interceptor
    if (interceptor.name === 'CacheInterceptor') {
      return config.isCacheEnabled();
    }
    
    // Other interceptors are checked via configuration
    const configKey = `interceptors.${interceptor.name.replace('Interceptor', '').toLowerCase()}Enabled`;
    // Use get method to access configuration instead of directly accessing private properties
    return config.get(configKey, true);
  }
  
  /**
   * Get all registered interceptors
   */
  public getInterceptors(): Interceptor[] {
    return [...this.interceptors];
  }
  
  /**
   * Clear all interceptors
   */
  public clear(): void {
    this.interceptors = [];
    this.sorted = false;
    log.info('Cleared all interceptors');
  }
}