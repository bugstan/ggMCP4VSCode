import * as vscode from 'vscode';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';

/**
 * Get terminal text
 * Note: VSCode API currently doesn't provide direct access to terminal content
 * This is a limited implementation, returning basic terminal information
 */
export async function getTerminalText(): Promise<Response> {
    try {
        // Get active terminal
        const terminal = vscode.window.activeTerminal;
        
        if (!terminal) {
            return successResponse(''); // No open terminal, return empty string
        }
        
        // Build basic information response
        const terminalInfo = {
            name: terminal.name,
            processId: 'unknown', // processId needs to be retrieved asynchronously
            type: terminal.creationOptions ? String(terminal.creationOptions.name || 'unknown') : 'unknown'
        };
        
        // Try to get process ID (if API supports it)
        try {
            if (terminal.processId) {
                const processId = await terminal.processId;
                if (processId) {
                    terminalInfo.processId = String(processId);
                }
            }
        } catch (err) {
            // Ignore error, keep default value
        }
        
        return successResponse(JSON.stringify(terminalInfo));
    } catch (error) {
        return errorResponse(`Error getting terminal information: ${formatError(error)}`);
    }
}

/**
 * Execute terminal command
 */
export async function executeTerminalCommand(params: { command: string }): Promise<Response> {
    try {
        const { command } = params;
        
        if (!command) {
            return errorResponse('Invalid command');
        }
        
        // Get active terminal, create new one if none exists
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
            terminal = vscode.window.createTerminal('MCP Terminal');
        }
        
        // Show terminal and execute command
        terminal.show();
        
        // Use sendText method to send command to terminal
        // Second parameter set to true to automatically add new line
        terminal.sendText(command, true);
        
        // Since we can't directly capture terminal output (VSCode API limitation), use timeout to return
        // Wait a bit to give the command some time to execute
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return successResponse(JSON.stringify({
            command: command,
            output: "Command executed, but output cannot be captured (VSCode API limitation)",
            message: `Command "${command}" has been sent to terminal for execution`
        }));
    } catch (error) {
        return errorResponse(`Error executing terminal command: ${formatError(error)}`);
    }
}

/**
 * Wait for specified milliseconds
 */
export async function wait(params: { milliseconds: number }): Promise<Response> {
    try {
        // Ensure milliseconds is a valid number
        let milliseconds = params.milliseconds;
        if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds <= 0) {
            milliseconds = 5000; // Default value
        }
        
        // Limit maximum wait time (e.g., 1 minute)
        const maxWaitTime = 60000;
        if (milliseconds > maxWaitTime) {
            milliseconds = maxWaitTime;
        }
        
        // Create Promise to wait for specified time
        await new Promise((resolve) => setTimeout(resolve, milliseconds));
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`Error during wait: ${formatError(error)}`);
    }
}