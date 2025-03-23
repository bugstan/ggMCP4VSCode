import * as http from 'http';
import * as url from 'url';
import { NoArgs } from '../types/tool';
import { Logger } from '../utils/logger';
import { RequestHandler } from './requestHandler';

// Create module-specific logger
const log = Logger.forModule('MCPService');

/**
 * MCP Service class - Handles HTTP requests
 */
export class MCPService {
    private static readonly serviceName = 'mcp';
    private static readonly requestHandler = new RequestHandler();

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

            log.debug('Request received', { path: pathValue, method: req.method });

            // Route the request based on the path value
            switch (pathValue) {
                case 'list_tools':
                    await this.requestHandler.handleListTools(res);
                    break;
                case 'initialize':
                case 'status':
                    await this.requestHandler.handleStatusRequest(res, pathValue, query.id);
                    break;
                default:
                    const args = await this.parseRequestBody(req);
                    await this.requestHandler.handleToolExecution(pathValue, args, res);
            }
        } catch (error) {
            this.requestHandler.handleServerError(res, error);
        }
    }

    /**
     * Parse request body
     */
    private static async parseRequestBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', (chunk: Buffer) => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                if (!body || body.trim() === '') {
                    resolve(NoArgs);
                    return;
                }
                
                try {
                    const parsed = JSON.parse(body);
                    resolve(
                        parsed.jsonrpc && parsed.params 
                            ? parsed.params.arguments || {} 
                            : parsed
                    );
                } catch (error) {
                    reject(error);
                }
            });
            
            req.on('error', reject);
        });
    }
}