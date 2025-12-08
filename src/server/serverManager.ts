import * as vscode from 'vscode';
import http from 'http';
import { findAvailablePort, isPortAvailable } from '../utils/portScanner';
import { Logger } from '../utils/logger';
import { MCPService } from './mcpService';
import { getConfig } from '../config';

// Create module-specific logger
const log = Logger.forModule('ServerManager');

// Key for storing last successful port in workspace storage
const LAST_PORT_STORAGE_KEY = 'ggMCP.lastSuccessfulPort';

/**
 * Server Manager - Responsible for starting and managing the HTTP server
 */
export class ServerManager {
    private server: http.Server | null = null;
    private isDisposed = false;
    private extensionContext: vscode.ExtensionContext | null = null;
    private failedPorts = new Set<number>(); // Track ports that failed to bind

    /**
     * Initialize server manager with extension context for storage
     * @param context Extension context for storage access
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
        log.info('Server manager initialized with extension context');
    }

    /**
     * Get last successfully used port from storage
     * @returns Last used port or null if not available
     */
    private getLastSuccessfulPort(): number | null {
        if (!this.extensionContext) {
            log.warn('No extension context available, cannot retrieve last port');
            return null;
        }

        const lastPort = this.extensionContext.globalState.get<number>(LAST_PORT_STORAGE_KEY);
        if (lastPort) {
            log.info(`Found last successful port in storage: ${lastPort}`);
        }
        return lastPort || null;
    }

    /**
     * Save successfully used port to storage
     * @param port Port number to save
     */
    private saveSuccessfulPort(port: number): void {
        if (!this.extensionContext) {
            log.warn('No extension context available, cannot save port');
            return;
        }

        this.extensionContext.globalState.update(LAST_PORT_STORAGE_KEY, port);
        log.info(`Saved successful port ${port} to storage`);
    }

    /**
     * Start MCP server
     * @param portStart Starting port number to try
     * @param portEnd Ending port number to try
     * @returns A disposable to stop the server
     */
    public async startServer(portStart: number, portEnd: number): Promise<vscode.Disposable> {
        try {
            if (this.isDisposed) {
                log.warn('Server manager is disposed, not starting server');
                return { dispose: () => {} };
            }

            // Set status to starting
            vscode.commands.executeCommand('ggMCP.updateServerStatus', 'starting');

            // Get configuration items
            const config = getConfig();
            const timeout = config.getPortScanTimeout();
            const concurrency = config.getPortScanConcurrency();
            const retries = config.getPortScanRetries();
            let port: number | null = null;

            // First try last successful port if available
            const lastPort = this.getLastSuccessfulPort();
            // Check if lastPort exists AND has not failed recently
            if (lastPort && !this.failedPorts.has(lastPort)) {
                log.info(`Trying last successful port: ${lastPort}`);

                // Check if the last port is still available
                const isAvailable = await isPortAvailable(lastPort, timeout);
                if (isAvailable) {
                    log.info(`Last port ${lastPort} is available, using it`);
                    port = lastPort;
                } else {
                    log.info(`Last port ${lastPort} is no longer available, searching for new port`);
                }
            } else if (lastPort && this.failedPorts.has(lastPort)) {
                log.info(`Last port ${lastPort} is in failed list, skipping`);
            }

            // If we couldn't use the last port, find a new one
            if (!port) {
                // Add last port to preferred ports if available
                const preferredPorts = lastPort
                    ? [lastPort, ...config.getPreferredPorts()]
                    : config.getPreferredPorts();

                // Combine excluded ports (from config) with runtime failed ports
                const runtimeExcluded = Array.from(this.failedPorts);

                log.info(`Scanning with excluded ports: ${runtimeExcluded.join(', ')}`);

                // Find available port using configuration options
                port = await findAvailablePort(portStart, portEnd, {
                    timeout,
                    concurrency,
                    retries,
                    preferredPorts: preferredPorts,
                    // Critical: Exclude ports that have already failed in this session
                    exclude: runtimeExcluded,
                });
            }

            if (!port) {
                const errorMsg = `Could not find available port in range ${portStart}-${portEnd}`;
                log.error(errorMsg);
                vscode.commands.executeCommand('ggMCP.reportError', errorMsg);
                // vscode.window.showErrorMessage(errorMsg);
                vscode.window.setStatusBarMessage(`MCP Server Error: ${errorMsg}`, 5000);
                return { dispose: () => {} };
            }

            if (this.isDisposed) {
                log.warn('Server manager was disposed during port finding, not starting server');
                return { dispose: () => {} };
            }

            // Create server instance
            this.server = http.createServer(async (req, res) => {
                await MCPService.handleRequest(req, res);
            });

            // Set up error handling
            this.server.on('error', (err: Error) =>
                this.handleServerError(err, portStart, portEnd, port)
            );

            // Start listening on the port
            await this.startListening(port);

            // Save successful port for future use
            this.saveSuccessfulPort(port);

            // Clear failed ports on successful start?
            // Maybe not, to avoid oscillating between bad ports.
            // But if we successfully bound, it means this port is good now.

            return {
                dispose: () => this.dispose(),
            };
        } catch (error) {
            this.handleStartupError(error);
            return { dispose: () => {} };
        }
    }

