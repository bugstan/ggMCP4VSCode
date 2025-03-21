import * as vscode from 'vscode';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { errorResponse, formatError, successResponse } from '../utils/response';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('TerminalTools');

/**
 * Get terminal text content
 */
export class GetTerminalTextTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_terminal_text',
            'Get the current text content from the first active terminal in the IDE. Returns an empty string if no terminal is open.',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // Get the current active terminal
            if (vscode.window.terminals.length === 0) {
                log.debug('No terminals are open');
                return successResponse('');
            }
            
            // Note: VS Code API does not directly provide a method to get terminal content
            // Return an explanatory message
            log.info('Terminal content requested but not directly accessible via VS Code API');
            return successResponse('Terminal content not directly accessible via VS Code API');
        } catch (error) {
            log.error('Error getting terminal content', error);
            return errorResponse(`Error getting terminal content: ${formatError(error)}`);
        }
    }
}

/**
 * Execute terminal command
 */
export class ExecuteTerminalCommandTool extends AbstractMcpTool<ToolParams['executeTerminalCommand']> {
    constructor() {
        super(
            'execute_terminal_command',
            'Execute a specified shell command in the IDE\'s integrated terminal. Returns terminal output or error messages.',
            {
                type: 'object',
                properties: {
                    command: { type: 'string' }
                },
                required: ['command']
            }
        );
    }

    async handle(args: ToolParams['executeTerminalCommand']): Promise<Response> {
        try {
            const { command } = args;
            log.debug(`Executing terminal command: ${command}`);
            
            // Get or create terminal
            let terminal = vscode.window.activeTerminal;
            if (!terminal) {
                terminal = vscode.window.createTerminal('MCP Command Terminal');
                log.debug('Created new terminal: MCP Command Terminal');
            }
            
            // Activate terminal and execute command
            terminal.show();
            terminal.sendText(command);
            
            // Note: VS Code API does not directly provide a method to get command execution result
            // Return an explanatory message
            log.info(`Command executed: ${command}`);
            return successResponse(`Command executed: ${command}`);
        } catch (error) {
            log.error('Error executing terminal command', error);
            return errorResponse(`Error executing terminal command: ${formatError(error)}`);
        }
    }
}

/**
 * Wait for specified milliseconds
 */
export class WaitTool extends AbstractMcpTool<ToolParams['wait']> {
    constructor() {
        super(
            'wait',
            'Wait for the specified number of milliseconds. Returns "ok" after the wait completes.',
            {
                type: 'object',
                properties: {
                    milliseconds: { type: 'number' }
                },
                required: ['milliseconds']
            }
        );
    }

    async handle(args: ToolParams['wait']): Promise<Response> {
        try {
            const { milliseconds } = args;
            log.debug(`Waiting for ${milliseconds} milliseconds`);
            
            // Create wait using Promise
            await new Promise(resolve => setTimeout(resolve, milliseconds));
            
            log.debug(`Wait complete: ${milliseconds} milliseconds`);
            return successResponse('ok');
        } catch (error) {
            log.error('Error during wait', error);
            return errorResponse(`Error during wait: ${formatError(error)}`);
        }
    }
}