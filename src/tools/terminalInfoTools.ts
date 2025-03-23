import * as vscode from 'vscode';
import { AbstractMcpTool } from '../types/tool';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { Logger } from '../utils/logger';
import { TerminalDetector, TerminalType, OSType, TerminalInfo } from '../utils/terminalDetector';

// Create module-specific logger
const log = Logger.forModule('TerminalInfoTools');

/**
 * Get Terminal Information Tool
 * Provides information about the current terminal and operating system environment
 */
export class GetTerminalInfoTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_terminal_info',
            'Retrieve information about the current terminal and operating system environment. ' +
            'Returns data about OS type, terminal type, and whether it is the default terminal.',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // We need to use a promise here because the terminal detection is asynchronous
            return new Promise((resolve) => {
                // Get current active terminal if available
                const terminal = vscode.window.activeTerminal;
                
                // Call the terminal detector to get information
                TerminalDetector.getTerminalInfo(terminal, (info: TerminalInfo) => {
                    log.debug('Terminal information detected', info);
                    resolve(createResponse(info));
                });
            });
        } catch (error) {
            log.error('Error getting terminal information', error);
            return createResponse(null, `Error getting terminal information: ${formatError(error)}`);
        }
    }
}

/**
 * Execute command with OS-specific syntax
 * Automatically adjusts command syntax based on the detected OS and terminal
 */
export class ExecuteOSSpecificCommandTool extends AbstractMcpTool<{ 
    windowsCommand?: string; 
    unixCommand?: string; 
    macCommand?: string; 
    command?: string 
}> {
    constructor() {
        super(
            'execute_os_specific_command',
            'Execute a command with syntax adjusted for the detected operating system and terminal. ' +
            'You can provide different command versions for different platforms, or a generic command.',
            {
                type: 'object',
                properties: {
                    windowsCommand: { type: 'string' },
                    unixCommand: { type: 'string' },
                    macCommand: { type: 'string' },
                    command: { type: 'string' }
                }
            }
        );
    }

    async handle(args: { 
        windowsCommand?: string; 
        unixCommand?: string; 
        macCommand?: string; 
        command?: string 
    }): Promise<Response> {
        try {
            const { windowsCommand, unixCommand, macCommand, command } = args;
            
            // If no specific commands are provided, use the generic command
            if (!windowsCommand && !unixCommand && !macCommand && !command) {
                return createResponse(null, 'No command specified');
            }
            
            // Get OS type to determine which command to use
            const osType = TerminalDetector.getOSType();
            
            // Default to generic command
            let commandToExecute = command || '';
            
            // Override with OS-specific command if provided
            switch (osType) {
                case OSType.Windows:
                    if (windowsCommand) {
                        commandToExecute = windowsCommand;
                    }
                    break;
                case OSType.macOS:
                    if (macCommand) {
                        commandToExecute = macCommand;
                    } else if (unixCommand) {
                        commandToExecute = unixCommand;
                    }
                    break;
                case OSType.Linux:
                    if (unixCommand) {
                        commandToExecute = unixCommand;
                    }
                    break;
            }
            
            if (!commandToExecute) {
                return createResponse(null, `No command specified for ${osType} operating system`);
            }
            
            log.debug(`Executing OS-specific command for ${osType}: ${commandToExecute}`);
            
            // We'll use VS Code's built-in terminal execution
            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('OS Command Terminal');
            terminal.show();
            terminal.sendText(commandToExecute);
            
            return createResponse({
                osType,
                command: commandToExecute,
                executed: true
            });
        } catch (error) {
            log.error('Error executing OS-specific command', error);
            return createResponse(null, `Error executing OS-specific command: ${formatError(error)}`);
        }
    }
}