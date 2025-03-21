import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import { findAvailablePort } from './utils/portScanner';
import { NoArgs } from './types/tool';
import { McpToolManager } from './mcp-tool-manager';
import { getProjectRoot } from './utils/project';

/**
 * MCP服务类 - 处理HTTP请求
 */
export class MCPService {
    private static readonly toolManager = McpToolManager.getInstance();
    private static readonly serviceName = 'mcp';

    /**
     * 设置CORS跨域头部
     */
    private static setCorsHeaders(res: http.ServerResponse): void {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    /**
     * 处理OPTIONS预检请求
     */
    private static handleOptionsRequest(res: http.ServerResponse): void {
        res.writeHead(200);
        res.end();
    }

    /**
     * 从请求路径中提取工具名称
     */
    private static extractPathValue(pathname: string | null): string {
        if (!pathname) return '';
        const parts = pathname.split(`/${this.serviceName}/`);
        return parts[1]?.replace(/^\/+/, '') ?? '';
    }

    /**
     * 处理HTTP请求的主入口
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
     * 处理工具列表请求
     */
    private static async handleListTools(res: http.ServerResponse): Promise<void> {
        try {
            const toolsList = this.toolManager.getAllTools().map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
            }));

            this.sendJsonResponse(res, 200, toolsList);
        } catch (error) {
            this.handleServerError(res, error, '处理工具列表请求时出错');
        }
    }

    /**
     * 处理状态和初始化请求
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

            this.sendJsonResponse(res, 200, response);
        } catch (error) {
            this.handleServerError(res, error, `处理${type}请求时出错`);
        }
    }

    /**
     * 创建初始化响应
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
     * 创建状态响应
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
     * 处理工具执行请求
     */
    private static async handleToolExecution(
        toolName: string, 
        req: http.IncomingMessage, 
        res: http.ServerResponse
    ): Promise<void> {
        try {
            const tool = this.toolManager.getToolByName(toolName);
            if (!tool) {
                this.sendJsonResponse(res, 404, { 
                    status: 'error', 
                    error: `Unknown tool: ${toolName}` 
                });
                return;
            }

            const args = await this.parseRequestBody(req);
            const result = await tool.handle(args);

            this.sendJsonResponse(res, 200, result);
        } catch (error) {
            this.handleServerError(res, error, `执行工具 ${toolName} 时出错`);
        }
    }

    /**
     * 解析请求体
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
     * 发送JSON响应
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
     * 处理服务器错误
     */
    private static handleServerError(
        res: http.ServerResponse, 
        error: unknown, 
        defaultMessage = '处理请求时出错'
    ): void {
        console.error(defaultMessage, error);
        this.sendJsonResponse(res, 500, { 
            status: 'error', 
            error: error instanceof Error 
                ? error.message 
                : String(error) 
        });
    }
}

/**
 * 启动MCP服务器
 */
export function startMCPServer(portStart: number, portEnd: number): vscode.Disposable {
    let server: http.Server | null = null;
    let isDisposed = false;

    const startServer = async () => {
        try {
            if (isDisposed) return;

            const port = await findAvailablePort(portStart, portEnd);
            
            if (!port) {
                vscode.window.showErrorMessage(`无法在端口范围 ${portStart}-${portEnd} 内找到可用端口`);
                return;
            }

            if (isDisposed) return;

            server = http.createServer(async (req, res) => {
                await MCPService.handleRequest(req, res);
            });

            server.on('error', (err: Error) => {
                console.error('VSCode MCP服务器错误:', err);
                vscode.window.showErrorMessage(`VSCode MCP服务器错误: ${err.message}`);
                
                if (!isDisposed) {
                    setTimeout(() => {
                        if (!isDisposed && server) {
                            console.log('尝试自动重启VSCode MCP服务器...');
                            server.close();
                            server = null;
                            startServer();
                        }
                    }, 5000);
                }
            });

            server.listen(port, () => {
                console.log(`VSCode MCP服务器正在端口 ${port} 上运行`);
                // 通知extension当前使用的端口
                vscode.commands.executeCommand('ggMCP.updatePort', port);
                vscode.window.showInformationMessage(`VSCode MCP服务器已启动，端口: ${port}`);
            });
        } catch (error) {
            console.error('启动VSCode MCP服务器时出错:', error);
            vscode.window.showErrorMessage(`启动VSCode MCP服务器时出错: ${error instanceof Error ? error.message : String(error)}`);
            
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
                console.log('VSCode MCP服务器已关闭');
            }
        }
    };
}