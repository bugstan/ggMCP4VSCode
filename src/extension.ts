import * as vscode from 'vscode';
import { startMCPServer } from './server';
import { Logger } from './utils/logger';

// Create module-specific logger
const log = Logger.forModule('Extension');

// Variables to store current server port and status
let currentServerPort: number | null = null;
let serverStatus: 'starting' | 'running' | 'error' | 'stopped' = 'stopped';
let serverError: string | null = null;

// Status bar item
let statusBarItem: vscode.StatusBarItem;

/**
 * Set current server port
 * @param port Port number
 */
export function setCurrentServerPort(port: number): void {
    log.info(`Setting current server port to: ${port}`);
    currentServerPort = port;
    updateServerStatus('running');
}

/**
 * Get current server port
 * @returns Current port number or null
 */
export function getCurrentServerPort(): number | null {
    return currentServerPort;
}

/**
 * Update server status
 * @param status New status
 * @param error Error message (if any)
 */
export function updateServerStatus(status: 'starting' | 'running' | 'error' | 'stopped', error: string | null = null): void {
    log.info(`Updating server status from ${serverStatus} to ${status}`, error ? { error } : undefined);
    serverStatus = status;
    serverError = error;
    
    // If status bar item is initialized, update it
    if (statusBarItem) {
        updateStatusBar();
    } else {
        log.warn('Status bar item not initialized when updating status');
    }
}

/**
 * Update status bar display
 */
function updateStatusBar(): void {
    log.info(`Updating status bar with status: ${serverStatus}`);
    
    switch (serverStatus) {
        case 'starting':
            statusBarItem.text = '$(sync~spin) VSCode MCP Server';
            statusBarItem.tooltip = 'Starting VSCode MCP Server...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'running':
            statusBarItem.text = '$(zap) VSCode MCP Server';
            statusBarItem.tooltip = currentServerPort 
                ? `VSCode MCP Server running on port ${currentServerPort}, using /mcp/ path` 
                : 'VSCode MCP Server is running';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'error':
            statusBarItem.text = '$(error) VSCode MCP Server';
            statusBarItem.tooltip = serverError 
                ? `VSCode MCP Server error: ${serverError}` 
                : 'VSCode MCP Server error';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
        case 'stopped':
            statusBarItem.text = '$(circle-slash) VSCode MCP Server';
            statusBarItem.tooltip = 'VSCode MCP Server stopped';
            statusBarItem.backgroundColor = undefined;
            break;
    }
    
    // Set click command
    statusBarItem.command = 'ggMCP.showStatus';
    
    // 确保强制刷新状态栏
    statusBarItem.show();
}

/**
 * Callback function when plugin is activated
 * @param context Plugin context
 */
