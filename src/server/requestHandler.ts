import * as vscode from 'vscode';
import http from 'http';
import { ToolManager } from '../toolManager';
import { getProjectRoot, getDirName } from '../utils/pathUtils';
import { Logger } from '../utils/logger';
import { responseHandler } from './responseHandler';
import { RequestContext, ResponseContext } from './interceptors';
import { InterceptorChain, initializeInterceptors } from './interceptors';

// Create module-specific logger
const log = Logger.forModule('RequestHandler');

/**
 * Request Handler Class - Processes various types of MCP HTTP requests
 * Responsible for routing requests to appropriate processing logic and invoking interceptor chain
 */
export class RequestHandler {
    private readonly toolManager = ToolManager.getInstance();
    private readonly interceptorChain: InterceptorChain;

    constructor() {
        // Initialize interceptor chain
        this.interceptorChain = InterceptorChain.getInstance();
        // Register default interceptors
        initializeInterceptors();

        log.info('RequestHandler initialized with interceptor chain');
    }

    /**
     * Handle tools list request
     * @param res HTTP response object
     */
    public async handleListTools(res: http.ServerResponse): Promise<void> {
        try {
            const toolsList = this.toolManager.getAllTools().map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));

            log.info('Tools list requested', { count: toolsList.length });
            responseHandler.sendJsonResponse(res, 200, toolsList);
        } catch (error) {
            responseHandler.handleServerError(res, error, 'Error processing tools list request');
        }
    }

    /**
     * Handle status and initialization requests
     * @param res HTTP response object
     * @param type Request type ('initialize' or 'status')
     * @param requestId Request ID
     */
    public async handleStatusRequest(
        res: http.ServerResponse,
        type: 'initialize' | 'status',
        requestId: string | string[] | undefined
    ): Promise<void> {
        try {
            const rootPath = getProjectRoot() || '';
            const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath || '';

            const response =
                type === 'initialize'
                    ? this.createInitializeResponse(rootPath, activeFile, requestId)
                    : this.createStatusResponse(rootPath, activeFile, requestId);

            log.info(`Processing ${type} request`, { requestId });
            responseHandler.sendJsonResponse(res, 200, response);
        } catch (error) {
            responseHandler.handleServerError(res, error, `Error processing ${type} request`);
        }
    }

    /**
     * Create initialization response
     * @param rootPath Project root path
     * @param activeFile Current active file
     * @param requestId Request ID
     */
    private createInitializeResponse(
        rootPath: string,
        activeFile: string,
        requestId: string | string[] | undefined
    ) {
        const currentDirectory = activeFile ? getDirName(activeFile) : rootPath;

        return responseHandler.createJsonRpcResponse(
            {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: { listChanged: true },
                    resources: {},
                },
                serverInfo: {
                    name: 'vscode-mcp-server',
                    version: '1.0.0',
                },
                environment: {
                    workspaceRoot: rootPath,
                    activeFile: activeFile,
                    currentDirectory: currentDirectory,
                },
            },
            requestId
        );
    }

    /**
     * Create status response
     * @param rootPath Project root path
     * @param activeFile Current active file
     * @param requestId Request ID
     */
    private createStatusResponse(
        rootPath: string,
        activeFile: string,
        requestId: string | string[] | undefined
    ) {
        const currentDirectory = activeFile ? getDirName(activeFile) : rootPath;

        return responseHandler.createJsonRpcResponse(
            {
                status: 'running',
                environment: {
                    workspaceRoot: rootPath,
                    activeFile: activeFile,
                    currentDirectory: currentDirectory,
                    openFiles: vscode.workspace.textDocuments
                        .filter((doc) => doc.uri.scheme === 'file')
                        .map((doc) => doc.uri.fsPath),
                },
            },
            requestId
        );
    }

    /**
     * Handle tool execution request
     * @param toolName Tool name
     * @param params Tool parameters
     * @param method HTTP method
     * @param path Request path
     * @param res HTTP response object
     */
    public async handleToolExecution(
        toolName: string,
        params: any,
        method: string,
        path: string,
        res: http.ServerResponse
    ): Promise<void> {
        try {
            const tool = this.toolManager.getToolByName(toolName);
            if (!tool) {
                log.warn(`Unknown tool requested: ${toolName}`);
                responseHandler.sendJsonResponse(
                    res,
                    404,
                    responseHandler.failure(`Unknown tool: ${toolName}`)
                );
                return;
            }

            // Create request context
            let requestContext: RequestContext = {
                toolName,
                params,
                method,
                path,
            };

            // Execute before request interceptor chain
            const startTime = performance.now();
            const processedContext =
                await this.interceptorChain.processBeforeRequest(requestContext);
            const beforeTime = performance.now() - startTime;

            // If interceptor returns null, terminate request processing
            if (processedContext === null) {
                log.info(`Request processing terminated by interceptor for tool: ${toolName}`);
                responseHandler.sendJsonResponse(
                    res,
                    200,
                    responseHandler.failure('Request cancelled by interceptor')
                );
                return;
            }

            // Update request context
            requestContext = processedContext;

            // If cached response exists, return directly
            if (requestContext.cachedResponse) {
                log.info(`Using cached response for tool: ${toolName}`);
                responseHandler.sendJsonResponse(res, 200, requestContext.cachedResponse);

                // Log interceptor performance
                const totalTime = performance.now() - startTime;
                log.info(`Interceptor chain completed in ${totalTime.toFixed(2)}ms (cache hit)`);
                return;
            }

            log.info(`Executing tool: ${toolName}`);
            const result = await tool.handle(params);

            // Create response context
            let responseContext: ResponseContext = {
                response: result,
                statusCode: 200,
            };

            // Execute after response interceptor chain
            const afterStartTime = performance.now();
            responseContext = await this.interceptorChain.processAfterResponse(
                requestContext,
                responseContext
            );
            const afterTime = performance.now() - afterStartTime;

            // Log interceptor performance
            const totalTime = performance.now() - startTime;
            if (totalTime > 50) {
                log.info(
                    `Interceptor chain processing: before=${beforeTime.toFixed(2)}ms, after=${afterTime.toFixed(2)}ms, total=${totalTime.toFixed(2)}ms`
                );
            }

            // Send response using responseHandler
            responseHandler.sendResponse(res, responseContext);
        } catch (error) {
            responseHandler.handleServerError(res, error, `Error executing tool ${toolName}`);
        }
    }
}

// Export singleton instance
export const requestHandler = new RequestHandler();
