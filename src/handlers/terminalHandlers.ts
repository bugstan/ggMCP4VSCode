import * as vscode from 'vscode';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('TerminalHandlers');

// Create output channel for command output
const outputChannel = vscode.window.createOutputChannel('MCP Command Output');

// State management for command execution
let lastCommandOutput = "";
let commandExecutionStatus = "idle"; // "idle", "running", "completed", "error"

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
            return createResponse(''); // No open terminal, return empty string
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
        
        return createResponse(JSON.stringify(terminalInfo));
    } catch (error) {
        return createResponse(null, `Error getting terminal information: ${formatError(error)}`);
    }
}

/**
 * Execute terminal command
 */
export async function executeTerminalCommand(params: { command: string }): Promise<Response> {
    try {
        const { command } = params;
        
        if (!command) {
            return createResponse(null, 'Invalid command');
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
        
        return createResponse(JSON.stringify({
            command: command,
            output: "Command executed, but output cannot be captured (VSCode API limitation)",
            message: `Command "${command}" has been sent to terminal for execution`
        }));
    } catch (error) {
        return createResponse(null, `Error executing terminal command: ${formatError(error)}`);
    }
}

/**
 * Execute command and store output in OutputChannel
 */
export async function executeCommandWithOutput(params: { command: string }): Promise<Response> {
    try {
        const { command } = params;
        log.debug(`Executing command with output capture: ${command}`);
        
        if (!command) {
            return createResponse(null, 'Invalid command');
        }
        
        commandExecutionStatus = "running";
        lastCommandOutput = ""; // Clear previous output
        
        // Clear output channel
        outputChannel.clear();
        outputChannel.show(true); // Show and preserve focus
        outputChannel.appendLine(`Executing command: ${command}`);
        
        // Execute command using child_process module with proper PATH
        const cp = require('child_process');
        const exec = require('util').promisify(cp.exec);
        
        try {
            // Update status and start execution
            commandExecutionStatus = "running";
            outputChannel.appendLine('Command started...');
            
            // Execute the command
            const { stdout, stderr } = await exec(command, {
                cwd: vscode.workspace.rootPath || undefined,
                timeout: 30000 // 30 second timeout
            });
            
            // Process results
            if (stderr) {
                outputChannel.appendLine(`STDERR: ${stderr}`);
            }
            
            outputChannel.appendLine(`OUTPUT: ${stdout}`);
            lastCommandOutput = stdout || '';
            commandExecutionStatus = "completed";
            
            log.info(`Command executed successfully: ${command}`);
            return createResponse({
                status: commandExecutionStatus,
                command: command,
                message: "Command executed, output ready to retrieve"
            });
        } catch (execError) {
            // Handle execution errors
            const errorMsg = (execError as Error).message || 'Unknown execution error';
            outputChannel.appendLine(`ERROR: ${errorMsg}`);
            
            lastCommandOutput = errorMsg;
            commandExecutionStatus = "error";
            
            log.error(`Command execution failed: ${errorMsg}`);
            return createResponse(null, `Command execution failed: ${errorMsg}`);
        }
    } catch (error) {
        // Handle unexpected errors
        commandExecutionStatus = "error";
        lastCommandOutput = formatError(error);
        
        outputChannel.appendLine(`FATAL ERROR: ${formatError(error)}`);
        log.error('Error in executeCommandWithOutput', error);
        
        return createResponse(null, `Error executing command: ${formatError(error)}`);
    }
}

/**
 * Get command output from the output channel
 */
export async function getCommandOutput(): Promise<Response> {
    try {
        log.debug(`Getting command output. Status: ${commandExecutionStatus}`);
        return createResponse({
            status: commandExecutionStatus,
            output: lastCommandOutput
        });
    } catch (error) {
        log.error('Error getting command output', error);
        return createResponse(null, `Error getting command output: ${formatError(error)}`);
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
        
        return createResponse('ok');
    } catch (error) {
        return createResponse(null, `Error during wait: ${formatError(error)}`);
    }
}