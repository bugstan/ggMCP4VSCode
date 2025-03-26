import * as vscode from 'vscode';
import { AbstractTerminalTools } from '../types/absTerminalTools';
import { Response } from '../types';
import { responseHandler } from '../server/responseHandler';
import { TerminalDetector, OSType, TerminalInfo } from '../utils/terminalDetector';

/**
 * Get terminal information tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class GetTerminalInfoTool extends AbstractTerminalTools {
    constructor() {
        super(
            'get_terminal_info',
            'Retrieve information about the current terminal and operating system environment. ' +
            'Returns data about OS type, terminal type, and whether it is the default terminal.',
            { type: 'object', properties: {} }
        );
    }

    /**
     * This tool does not require terminal display
     */
    protected shouldShowTerminal(): boolean {
        return false;
    }

    /**
     * Execute get terminal information operation (implementing base class abstract method)
     */
    protected async executeCommand(terminal: vscode.Terminal | null, _args: any): Promise<Response> {
        try {
            // Convert callback-based method to Promise
            return new Promise((resolve) => {
                // Get basic OS information
                const osType = TerminalDetector.getOSType();
                const osVersion = TerminalDetector.getOSVersion();
                const isIntegrated = terminal ? TerminalDetector.isIntegratedTerminal(terminal) : false;
                
                this.log.info(`Detecting terminal information (OS: ${osType}, Version: ${osVersion})`);
                
                // Call terminal detector to get terminal type information
                TerminalDetector.detectTerminalType((terminalType) => {
                    const isDefault = TerminalDetector.isDefaultTerminal(terminalType);
                    
                    const info: TerminalInfo = {
                        osType,
                        osVersion,
                        terminalType,
                        isIntegratedTerminal: isIntegrated,
                        isDefault
                    };
                    
                    this.log.info('Terminal information detected', info);
                    resolve(responseHandler.success(info));
                });
            });
        } catch (error) {
            this.log.error('Error getting terminal information', error);
            return responseHandler.failure(`Error getting terminal information: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Execute OS-specific command tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class ExecuteOSSpecificCommandTool extends AbstractTerminalTools<{ 
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

    /**
     * Execute OS-specific command operation (implementing base class abstract method)
     */
    protected async executeCommand(terminal: vscode.Terminal | null, args: { 
        windowsCommand?: string; 
        unixCommand?: string; 
        macCommand?: string; 
        command?: string 
    }): Promise<Response> {
        try {
            const { windowsCommand, unixCommand, macCommand, command } = args;
            
            // If no specific command provided, use generic command
            if (!windowsCommand && !unixCommand && !macCommand && !command) {
                return responseHandler.failure('No command specified');
            }
            
            // Get OS type to determine which command to use
            const osType = TerminalDetector.getOSType();
            
            // Default to generic command
            let commandToExecute = command || '';
            
            // Override generic command based on OS type
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
                return responseHandler.failure(`No command specified for ${osType} operating system`);
            }
            
            this.log.info(`Executing OS-specific command for ${osType}: ${commandToExecute}`);
            
            // Ensure terminal exists
            if (!terminal) {
                return responseHandler.failure('No terminal available');
            }
            
            // Send command to terminal
            terminal.sendText(commandToExecute);
            
            return responseHandler.success({
                osType,
                command: commandToExecute,
                executed: true
            });
        } catch (error) {
            this.log.error('Error executing OS-specific command', error);
            return responseHandler.failure(`Error executing OS-specific command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}