export function activate(context: vscode.ExtensionContext) {
    log.info('VSCode MCP Server plugin activated');

    if (!vscode.workspace.workspaceFolders) {
        log.warn("Workspace folders is empty, VSCode may not have opened a project folder!");
    }

    // Log basic information
    log.debug("Visible text editors count:", vscode.window.visibleTextEditors.length);
    log.debug("Text documents count:", vscode.workspace.textDocuments.length);
    log.debug("Workspace folders count:", vscode.workspace.workspaceFolders?.length || 0);

    // Get port range from configuration, default is 9960-9990
    const config = vscode.workspace.getConfiguration('ggMCP');
    const portStart = config.get<number>('portStart', 9960);
    const portEnd = config.get<number>('portEnd', 9990);
    log.info(`Port range configured as: ${portStart}-${portEnd}`);

    // Initialize status bar item with higher priority (lower number)
    // 将优先级提高到 10，以确保显示在状态栏的前面
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBarItem.show();
    updateServerStatus('starting');
    
    // 先注册命令，然后再启动服务器
    
    // Register command: Show server status
    const showStatusCommand = vscode.commands.registerCommand('ggMCP.showStatus', () => {
        if (serverStatus === 'running' && currentServerPort) {
            vscode.window.showInformationMessage(
                `VSCode MCP Server is running on port ${currentServerPort}, using standard MCP protocol`,
                'Restart', 'More Info'
            ).then(selection => {
                if (selection === 'Restart') {
                    vscode.commands.executeCommand('ggMCP.restart');
                } else if (selection === 'More Info') {
                    // Show more detailed status information
                    const portInfo = `Port: ${currentServerPort}`;
                    const statusInfo = `Status: ${serverStatus}`;
                    const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'None';
                    const projectInfo = `Project root: ${projectRoot}`;
                    
                    vscode.window.showInformationMessage(
                        `Server Information:\n${portInfo}\n${statusInfo}\n${projectInfo}`
                    );
                }
            });
        } else if (serverStatus === 'error') {
            vscode.window.showErrorMessage(
                `VSCode MCP Server error: ${serverError || 'Unknown error'}`,
                'Restart'
            ).then(selection => {
                if (selection === 'Restart') {
                    vscode.commands.executeCommand('ggMCP.restart');
                }
            });
        } else {
            vscode.window.showInformationMessage(
                `VSCode MCP Server ${serverStatus === 'starting' ? 'is starting...' : 'is not running or port information is not available'}`,
                'Restart'
            ).then(selection => {
                if (selection === 'Restart') {
                    vscode.commands.executeCommand('ggMCP.restart');
                }
            });
        }
    });

    // Register command: Restart server
    const restartCommand = vscode.commands.registerCommand('ggMCP.restart', () => {
        // Handle old server first
        if (serverDisposable) {
            serverDisposable.dispose();
        }
        
        // Update status
        updateServerStatus('starting');
        currentServerPort = null;
        
        // Start new server and save reference
        serverDisposable = startMCPServer(portStart, portEnd);
        vscode.window.showInformationMessage('VSCode MCP Server has been restarted');
        log.info('Server has been restarted');
    });

    // Register command: Server error report
    const errorCommand = vscode.commands.registerCommand('ggMCP.reportError', (error: string) => {
        log.error('Server reported error:', error);
        updateServerStatus('error', error);
        vscode.window.showErrorMessage(`VSCode MCP Server error: ${error}`);
    });

    // Register command: Server status update
    const updateStatusCommand = vscode.commands.registerCommand('ggMCP.updateServerStatus', 
        (status: 'starting' | 'running' | 'error' | 'stopped', error?: string) => {
            log.info(`Received status update command: ${status}`, error ? { error } : undefined);
            updateServerStatus(status, error || null);
        }
    );

    // Set port update event
    const updatePortCommand = vscode.commands.registerCommand('ggMCP.updatePort', (port: number) => {
        log.info(`Received port update command: ${port}`);
        currentServerPort = port;
        updateServerStatus('running');
    });

    // Listen for configuration changes
    const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(e => {
        // Check if our configuration items have changed
        const isRelevantChange = e.affectsConfiguration('ggMCP.portStart') || 
                                e.affectsConfiguration('ggMCP.portEnd') ||
                                e.affectsConfiguration('ggMCP.logLevel');
                               
        if (isRelevantChange) {
            // Get new configuration
            const newConfig = vscode.workspace.getConfiguration('ggMCP');
            const newPortStart = newConfig.get<number>('portStart', 9960);
            const newPortEnd = newConfig.get<number>('portEnd', 9990);
            
            // If port range has changed, restart the server
            if (newPortStart !== portStart || newPortEnd !== portEnd) {
                log.info(`Port configuration changed, restarting server...`, { old: `${portStart}-${portEnd}`, new: `${newPortStart}-${newPortEnd}` });
                vscode.window.showInformationMessage(`Port configuration has changed, restarting VSCode MCP server...`);
                
                // Restart server
                if (serverDisposable) {
                    serverDisposable.dispose();
                }
                
                // Reset port information
                updateServerStatus('starting');
                currentServerPort = null;
                
                serverDisposable = startMCPServer(newPortStart, newPortEnd);
            }
        }
    });

    // 添加一个定时器，在激活扩展 5 秒后检查服务器状态
    // 如果状态仍为 starting，则尝试强制更新为 running
    setTimeout(() => {
        if (serverStatus === 'starting' && currentServerPort) {
            log.info('Server status still showing as starting after 5 seconds, forcing update to running');
            updateServerStatus('running');
        }
    }, 5000);

    // 现在启动服务器
    let serverDisposable = startMCPServer(portStart, portEnd);

    // Add disposable objects to context for cleanup when plugin is deactivated
    context.subscriptions.push(serverDisposable);
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(showStatusCommand);
    context.subscriptions.push(restartCommand);
    context.subscriptions.push(errorCommand);
    context.subscriptions.push(updateStatusCommand);
    context.subscriptions.push(updatePortCommand);
    context.subscriptions.push(configChangeSubscription);

    // Listen for file changes (modified to only show notifications when enabled in configuration)
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    
    const shouldNotifyFileChanges = config.get<boolean>('showFileChangeNotifications', false);
    
    if (shouldNotifyFileChanges) {
        watcher.onDidChange(uri => {
            log.debug(`File modified: ${uri.fsPath}`);
            vscode.window.showInformationMessage(`File modified: ${uri.fsPath}`);
        });

        watcher.onDidCreate(uri => {
            log.debug(`File created: ${uri.fsPath}`);
            vscode.window.showInformationMessage(`File created: ${uri.fsPath}`);
        });

        watcher.onDidDelete(uri => {
            log.debug(`File deleted: ${uri.fsPath}`);
            vscode.window.showInformationMessage(`File deleted: ${uri.fsPath}`);
        });
    }

    // Register listener to prevent plugin from being GC collected
    context.subscriptions.push(watcher);
}

/**
 * Callback function when plugin is deactivated
 */
export function deactivate() {
    updateServerStatus('stopped');
    log.info('VSCode MCP Server plugin deactivated');
}