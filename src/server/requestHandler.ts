import * as vscode from 'vscode';
import * as http from 'http';
import * as path from 'path';
import { McpToolManager } from '../mcp-tool-manager';
import { getProjectRoot } from '../utils/project';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('RequestHandler');

/**
 * Request Handler - Processes different types of MCP requests
 */
export class RequestHandler {
    private readonly toolManager = McpToolManager.getInstance();

    /**
     * Handle tools list request
     */
    public async handleListTools(res: http.ServerResponse): Promise<void> {
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
    public async handleStatusRequest(
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
    private createInitializeResponse(
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
    private createStatusResponse(
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
    public async handleToolExecution(
        toolName: string, 
        args: any,
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
            const result = await tool.handle(args);

            this.sendJsonResponse(res, 200, result);
        } catch (error) {
            this.handleServerError(res, error, `Error executing tool ${toolName}`);
        }
    }

    /**
     * Send JSON response
     */
    public sendJsonResponse(
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
    public handleServerError(
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