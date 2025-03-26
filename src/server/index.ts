import * as vscode from 'vscode';
import { ServerManager } from './serverManager';
import { getConfig } from '../config';

// Export the server starter function for use in extension.ts
export { ServerManager };

/**
 * Start MCP server with the specified port range
 * @param portStart [Optional] Starting port number, read from configuration if not provided
 * @param portEnd [Optional] Ending port number, read from configuration if not provided
 * @returns A disposable to stop the server
 */
export function startMCPServer(portStart?: number, portEnd?: number): vscode.Disposable {
    const config = getConfig();
    const startPort = portStart ?? config.getServerPortStart();
    const endPort = portEnd ?? config.getServerPortEnd();
    
    const serverManager = new ServerManager();
    
    // Start the server asynchronously
    serverManager.startServer(startPort, endPort).catch(error => {
        console.error('Failed to start MCP server:', error);
    });
    
    // Return a disposable that will clean up the server when disposed
    return {
        dispose: () => serverManager.dispose()
    };
}