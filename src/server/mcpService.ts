import http from 'http';
import { Logger } from '../utils/logger';
import { requestHandler } from './requestHandler';
import { responseHandler } from './responseHandler';
import { Defaults } from '../config/defaults';

// Create module-specific logger
const log = Logger.forModule('MCPService');

/**
 * JSON-RPC 2.0 Request interface
 * See: https://www.jsonrpc.org/specification
 */
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: Record<string, any>;
}

/**
 * JSON-RPC 2.0 Response interface
 */
interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * JSON-RPC Error Codes
 * See: https://www.jsonrpc.org/specification#error_object
 */
const JsonRpcErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};

/**
 * MCP Service class - Handles MCP JSON-RPC 2.0 requests
 * Implements: https://modelcontextprotocol.io/specification/latest
 */
export class MCPService {
    /**
     * Validate Origin header to prevent DNS rebinding attacks
     * MCP Security requirement: https://modelcontextprotocol.io/docs/concepts/transports#security-warning
     */
    private static isOriginAllowed(origin: string | undefined): boolean {
        if (!origin) {
            return true;
        }

        const allowedOrigins = Defaults.Server.allowedOrigins;
        if (!allowedOrigins || allowedOrigins.length === 0) {
            return true;
        }

        return allowedOrigins.some(pattern => {
            if (pattern.includes('*')) {
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');
                return new RegExp(`^${regexPattern}$`).test(origin);
            }
            return pattern === origin;
        });
    }

    /**
     * Set CORS headers for cross-origin requests
     */
    private static setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        const origin = req.headers['origin'];

        if (!this.isOriginAllowed(origin)) {
            log.warn(`Rejected request from unauthorized origin: ${origin}`);
            return false;
        }

        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.setHeader('Access-Control-Max-Age', '86400');

