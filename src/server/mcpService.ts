import http from 'http';
import url from 'url';
import { NoArgs } from '../types/tool';
import { Logger } from '../utils/logger';
import { requestHandler } from './requestHandler';
import { responseHandler } from './responseHandler';

// Create module-specific logger
const log = Logger.forModule('MCPService');

/**
 * MCP Service class - Handles HTTP requests
 */
export class MCPService {
    private static readonly serviceName = 'mcp';

    /**
     * Set CORS headers for cross-origin requests
     */
    private static setCorsHeaders(res: http.ServerResponse): void {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
            this.setCorsHeaders(res);

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
                    if (parseTime > 100) {
                        log.info(`Request body parsing took ${parseTime.toFixed(2)}ms`);
                    }

                    await requestHandler.handleToolExecution(
                        pathValue,
                        args,
                        req.method || 'GET',
                        pathname || '/',
                        res
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
                log.info(`Request content type: ${contentType}`);
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
                if (totalLength > 1024 * 1024 && chunks.length % 10 === 0) {
                    log.info(`Received ${Math.floor(totalLength / (1024 * 1024))}MB of data so far`);
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
                if (totalLength > 100 * 1024) { // Only log if larger than 100KB
                    log.info(`Received large request: ${totalLength} characters`);
                }

                try {
                    // Measure JSON parsing performance
                    const parseStartTime = performance.now();
                    const parsed = JSON.parse(body);
                    const parseTime = performance.now() - parseStartTime;

                    if (parseTime > 100) { // Log warning if parsing takes more than 100ms
                        log.warn(`Slow JSON parsing: ${parseTime.toFixed(2)}ms for ${totalLength} chars`);
                    }

                    resolve(
                        parsed.jsonrpc && parsed.params
                            ? parsed.params.arguments || {}
                            : parsed
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
