import http from 'http';
import { Response, McpContent } from '../types';
import { Logger } from '../utils/logger';
import { ResponseContext } from './interceptors';

// Create module-specific logger
const log = Logger.forModule('ResponseHandler');

/**
 * Response Handler Class - Handles MCP-compliant HTTP responses
 * All responses follow MCP specification: https://modelcontextprotocol.io/docs/concepts/tools#tool-result
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
            log.debug(`Sent response (status=${statusCode}, size=${responseSize} bytes)`);
        } catch (error) {
            // Handle errors that might occur during response sending
            log.error('Error sending response:', error);

            // Try to send a simple error response in MCP format
            try {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(this.failure('Internal server error while sending response')));
            } catch {
                // If even simple error response cannot be sent, try to end response
                try {
                    res.end();
                } catch {
                    // Nothing more we can do
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
     * Handle server errors - returns MCP-compliant error response
     * @param res HTTP response object
     * @param error Error object
     * @param message Error message
     */
    public handleServerError(res: http.ServerResponse, error: unknown, message: string): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`${message}: ${errorMessage}`, error);

        this.sendJsonResponse(res, 500, this.failure(`${message}: ${errorMessage}`));
    }

    // =========================================================================
    // MCP Protocol Compliant Response Methods
    // See: https://modelcontextprotocol.io/docs/concepts/tools#tool-result
    // =========================================================================

    /**
     * Create MCP-compliant success response with text content
     *
     * @param data Response data (will be converted to text content)
     * @returns MCP tool result with content array
     */
    public success(data: any): Response {
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return {
            content: [{ type: 'text', text }],
            isError: false,
        };
    }

    /**
     * Create MCP-compliant error response
     *
     * @param message Error message
     * @returns MCP tool result with isError flag
     */
    public failure(message: string): Response {
        return {
            content: [{ type: 'text', text: message }],
            isError: true,
        };
    }

    /**
     * Create MCP-compliant response with multiple content items
     *
     * @param contents Array of content items
     * @param isError Whether this is an error response
     * @returns MCP tool result
     */
    public result(contents: McpContent[], isError: boolean = false): Response {
        return {
            content: contents,
            isError,
        };
    }

    /**
     * Create text content item
     *
     * @param text Text content
     * @returns MCP text content item
     */
    public textContent(text: string): McpContent {
        return { type: 'text', text };
    }

    /**
     * Create JSON-RPC 2.0 response wrapper
     * Used for initialize/status endpoints
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
