import * as vscode from 'vscode';
import { ServerManager } from './serverManager';

// Export the server starter function for use in extension.ts
export { ServerManager };

/**
 * Start MCP server with the specified port range
 * @param portStart Starting port number to try
 * @param portEnd Ending port number to try
 * @returns A disposable to stop the server
 */
export function startMCPServer(portStart: number, portEnd: number): vscode.Disposable {
    const serverManager = new ServerManager();
    
    // Start the server asynchronously
    serverManager.startServer(portStart, portEnd).catch(error => {
        console.error('Failed to start MCP server:', error);
    });
    
    // Return a disposable that will clean up the server when disposed
    return {
        dispose: () => serverManager.dispose()
    };
}