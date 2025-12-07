import * as vscode from 'vscode';
import { ServerManager } from './serverManager';
import { getConfig } from '../config';

// Export the server starter function for use in extension.ts
export { ServerManager };

/**
 * Start MCP server with the specified port range
 * @param extensionContext Extension context for storage
 * @param portStart Starting port number
 * @param portEnd Ending port number 
 * @returns A disposable to stop the server
 */
export function startMCPServer(
    extensionContext: vscode.ExtensionContext,
    portStart?: number, 
    portEnd?: number
): vscode.Disposable {
    const config = getConfig();
    const startPort = portStart ?? config.getServerPortStart();
    const endPort = portEnd ?? config.getServerPortEnd();

    const serverManager = new ServerManager();
    
    // Initialize server manager with extension context for storage
    serverManager.initialize(extensionContext);

    // Start the server asynchronously
    serverManager.startServer(startPort, endPort).catch((error) => {
        console.error('Failed to start MCP server:', error);
    });

    // Return a disposable that will clean up the server when disposed
    return {
        dispose: () => serverManager.dispose(),
    };
}
