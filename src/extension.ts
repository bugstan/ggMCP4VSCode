import * as vscode from 'vscode';
import { startMCPServer } from './server';
import { Logger } from './utils/logger';
import { getConfig } from './config';

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
export function updateServerStatus(
    status: 'starting' | 'running' | 'error' | 'stopped',
    error: string | null = null
): void {
    log.info(
        `Updating server status from ${serverStatus} to ${status}`,
        error ? { error } : undefined
    );
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
            statusBarItem.text = '$(sync-spin) MCP Server';
            statusBarItem.tooltip = 'Starting MCP Server...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'running':
            statusBarItem.text = '$(zap) MCP Server';
            statusBarItem.tooltip = currentServerPort
                ? `MCP Server running on port ${currentServerPort}, using /mcp/ path`
                : 'MCP Server is running';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'error':
            statusBarItem.text = '$(error) MCP Server';
            statusBarItem.tooltip = serverError
                ? `MCP Server error: ${serverError}`
                : 'MCP Server error';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
        case 'stopped':
            statusBarItem.text = '$(circle-slash) MCP Server';
            statusBarItem.tooltip = 'MCP Server stopped';
            statusBarItem.backgroundColor = undefined;
            break;
    }

    // Set click command
    statusBarItem.command = 'ggMCP.showStatus';

    // Ensure the status bar is refreshed
    statusBarItem.show();
}

/**
 * Callback function when plugin is activated
 * @param context Plugin context
 */
export function activate(context: vscode.ExtensionContext) {
    log.info('MCP Server plugin activated');

    if (!vscode.workspace.workspaceFolders) {
        log.warn('Workspace folders is empty, VSCode may not have opened a project folder!');
    }

    // Log basic information
    log.info('Visible text editors count:', vscode.window.visibleTextEditors.length);
    log.info('Text documents count:', vscode.workspace.textDocuments.length);
    log.info('Workspace folders count:', vscode.workspace.workspaceFolders?.length || 0);

    // Get configuration using config manager
    const config = getConfig();
    const portStart = config.getServerPortStart();
    const portEnd = config.getServerPortEnd();
    log.info(`Port range configured as: ${portStart}-${portEnd}`);

    // Initialize status bar item with higher priority (lower number)
    // Set priority to 10 to ensure it appears at the front of the status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBarItem.show();
    updateServerStatus('starting');

    // Register commands first, then start the server

    // Register command: Show server status
    const showStatusCommand = vscode.commands.registerCommand('ggMCP.showStatus', () => {
        if (serverStatus === 'running' && currentServerPort) {
            vscode.window
                .showInformationMessage(
                    `MCP Server is running on port ${currentServerPort}, using standard MCP protocol`,
                    'Restart',
                    'More Info'
                )
                .then((selection) => {
                    if (selection === 'Restart') {
                        vscode.commands.executeCommand('ggMCP.restart');
                    } else if (selection === 'More Info') {
                        // Show more detailed status information
                        const portInfo = `Port: ${currentServerPort}`;
                        const statusInfo = `Status: ${serverStatus}`;
                        const projectRoot =
                            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'None';
                        const projectInfo = `Project root: ${projectRoot}`;

                        vscode.window.showInformationMessage(
                            `Server Information:\n${portInfo}\n${statusInfo}\n${projectInfo}`
                        );
                    }
                });
        } else if (serverStatus === 'error') {
            vscode.window
                .showErrorMessage(`MCP Server error: ${serverError || 'Unknown error'}`, 'Restart')
                .then((selection) => {
                    if (selection === 'Restart') {
                        vscode.commands.executeCommand('ggMCP.restart');
                    }
                });
        } else {
            vscode.window
                .showInformationMessage(
                    `MCP Server ${serverStatus === 'starting' ? 'is starting...' : 'is not running or port information is not available'}`,
                    'Restart'
                )
                .then((selection) => {
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

        // Fetch configuration again
        const newConfig = getConfig();
        newConfig.refresh(); // Refresh configuration
        const newPortStart = newConfig.getServerPortStart();
        const newPortEnd = newConfig.getServerPortEnd();

        // Start new server and save reference
        serverDisposable = startMCPServer(context, newPortStart, newPortEnd);
        vscode.window.showInformationMessage('MCP Server has been restarted');
        log.info('Server has been restarted');
    });

    // Register command: Server error report
    const errorCommand = vscode.commands.registerCommand('ggMCP.reportError', (error: string) => {
        log.error('Server reported error:', error);
        updateServerStatus('error', error);
        vscode.window.showErrorMessage(`MCP Server error: ${error}`);
    });

    // Register command: Server status update
    const updateStatusCommand = vscode.commands.registerCommand(
        'ggMCP.updateServerStatus',
        (status: 'starting' | 'running' | 'error' | 'stopped', error?: string) => {
            log.info(`Received status update command: ${status}`, error ? { error } : undefined);
            updateServerStatus(status, error || null);
        }
    );

    // Set port update event
    const updatePortCommand = vscode.commands.registerCommand(
        'ggMCP.updatePort',
        (port: number) => {
            log.info(`Received port update command: ${port}`);
            currentServerPort = port;
            updateServerStatus('running');
        }
    );

    // Listen for configuration changes
    const configChangeSubscription = vscode.workspace.onDidChangeConfiguration((e) => {
        // Check if our configuration items have changed
        const isRelevantChange =
            e.affectsConfiguration('ggMCP.portStart') ||
            e.affectsConfiguration('ggMCP.portEnd') ||
            e.affectsConfiguration('ggMCP.logLevel') ||
            e.affectsConfiguration('ggMCP.preferredPorts');

        if (isRelevantChange) {
            log.info('Configuration changed, refreshing config and checking if restart is needed');

            // Refresh configuration
            const newConfig = getConfig();
            newConfig.refresh();

            const newPortStart = newConfig.getServerPortStart();
            const newPortEnd = newConfig.getServerPortEnd();

            // If port range has changed, restart the server
            if (newPortStart !== portStart || newPortEnd !== portEnd) {
                log.info(`Port configuration changed, restarting server...`, {
                    old: `${portStart}-${portEnd}`,
                    new: `${newPortStart}-${newPortEnd}`,
                });
                vscode.window.showInformationMessage(
                    `Port configuration has changed, restarting MCP server...`
                );

                // Restart server
                if (serverDisposable) {
                    serverDisposable.dispose();
                }

                // Reset port information
                updateServerStatus('starting');
                currentServerPort = null;

                serverDisposable = startMCPServer(context, newPortStart, newPortEnd);
            }
        }
    });

    // Add a timer to check server status 5 seconds after extension activation
    // If status is still 'starting', try to force update to 'running'
    setTimeout(() => {
        if (serverStatus === 'starting' && currentServerPort) {
            log.info(
                'Server status still showing as starting after 5 seconds, forcing update to running'
            );
            updateServerStatus('running');
        }
    }, 5000);

    // Now start the server
    let serverDisposable = startMCPServer(context);

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
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    const shouldNotifyFileChanges = config.getShowFileChangeNotifications();

    if (shouldNotifyFileChanges) {
        watcher.onDidChange((uri) => {
            log.info(`File modified: ${uri.fsPath}`);
            vscode.window.showInformationMessage(`File modified: ${uri.fsPath}`);
        });

        watcher.onDidCreate((uri) => {
            log.info(`File created: ${uri.fsPath}`);
            vscode.window.showInformationMessage(`File created: ${uri.fsPath}`);
        });

        watcher.onDidDelete((uri) => {
            log.info(`File deleted: ${uri.fsPath}`);
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
    log.info('MCP Server plugin deactivated');
}
