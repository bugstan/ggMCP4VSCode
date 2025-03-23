import { Response } from '../types';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('Response');

/**
 * Create response object
 * @param status Success data (any type), null for error response
 * @param error Error message, null for success response
 * @returns Response object
 */
export function createResponse(status: any = null, error: string | null = null): Response {
    if (error) {
        // 错误响应
        log.debug(`Created error response: ${error}`);
        return {
            status: null,
            error
        };
    } else {
        // 成功响应
        // 如果 status 不是字符串，将其转换为 JSON 字符串
        const statusStr = typeof status === 'string' ? status : JSON.stringify(status);
        log.debug('Created success response', { 
            status: statusStr ? 
                statusStr.substring(0, 100) + (statusStr.length > 100 ? '...' : '') : 
                'null' 
        });
        return {
            status,
            error: null
        };
    }
}

/**
 * Create success response (保留向后兼容性)
 * @param data Success data (any type)
 * @deprecated 使用 createResponse(data) 代替
 */
export function successResponse(data: any): Response {
    return createResponse(data);
}

/**
 * Create error response (保留向后兼容性)
 * @param message Error message
 * @deprecated 使用 createResponse(null, message) 代替
 */
export function errorResponse(message: string): Response {
    return createResponse(null, message);
}

/**
 * Format error information
 * @param error Error object or string
 */
export function formatError(error: unknown): string {
    const formatted = error instanceof Error ? error.message : String(error);
    log.debug(`Formatted error: ${formatted}`);
    return formatted;
}