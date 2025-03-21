import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import { findAvailablePort } from './utils/portScanner';
import { NoArgs } from './types/tool';
import { McpToolManager } from './mcp-tool-manager';
import { getProjectRoot } from './utils/project';
import { Logger } from './utils/logger';

// Create module-specific logger
const log = Logger.forModule('Server');

/**
 * MCP Service class - Handles HTTP requests
 */
export class MCPService {
    private static readonly toolManager = McpToolManager.getInstance();
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

            switch (pathValue) {
                case 'list_tools':
                    await this.handleListTools(res);
                    break;
                case 'initialize':
                case 'status':
                    await this.handleStatusRequest(res, pathValue, query.id);
                    break;
                default:
                    await this.handleToolExecution(pathValue, req, res);
            }
        } catch (error) {
            this.handleServerError(res, error);
        }
    }

    /**
     * Handle tools list request
     */
    private static async handleListTools(res: http.ServerResponse): Promise<void> {
        try {
            const toolsList = this.toolManager.getAllTools().map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
            }));

            log.debug('Tools list requested', { count: toolsList.length });
            this.sendJsonResponse(res, 200, toolsList);
        } catch (error) {
            this.handleServerError(res, error, 'Error processing tools list request');
        }
    }

    /**
     * Handle status and initialization requests
     */
    private static async handleStatusRequest(
        res: http.ServerResponse, 
        type: string, 
        requestId: string | string[] | undefined
    ): Promise<void> {
        try {
            const rootPath = getProjectRoot() || '';
            const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath || '';

            const response = type === 'initialize' 
                ? this.createInitializeResponse(rootPath, activeFile, requestId)
                : this.createStatusResponse(rootPath, activeFile, requestId);

            log.debug(`Processing ${type} request`, { requestId });
            this.sendJsonResponse(res, 200, response);
        } catch (error) {
            this.handleServerError(res, error, `Error processing ${type} request`);
        }
    }

    /**
     * Create initialization response
     */
    private static createInitializeResponse(
        rootPath: string, 
        activeFile: string, 
        requestId: string | string[] | undefined
    ) {
        const currentDirectory = activeFile 
            ? path.dirname(activeFile) 
            : rootPath;

        return {
            jsonrpc: "2.0",
            id: requestId,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: { listChanged: true },
                    resources: {}
                },
                serverInfo: {
                    name: "vscode-mcp-server",
                    version: "1.0.0"
                },
                environment: {
                    workspaceRoot: rootPath,
                    activeFile: activeFile,
                    currentDirectory: currentDirectory
                }
            }
        };
    }

    /**
     * Create status response
     */
    private static createStatusResponse(
        rootPath: string, 
        activeFile: string, 
        requestId: string | string[] | undefined
    ) {
        const currentDirectory = activeFile 
            ? path.dirname(activeFile) 
            : rootPath;

        return {
            jsonrpc: "2.0",
            id: requestId,
            result: {
                status: "running",
                environment: {
                    workspaceRoot: rootPath,
                    activeFile: activeFile,
                    currentDirectory: currentDirectory,
                    openFiles: vscode.workspace.textDocuments
                        .filter(doc => doc.uri.scheme === 'file')
                        .map(doc => doc.uri.fsPath)
                }
            }
        };
    }

    /**
     * Handle tool execution requests
     */
    private static async handleToolExecution(
        toolName: string, 
        req: http.IncomingMessage, 
        res: http.ServerResponse
    ): Promise<void> {
        try {
            const tool = this.toolManager.getToolByName(toolName);
            if (!tool) {
                log.warn(`Unknown tool requested: ${toolName}`);
                this.sendJsonResponse(res, 404, { 
                    status: 'error', 
                    error: `Unknown tool: ${toolName}` 
                });
                return;
            }

            log.debug(`Executing tool: ${toolName}`);
            const args = await this.parseRequestBody(req);
            const result = await tool.handle(args);

            this.sendJsonResponse(res, 200, result);
        } catch (error) {
            this.handleServerError(res, error, `Error executing tool ${toolName}`);
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

    /**
     * Send JSON response
     */
    private static sendJsonResponse(
        res: http.ServerResponse, 
        statusCode: number, 
        data: any
    ): void {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * Handle server errors
     */
    private static handleServerError(
        res: http.ServerResponse, 
        error: unknown, 
        defaultMessage = 'Error processing request'
    ): void {
        log.error(defaultMessage, error);
        
        // Report error to status bar
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.commands.executeCommand('ggMCP.reportError', `${defaultMessage}: ${errorMessage}`);
        
        this.sendJsonResponse(res, 500, { 
            status: 'error', 
            error: error instanceof Error 
                ? error.message 
                : String(error) 
        });
    }
}

/**
 * Start MCP server
 */
export function startMCPServer(portStart: number, portEnd: number): vscode.Disposable {
    let server: http.Server | null = null;
    let isDisposed = false;

    const startServer = async () => {
        try {
            if (isDisposed) return;

            // Set status to starting
            vscode.commands.executeCommand('ggMCP.updateServerStatus', 'starting');
            
            const port = await findAvailablePort(portStart, portEnd);
            
            if (!port) {
                const errorMsg = `Could not find available port in range ${portStart}-${portEnd}`;
                log.error(errorMsg);
                vscode.commands.executeCommand('ggMCP.reportError', errorMsg);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }

            if (isDisposed) return;

            server = http.createServer(async (req, res) => {
                await MCPService.handleRequest(req, res);
            });

            server.on('error', (err: Error) => {
                log.error('VSCode MCP server error:', err);
                vscode.commands.executeCommand('ggMCP.reportError', err.message);
                vscode.window.showErrorMessage(`VSCode MCP server error: ${err.message}`);
                
                if (!isDisposed) {
                    setTimeout(() => {
                        if (!isDisposed && server) {
                            log.info('Attempting to automatically restart VSCode MCP server...');
                            server.close();
                            server = null;
                            startServer();
                        }
                    }, 5000);
                }
            });

            server.listen(port, () => {
                log.info(`VSCode MCP server running on port ${port}`);
                
                // 首先更新端口信息
                vscode.commands.executeCommand('ggMCP.updatePort', port);
                
                // 然后直接更新服务器状态为 running
                // 这是一个关键修复 - 确保即使 updatePort 命令未正确工作也能更新状态
                vscode.commands.executeCommand('ggMCP.updateServerStatus', 'running');
                
                // 最后显示通知
                vscode.window.showInformationMessage(`VSCode MCP server started, port: ${port}`);
                
                log.info('Server status updated to running');
                
                // 额外添加一个延迟状态更新，以防前面的命令失败
                setTimeout(() => {
                    try {
                        vscode.commands.executeCommand('ggMCP.updateServerStatus', 'running');
                        log.info('Additional delayed status update to running');
                    } catch (retryErr) {
                        log.error('Failed delayed status update:', retryErr);
                    }
                }, 1000);
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log.error('Error starting VSCode MCP server:', error);
            vscode.commands.executeCommand('ggMCP.reportError', `Start failed: ${errorMsg}`);
            vscode.window.showErrorMessage(`Error starting VSCode MCP server: ${errorMsg}`);
            
            if (server) {
                server.close();
                server = null;
            }
        }
    };

    startServer();

    return {
        dispose: () => {
            isDisposed = true;
            if (server) {
                server.close();
                server = null;
                vscode.commands.executeCommand('ggMCP.updateServerStatus', 'stopped');
                log.info('VSCode MCP server closed');
            }
        }
    };
}