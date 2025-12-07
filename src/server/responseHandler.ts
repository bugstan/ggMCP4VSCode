import http from 'http';
import { Response } from '../types';
import { Logger } from '../utils/logger';
import { ResponseContext } from './interceptors';

// Create module-specific logger
const log = Logger.forModule('ResponseHandler');

/**
 * Response Handler Class - Processes various types of HTTP responses
 * Responsible for formatting responses, adding necessary headers, and handling error cases
 */
export class ResponseHandler {
    /**
     * Send processed response
     * @param res HTTP response object
     * @param responseContext Response context
     */
    public sendResponse(res: http.ServerResponse, responseContext: ResponseContext): void {
        const { response, statusCode = 200 } = responseContext;

        try {
            // Set content type and status code
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = statusCode;

            // Convert response to JSON string
            const jsonResponse = JSON.stringify(response);

            // Send response
            res.end(jsonResponse);

            // Log response information
            const responseSize = Buffer.byteLength(jsonResponse, 'utf8');
            log.info(`Sent response (status=${statusCode}, size=${responseSize} bytes)`);
        } catch (error) {
            // Handle errors that might occur during response sending
            log.error('Error sending response:', error);

            // Try to send a simple error response
            try {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                    JSON.stringify({
                        error: 'Internal server error while sending response',
                    })
                );
            } catch {
                // If even simple error response cannot be sent, try to end response
                try {
                    res.end();
                } catch {
                    // Nothing more we can do, we've tried our best
                }
            }
        }
    }

    /**
     * Send JSON response
     * @param res HTTP response object
     * @param statusCode HTTP status code
     * @param data Response data
     */
    public sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any): void {
        this.sendResponse(res, { response: data, statusCode });
    }

    /**
     * Handle server errors
     * @param res HTTP response object
     * @param error Error object
     * @param message Error message
     */
    public handleServerError(res: http.ServerResponse, error: unknown, message: string): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`${message}: ${errorMessage}`, error);

        this.sendJsonResponse(res, 500, this.failure(`${message}: ${errorMessage}`));
    }

    /**
     * Create error response object
     * @param message Error message
     * @returns Error response object
     */
    public failure(message: string): Response {
        return {
            status: null,
            error: message,
        };
    }

    /**
     * Create standard response object with automatic JSON serialization.
     *
     * Note: This method automatically converts non-string data to JSON string
     * for MCP protocol compatibility. If you want to preserve the original
     * data type, use successRaw() instead.
     *
     * @param data Response data (will be JSON.stringify'd if not a string)
     * @param error Error message (optional)
     * @returns Standard response object
     */
    public success(data: any, error: string | null = null): Response {
        // Convert data to JSON string if it's not already a string
        // This is required for MCP protocol compatibility
        let serializedData = data;
        if (data !== null && typeof data !== 'string') {
            serializedData = JSON.stringify(data);
        }

        return {
            status: serializedData,
            error,
        };
    }

    /**
     * Create standard response object without automatic serialization.
     *
     * Use this method when you want to preserve the original data type
     * (e.g., for internal use or when data is already serialized).
     *
     * @param data Response data (preserved as-is)
     * @param error Error message (optional)
     * @returns Standard response object with raw data
     */
    public successRaw(data: any, error: string | null = null): Response {
        return {
            status: data,
            error,
        };
    }

    /**
     * Create JSON-RPC response
     * @param result Result object
     * @param id Request ID
     * @returns JSON-RPC response object
     */
    public createJsonRpcResponse(result: any, id: string | string[] | undefined): any {
        // Handle possible array ID
        const responseId = Array.isArray(id) ? id[0] : id;

        return {
            jsonrpc: '2.0',
            id: responseId || null,
            result,
        };
    }
}

// Export singleton instance
export const responseHandler = new ResponseHandler();

// Export utility function for formatting error messages
export function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === 'string') {
        return error;
    } else {
        return 'Unknown error';
    }
}