        return true;
    }

    /**
     * Send JSON-RPC success response
     */
    private static sendResult(res: http.ServerResponse, id: string | number | null, result: any): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            result,
        };
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(response));
    }

    /**
     * Send JSON-RPC error response
     */
    private static sendError(
        res: http.ServerResponse,
        id: string | number | null,
        code: number,
        message: string,
        data?: any
    ): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            error: { code, message, ...(data && { data }) },
        };
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200; // JSON-RPC always returns 200 for protocol-level errors
        res.end(JSON.stringify(response));
    }

    /**
     * Parse request body as JSON-RPC request
     */
    private static async parseJsonRpcRequest(req: http.IncomingMessage): Promise<JsonRpcRequest | null> {
        return new Promise((resolve) => {
            const chunks: string[] = [];

            req.on('data', (chunk: Buffer) => {
                chunks.push(chunk.toString('utf8'));
            });

            req.on('end', () => {
                if (chunks.length === 0) {
                    resolve(null);
                    return;
                }

                const body = chunks.join('');
                if (!body || body.trim() === '') {
                    resolve(null);
                    return;
                }

                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch {
                    resolve(null);
                }
            });

            req.on('error', () => resolve(null));
        });
    }

    /**
     * Main entry point for handling HTTP requests
     * Implements MCP JSON-RPC 2.0 protocol
     */
    static async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            // Validate origin and set CORS headers
            const originAllowed = this.setCorsHeaders(req, res);
            if (!originAllowed) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Origin not allowed' }));
                return;
            }

            // Handle OPTIONS preflight
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // MCP only accepts POST requests
            if (req.method !== 'POST') {
                this.sendError(res, null, JsonRpcErrorCodes.INVALID_REQUEST, 'Only POST method is allowed');
                return;
            }

            // Parse JSON-RPC request
            const rpcRequest = await this.parseJsonRpcRequest(req);

            if (!rpcRequest) {
                this.sendError(res, null, JsonRpcErrorCodes.PARSE_ERROR, 'Parse error: Invalid JSON');
                return;
            }

            // Validate JSON-RPC format
            if (rpcRequest.jsonrpc !== '2.0') {
                this.sendError(res, rpcRequest.id ?? null, JsonRpcErrorCodes.INVALID_REQUEST, 'Invalid request: jsonrpc must be "2.0"');
                return;
            }

            if (!rpcRequest.method || typeof rpcRequest.method !== 'string') {
                this.sendError(res, rpcRequest.id ?? null, JsonRpcErrorCodes.INVALID_REQUEST, 'Invalid request: method is required');
                return;
            }

            const requestId = rpcRequest.id ?? null;

            log.info('JSON-RPC request received', { method: rpcRequest.method, id: requestId });

            // Route based on method
            await this.handleMethod(res, rpcRequest.method, rpcRequest.params || {}, requestId);

        } catch (error) {
            log.error('Error handling request', error);
            this.sendError(res, null, JsonRpcErrorCodes.INTERNAL_ERROR, 'Internal error');
        }
    }

    /**
     * Handle MCP methods
     * See: https://modelcontextprotocol.io/docs/concepts/tools
     */
    private static async handleMethod(
        res: http.ServerResponse,
        method: string,
        params: Record<string, any>,
        id: string | number | null
    ): Promise<void> {
        switch (method) {
            // =====================================================
            // Lifecycle Methods
            // =====================================================
            case 'initialize':
                await this.handleInitialize(res, params, id);
                break;

            // =====================================================
            // Tool Methods
            // See: https://modelcontextprotocol.io/docs/concepts/tools#protocol-messages
            // =====================================================
            case 'tools/list':
                await this.handleToolsList(res, id);
                break;

            case 'tools/call':
                await this.handleToolsCall(res, params, id);
                break;

            // =====================================================
            // Notifications (no response expected)
            // =====================================================
            case 'notifications/initialized':
                // Client notification that initialization is complete
                log.info('Client initialized notification received');
                // For notifications, we still send 200 OK but with no body for JSON-RPC
                res.statusCode = 200;
                res.end();
                break;

            case 'notifications/cancelled':
                log.info('Cancellation notification received', params);
                res.statusCode = 200;
                res.end();
                break;

            default:
                this.sendError(res, id, JsonRpcErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`);
        }
    }

    /**
     * Handle initialize method
     * See: https://modelcontextprotocol.io/specification/latest/basic/lifecycle
     */
    private static async handleInitialize(
        res: http.ServerResponse,
        params: Record<string, any>,
        id: string | number | null
    ): Promise<void> {
        const result = {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: { listChanged: true },
            },
            serverInfo: {
                name: 'ggmcp-vscode',
                version: '1.1.2',
            },
        };

        log.info('Initialize request handled', { clientInfo: params.clientInfo });
        this.sendResult(res, id, result);
    }

    /**
     * Handle tools/list method
     * See: https://modelcontextprotocol.io/docs/concepts/tools#listing-tools
     */
    private static async handleToolsList(
        res: http.ServerResponse,
        id: string | number | null
    ): Promise<void> {
        try {
            const tools = requestHandler.getToolsList();
            this.sendResult(res, id, { tools });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.sendError(res, id, JsonRpcErrorCodes.INTERNAL_ERROR, message);
        }
    }

    /**
     * Handle tools/call method
     * See: https://modelcontextprotocol.io/docs/concepts/tools#calling-tools
     */
    private static async handleToolsCall(
        res: http.ServerResponse,
        params: Record<string, any>,
        id: string | number | null
    ): Promise<void> {
        const { name, arguments: args } = params;

        if (!name || typeof name !== 'string') {
            this.sendError(res, id, JsonRpcErrorCodes.INVALID_PARAMS, 'Invalid params: name is required');
            return;
        }

        try {
            const result = await requestHandler.executeToolDirect(name, args || {});
            this.sendResult(res, id, result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            // Tool execution errors are returned as result with isError: true
            this.sendResult(res, id, responseHandler.failure(message));
        }
    }
}
