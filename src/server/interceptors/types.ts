import { Response } from '../../types';

/**
 * Request Context Interface
 * Contains all information needed to process a request
 */
export interface RequestContext {
  toolName: string;
  params: any;
  method: string;
  path: string;
  // Used to store cached responses
  cachedResponse?: Response;
  // Used to store performance monitoring data
  [key: string]: any;
}

/**
 * Response Context Interface
 * Contains all information needed to process a response
 */
export interface ResponseContext {
  response: Response;
  statusCode: number;
}

/**
 * Interceptor Interface
 * Defines methods that must be implemented by interceptors
 */
export interface Interceptor {
  // Interceptor name, used for identification and logging
  name: string;
  
  // Priority, higher values execute first
  priority: number;
  
  /**
   * Called before request processing
   * @param context Request context
   * @returns Modified context or null (to terminate request processing)
   */
  beforeRequest: (context: RequestContext) => Promise<RequestContext | null>;
  
  /**
   * Called after response processing
   * @param request Original request context
   * @param response Response context
   * @returns Modified response context
   */
  afterResponse: (request: RequestContext, response: ResponseContext) => Promise<ResponseContext>;
}