    /**
     * Start server listening on the specified port
     */
    private startListening(port: number): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }

            // MCP Security: Only bind to localhost to prevent external access
            // See: https://modelcontextprotocol.io/docs/concepts/transports#security-warning
            this.server.listen(port, '127.0.0.1', () => {
                log.info(`MCP server running on port ${port}`);

                // First update port information
                vscode.commands.executeCommand('ggMCP.updatePort', port);

                // Then directly update server status to running
                // This is a key fix - ensures status is updated even if updatePort command doesn't work properly
                vscode.commands.executeCommand('ggMCP.updateServerStatus', 'running');

                // Finally show notification
                // vscode.window.showInformationMessage(`MCP server started, port: ${port}`);

                log.info('Server status updated to running');

                // Add an extra delayed status update, in case the previous commands failed
                setTimeout(() => {
                    try {
                        vscode.commands.executeCommand('ggMCP.updateServerStatus', 'running');
                        log.info('Additional delayed status update to running');
                    } catch (retryErr) {
                        log.error('Failed delayed status update:', retryErr);
                    }
                }, 1000);

                resolve();
            });
        });
    }

    /**
     * Handle server errors
     */
    private handleServerError(err: Error, portStart: number, portEnd: number, currentPort: number | null = null): void {
        log.error('MCP server error:', err);
        vscode.commands.executeCommand('ggMCP.reportError', err.message);

        // check if port is in use
        const code = (err as any).code;
        const message = err.message || '';
        const isPortInUse = code === 'EADDRINUSE' || message.includes('EADDRINUSE');

        // Logic to suppress notification is now handled globally by silencing reportError in extension.ts
        // But we double ensure it here by not calling showErrorMessage directly either.

        if (isPortInUse) {
            log.info('Port already in use, suppressing notification and will attempt restart');

            // Critical fix 1: Clear the last successful port from storage
            if (this.extensionContext) {
                this.extensionContext.globalState.update(LAST_PORT_STORAGE_KEY, undefined);
            }

            // Critical fix 2: Add current port to failed blacklist to prevent reuse
            if (currentPort) {
                this.failedPorts.add(currentPort);
                log.info(`Added port ${currentPort} to runtime failed list. Current failed ports: ${Array.from(this.failedPorts).join(', ')}`);
            }
        }

        if (!this.isDisposed) {
            // If port is in use, retry faster (e.g. 1s) compared to other errors (5s)
            const retryDelay = isPortInUse ? 1000 : 5000;

            setTimeout(() => {
                if (!this.isDisposed && this.server) {
                    log.info('Attempting to automatically restart MCP server...');
                    this.server.close();
                    this.server = null;
                    this.startServer(portStart, portEnd).catch((restartErr) => {
                        log.error('Failed to restart server:', restartErr);
                    });
                }
            }, retryDelay);
        }
    }

    /**
     * Handle startup errors
     */
    private handleStartupError(error: unknown): void {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('Error starting MCP server:', error);
        vscode.commands.executeCommand('ggMCP.reportError', `Start failed: ${errorMsg}`);
        // vscode.window.showErrorMessage(`Error starting MCP server: ${errorMsg}`);
        vscode.window.setStatusBarMessage(`Error starting MCP server: ${errorMsg}`, 5000);

        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    /**
     * Dispose server resources
     */
    public dispose(): void {
        this.isDisposed = true;
        if (this.server) {
            this.server.close();
            this.server = null;
            vscode.commands.executeCommand('ggMCP.updateServerStatus', 'stopped');
            log.info('MCP server closed');
        }
    }
}
