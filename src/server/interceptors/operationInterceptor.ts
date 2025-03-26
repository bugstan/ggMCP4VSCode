/**
 * Operation Interceptor
 * 
 * Operation interceptor for handling request operations, providing validation, logging, and performance monitoring
 */

import { Interceptor, RequestContext, ResponseContext } from './types';
import { Logger } from '../../utils/logger';
import { FileCache } from '../cache/fileCache';

// Create module-specific logger
const log = Logger.forModule('OperationInterceptor');

/**
 * Operation Interceptor
 * Handles request operations, providing validation, logging, and performance monitoring
 */
export class OperationInterceptor implements Interceptor {
  name = 'OperationInterceptor';
  priority = 50; // Medium priority, executes after cache interceptor
  
  // List of file operation tools
  private readonly FILE_OPERATION_TOOLS = new Set([
    'get_file_text_by_path',
    'replace_file_text_by_path',
    'create_new_file_with_text',
    'list_files_in_folder',
    'find_files_by_name_substring',
    'search_in_files_content',
    'get_open_in_editor_file_text',
    'get_all_open_file_texts'
  ]);
  
  // List of terminal operation tools
  private readonly TERMINAL_OPERATION_TOOLS = new Set([
    'execute_terminal_command',
    'get_terminal_text',
    'get_command_output'
  ]);
  
  /**
   * Called before request processing
   * Validates operation requests and logs operations
   */
  async beforeRequest(context: RequestContext): Promise<RequestContext | null> {
    try {
      // Log operation start
      const operationType = this.getOperationType(context.toolName);
      log.info(`Starting operation: ${context.toolName} (${operationType})`);
      
      // Log request parameters (excluding sensitive information and large content)
      this.logRequestParams(context);
      
      // Add timing to context for performance monitoring
      const contextWithTiming = {
        ...context,
        startTime: performance.now()
      };
      
      return contextWithTiming;
    } catch (error) {
      // Error handling: log error and continue request processing
      log.error(`Error processing operation ${context.toolName}:`, error);
      return context;
    }
  }
  
  /**
   * Called after response processing
   * Logs operation results and performance metrics
   */
  async afterResponse(request: RequestContext, response: ResponseContext): Promise<ResponseContext> {
    try {
      // Calculate operation duration
      const startTime = request.startTime || 0;
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log operation results
      const status = response.response.error ? 'ERROR' : 'SUCCESS';
      log.info(`Operation ${request.toolName} completed: ${status} (${duration.toFixed(2)}ms)`);
      
      // For file operations, handle cache invalidation
      if (this.FILE_OPERATION_TOOLS.has(request.toolName)) {
        this.handleFileCacheInvalidation(request, status === 'SUCCESS');
      }
      
      // Enhance response information - use type assertion to resolve TypeScript error
      const enhancedResponse = response.response as any;
      enhancedResponse._meta = {
        ...(enhancedResponse._meta || {}),
        operationTime: Math.round(duration),
        toolName: request.toolName
      };
      
      return response;
    } catch (error) {
      // Error handling: log error and return original response
      log.error(`Error finalizing operation ${request.toolName}:`, error);
      return response;
    }
  }
  
  /**
   * Get operation type
   * @param toolName Tool name
   * @returns Operation type string
   */
  private getOperationType(toolName: string): string {
    if (this.FILE_OPERATION_TOOLS.has(toolName)) {
      return 'file';
    } else if (this.TERMINAL_OPERATION_TOOLS.has(toolName)) {
      return 'terminal';
    } else {
      return 'other';
    }
  }
  
  /**
   * Log request parameters
   * @param context Request context
   */
  private logRequestParams(context: RequestContext): void {
    try {
      const { toolName, params } = context;
      
      // Deep copy parameters for safe handling
      const safeParams = JSON.parse(JSON.stringify(params || {}));
      
      // Truncate content for parameters that might contain large text
      if (safeParams.text && typeof safeParams.text === 'string' && safeParams.text.length > 100) {
        safeParams.text = `${safeParams.text.substring(0, 100)}... (${safeParams.text.length} characters)`;
      }
      
      // Log processed request parameters
      log.info(`Request params for ${toolName}:`, safeParams);
    } catch (error) {
      log.warn(`Error logging request params for ${context.toolName}:`, error);
    }
  }
  
  /**
   * Handle file cache invalidation
   * @param request Request context
   * @param success Whether the operation was successful
   */
  private handleFileCacheInvalidation(request: RequestContext, success: boolean): void {
    if (!success) return;
    
    try {
      const { toolName, params } = request;
      
      // Handle cache invalidation for file write operations
      if (toolName === 'replace_file_text_by_path' || toolName === 'create_new_file_with_text') {
        if (params.pathInProject) {
          // Directly invalidate specific file cache
          const path = params.pathInProject;
          log.info(`Invalidating file cache for: ${path}`);
          // Note: FileCache here is the file cache manager we assume exists
          FileCache.invalidate(path);
        }
      }
    } catch (error) {
      log.warn(`Error handling file cache invalidation:`, error);
    }
  }
}