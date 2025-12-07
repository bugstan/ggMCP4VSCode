import http from 'http';
import url from 'url';
import { NoArgs } from '../types/toolBases';
import { Logger } from '../utils/logger';
import { requestHandler } from './requestHandler';
import { responseHandler } from './responseHandler';
import { Defaults } from '../config/defaults';

// Create module-specific logger
const log = Logger.forModule('MCPService');

/**
 * MCP Service class - Handles HTTP requests
 */
export class MCPService {
    private static readonly serviceName = 'mcp';

    /**
     * Validate Origin header to prevent DNS rebinding attacks
     * MCP Security requirement: https://modelcontextprotocol.io/docs/concepts/transports#security-warning
     * @param origin The Origin header value from the request
     * @returns true if origin is allowed, false otherwise
     */
    private static isOriginAllowed(origin: string | undefined): boolean {
        // If no origin, it's likely a same-origin request or curl/postman - allow it
        if (!origin) {
            return true;
        }

        const allowedOrigins = Defaults.Server.allowedOrigins;

        // If no origins configured, allow all (for backwards compatibility)
        if (!allowedOrigins || allowedOrigins.length === 0) {
            return true;
        }

        // Check if origin matches any allowed pattern
        return allowedOrigins.some(pattern => {
            // Support wildcard patterns
            if (pattern.includes('*')) {
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars
                    .replace(/\*/g, '.*');  // Convert * to regex .*
                return new RegExp(`^${regexPattern}$`).test(origin);
            }
            return pattern === origin;
        });
    }

    /**
     * Set CORS headers for cross-origin requests
     * MCP Security: Only allows configured origins
     * @param req HTTP request object
     * @param res HTTP response object
     * @returns true if origin is allowed, false if request should be rejected
     */
    private static setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        const origin = req.headers['origin'];

        // Validate origin for security
        if (!this.isOriginAllowed(origin)) {
            log.warn(`Rejected request from unauthorized origin: ${origin}`);
            return false;
        }

        // Set CORS headers with validated origin
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            // For same-origin requests without Origin header, allow all
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

        return true;
    }

    /**
     * Handle OPTIONS preflight requests
     */
    private static handleOptionsRequest(res: http.ServerResponse): void {
        res.writeHead(200);
        res.end();
    }

    /**
     * Extract tool name from request path
     */
    private static extractPathValue(pathname: string | null): string {
        if (!pathname) return '';
        const parts = pathname.split(`/${this.serviceName}/`);
        // return parts[1]?.replace(/^\\/+/, '') ?? '';
        return parts[1]?.replace(/^\/+/, '') ?? '';
    }

    /**
     * Main entry point for handling HTTP requests
     */
    static async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            // Validate origin and set CORS headers
            const originAllowed = this.setCorsHeaders(req, res);
            if (!originAllowed) {
                res.writeHead(403); // Forbidden
                res.end(JSON.stringify({ error: 'Origin not allowed' }));
                return;
            }

            if (req.method === 'OPTIONS') {
                this.handleOptionsRequest(res);
                return;
            }

            const { pathname, query } = url.parse(req.url || '', true);
            const pathValue = this.extractPathValue(pathname);

            log.info('Request received', { path: pathValue, method: req.method });

            // Route the request based on the path value
            switch (pathValue) {
                case 'list_tools':
                    await requestHandler.handleListTools(res);
                    break;
                case 'initialize':
                case 'status':
                    await requestHandler.handleStatusRequest(res, pathValue, query.id);
                    break;
                default:
                    const startTime = performance.now();
                    const args = await this.parseRequestBody(req);
                    const parseTime = performance.now() - startTime;

                    // Log large request body parsing time
                    if (parseTime > Defaults.Thresholds.slowParseMs) {
                        log.info(`Request body parsing took ${parseTime.toFixed(2)}ms`);
                    }

                    await requestHandler.handleToolExecution(
                        pathValue,
                        args,
                        req.method || 'GET',
                        pathname || '/',
                        res,
                    );
            }
        } catch (error) {
            log.error('Error handling request', error);
            responseHandler.handleServerError(res, error, 'Error handling request');
        }
    }

    /**
     * Parse request body with optimized performance
     */
    private static async parseRequestBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            // Check content type
            const contentType = req.headers['content-type'] || '';
            // Log content type but don't use it in subsequent logic
            if (contentType) {
                log.debug(`Request content type: ${contentType}`);
            }

            // Use array to collect text chunks, avoid performance issues from string concatenation
            const chunks: string[] = [];
            let totalLength = 0;

            req.on('data', (chunk: Buffer) => {
                // Always use UTF-8 decoding
                const textChunk = chunk.toString('utf8');
                chunks.push(textChunk);
                totalLength += textChunk.length;

                // Log large request reception progress
                if (totalLength > Defaults.Limits.largeFileSize && chunks.length % 10 === 0) {
                    log.info(
                        `Received ${Math.floor(totalLength / (1024 * 1024))}MB of data so far`,
                    );
                }
            });

            req.on('end', () => {
                // Return empty parameters if no content
                if (chunks.length === 0) {
                    resolve(NoArgs);
                    return;
                }

                // Join all text chunks at once
                const body = chunks.join('');

                if (!body || body.trim() === '') {
                    resolve(NoArgs);
                    return;
                }

                // Log large request body size
                if (totalLength > Defaults.Limits.mediumFileSize) {
                    // Only log if larger than medium file threshold
                    log.info(`Received large request: ${totalLength} characters`);
                }

                try {
                    // Measure JSON parsing performance
                    const parseStartTime = performance.now();
                    const parsed = JSON.parse(body);
                    const parseTime = performance.now() - parseStartTime;

                    if (parseTime > Defaults.Thresholds.slowParseMs) {
                        // Log warning if parsing takes more than threshold
                        log.warn(
                            `Slow JSON parsing: ${parseTime.toFixed(2)}ms for ${totalLength} chars`,
                        );
                    }

                    resolve(
                        parsed.jsonrpc && parsed.params ? parsed.params.arguments || {} : parsed,
                    );
                } catch (error) {
                    log.error(`JSON parse error for ${totalLength} character request`, error);
                    reject(error);
                }
            });

            req.on('error', reject);
        });
    }
}
