import * as vscode from 'vscode';
import http from 'http';
import { findAvailablePort } from '../utils/portScanner';
import { Logger } from '../utils/logger';
import { MCPService } from './mcpService';
import { getConfig } from '../config';

// Create module-specific logger
const log = Logger.forModule('ServerManager');

/**
 * Server Manager - Responsible for starting and managing the HTTP server
 */
export class ServerManager {
    private server: http.Server | null = null;
    private isDisposed = false;

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

            // Find available port using configuration options
            const port = await findAvailablePort(portStart, portEnd, {
                timeout,
                concurrency,
                retries,
                preferredPorts: config.getPreferredPorts()
            });

            if (!port) {
                const errorMsg = `Could not find available port in range ${portStart}-${portEnd}`;
                log.error(errorMsg);
                vscode.commands.executeCommand('ggMCP.reportError', errorMsg);
                vscode.window.showErrorMessage(errorMsg);
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
            this.server.on('error', (err: Error) => this.handleServerError(err, portStart, portEnd));

            // Start listening on the port
            await this.startListening(port);

            return {
                dispose: () => this.dispose()
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

            this.server.listen(port, () => {
                log.info(`MCP server running on port ${port}`);

                // First update port information
                vscode.commands.executeCommand('ggMCP.updatePort', port);

                // Then directly update server status to running
                // This is a key fix - ensures status is updated even if updatePort command doesn't work properly
                vscode.commands.executeCommand('ggMCP.updateServerStatus', 'running');

                // Finally show notification
                vscode.window.showInformationMessage(`MCP server started, port: ${port}`);

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
    private handleServerError(err: Error, portStart: number, portEnd: number): void {
        log.error('MCP server error:', err);
        vscode.commands.executeCommand('ggMCP.reportError', err.message);
        vscode.window.showErrorMessage(`MCP server error: ${err.message}`);

        if (!this.isDisposed) {
            setTimeout(() => {
                if (!this.isDisposed && this.server) {
                    log.info('Attempting to automatically restart MCP server...');
                    this.server.close();
                    this.server = null;
                    this.startServer(portStart, portEnd).catch(restartErr => {
                        log.error('Failed to restart server:', restartErr);
                    });
                }
            }, 5000);
        }
    }

    /**
     * Handle startup errors
     */
    private handleStartupError(error: unknown): void {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error('Error starting MCP server:', error);
        vscode.commands.executeCommand('ggMCP.reportError', `Start failed: ${errorMsg}`);
        vscode.window.showErrorMessage(`Error starting MCP server: ${errorMsg}`);

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
