import { Response } from '../types';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('Response');

/**
 * Create success response
 * @param data Success data (any type)
 */
export function successResponse(data: any): Response {
    // If data is not a string, convert it to JSON string
    const status = typeof data === 'string' ? data : JSON.stringify(data);
    log.debug('Created success response', { status: status.substring(0, 100) + (status.length > 100 ? '...' : '') });
    return {
        status,
        error: null
    };
}

/**
 * Create error response
 * @param message Error message
 */
export function errorResponse(message: string): Response {
    log.debug(`Created error response: ${message}`);
    return {
        status: null,
        error: message
    };
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