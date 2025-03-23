import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {createResponse, formatError} from '../utils/response';
import {Logger} from '../utils/logger';
import {ShellIntegrationHelper} from '../utils/shellIntegrationHelper';
import {TerminalManager} from '../utils/terminalManager';

// Create module-specific logger
const log = Logger.forModule('TerminalTools');

/**
 * Helper function: Process command output, limit lines
 * @param output Command output text
 * @param maxLines Maximum number of lines
 * @returns Processed output text
 */
function limitOutputLines(output: string, maxLines: number = 2000): string {
    const lines = output.split('\n');
    if (lines.length > maxLines) {
        const truncatedOutput = lines.slice(0, maxLines).join('\n');
        return `${truncatedOutput}\n\n[Output truncated, showing first ${maxLines} lines]`;
    }
    return output;
}

/**
 * Get terminal text content
 */
export class GetTerminalTextTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_terminal_text',
            'Retrieves the current text content from the first active terminal in the IDE.\nUse this tool to access the terminal\'s output and command history.\nReturns one of two possible responses:\n- The terminal\'s text content if a terminal exists\n- empty string if no terminal is open or available\nNote: Only captures text from the first terminal if multiple terminals are open',
            {type: 'object', properties: {}}
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // Get the current active terminal
            if (vscode.window.terminals.length === 0) {
                log.debug('No terminals are open');
                return createResponse('');
            }

            const terminal = vscode.window.activeTerminal || vscode.window.terminals[0];
            if (!terminal) {
                log.debug('No active terminal');
                return createResponse('');
            }

            // Use VS Code 1.93+ Shell Integration API to get terminal content
            try {
                if ('onDidWriteData' in terminal) {
                    // This feature is not available in older VS Code versions, log a warning
                    log.warn('Terminal content request using legacy method, modern API not available');
                    return createResponse('Terminal content not directly accessible in current VS Code version. Please upgrade to VS Code 1.93+ for this functionality.');
                }

                // Use ShellIntegrationHelper to check Shell Integration API support
                if (ShellIntegrationHelper.hasShellIntegration(terminal)) {
                    const output = ShellIntegrationHelper.getCurrentCommandOutput(terminal);
                    if (output) {
                        log.info('Retrieved terminal output using Shell Integration API');
                        return createResponse(output);
                    } else {
                        log.debug('No current command output available');
                        return createResponse('No current command output available');
                    }
                }

                // If Shell Integration API is not available
                log.info('Terminal Shell Integration API not available in current VS Code version');
                return createResponse('Terminal content not directly accessible. Please upgrade to VS Code 1.93+ for Shell Integration API support.');
            } catch (shellError) {
                log.error('Error using Shell Integration API', shellError);
                return createResponse('Error retrieving terminal content using Shell Integration API');
            }
        } catch (error) {
            log.error('Error getting terminal content', error);
            return createResponse(null, `Error getting terminal content: ${formatError(error)}`);
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
            'Executes a specified shell command in the IDE\'s integrated terminal.\nUse this tool to run terminal commands within the IDE environment.\nRequires a command parameter containing the shell command to execute.\nImportant features and limitations:\n- Checks if process is running before collecting output\n- Limits output to 2000 lines (truncates excess)\n- Times out after 120000 milliseconds with notification\nReturns possible responses:\n- Terminal output (truncated if >2000 lines)\n- Output with interruption notice if timed out\n- Error messages for various failure cases',
            {
                type: 'object',
                properties: {
                    command: {type: 'string'}
                },
                required: ['command']
            }
        );
    }

    async handle(args: ToolParams['executeTerminalCommand']): Promise<Response> {
        try {
            const {command} = args;
            log.debug(`Executing terminal command: ${command}`);

            // Get configured timeout
            const config = vscode.workspace.getConfiguration('ggMCP');
            const timeoutMs = config.get<number>('terminalTimeout', 15000);

            // Get or create terminal
            let terminal = vscode.window.activeTerminal;
            if (!terminal) {
                terminal = vscode.window.createTerminal('MCP Command Terminal');
                log.debug('Created new terminal: MCP Command Terminal');
            }

            // Activate terminal
            terminal.show();

            // Use ShellIntegrationHelper to check Shell Integration API
            if (ShellIntegrationHelper.hasShellIntegration(terminal)) {
                log.info('Using Shell Integration API to capture command output');

                // Create a Promise to capture command output
                const outputPromise = new Promise<string>((resolve, reject) => {
                    try {
                        // Create timeout timer
                        const timer = setTimeout(() => {
                            log.warn(`Command execution timed out after ${timeoutMs}ms: ${command}`);
                            resolve(`Command execution timed out after ${timeoutMs}ms. Partial output may follow:\n[Output unavailable or command still running]`);
                        }, timeoutMs);

                        // Use ShellIntegrationHelper to register command finished event
                        if (ShellIntegrationHelper.hasCommandDetection(terminal)) {
                            // Register command finished event handler
                            const disposable = ShellIntegrationHelper.registerCommandFinishedHandler(
                                terminal, 
                                (finishedCmd: any) => {
                                    clearTimeout(timer);
                                    disposable?.dispose();

                                    if (finishedCmd && finishedCmd.command === command) {
                                        log.debug('Command finished with output');
                                        // Use helper function to limit output lines
                                        const output = finishedCmd.output || '';
                                        resolve(limitOutputLines(output));
                                    } else {
                                        log.debug('Command finished but no matching command found');
                                        resolve('Command executed, but output could not be captured');
                                    }
                                }
                            );

                            if (!disposable) {
                                clearTimeout(timer);
                                log.warn('Command detection registration failed');
                                terminal.sendText(command);
                                resolve('Command executed, but command detection registration failed');
                                return;
                            }

                            // Send command to terminal
                            terminal.sendText(command);
                        } else {
                            clearTimeout(timer);
                            log.warn('Shell integration available but command detection not supported');
                            terminal.sendText(command);
                            resolve('Command executed, but shell integration command detection not available');
                        }
                    } catch (shellError) {
                        log.error('Error using Shell Integration API', shellError);
                        terminal.sendText(command);
                        reject(new Error(`Failed to use Shell Integration API: ${formatError(shellError)}`));
                    }
                });

                // Wait for output result
                const output = await outputPromise;
                return createResponse(output);
            } else {
                // If Shell Integration API is not supported, use traditional method
                log.info('Shell Integration API not available, executing command without output capture');
                terminal.sendText(command);

                // Wait a moment to ensure command has been sent
                await new Promise(resolve => setTimeout(resolve, 500));

                return createResponse(`Command executed: ${command}\n\nOutput cannot be captured in current VS Code version. Please upgrade to VS Code 1.93+ for output capture support.`);
            }
        } catch (error) {
            log.error('Error executing terminal command', error);
            return createResponse(null, `Error executing terminal command: ${formatError(error)}`);
        }
    }
}

/**
 * Execute terminal command with output capture
 */
export class ExecuteCommandWithOutputTool extends AbstractMcpTool<ToolParams['executeCommandWithOutput']> {
    constructor() {
        super(
            'execute_command_with_output',
            'Executes a specified shell command and captures its output using VS Code\'s Shell Integration API.\nThis requires VS Code 1.93+ for full functionality.\nReturns the command output or error information.',
            {
                type: 'object',
                properties: {
                    command: {type: 'string'}
                },
                required: ['command']
            }
        );
    }

    async handle(args: ToolParams['executeCommandWithOutput']): Promise<Response> {
        try {
            const {command} = args;
            log.debug(`Executing command with output capture: ${command}`);

            // Get configured timeout
            const config = vscode.workspace.getConfiguration('ggMCP');
            const timeoutMs = config.get<number>('terminalTimeout', 15000);

            // Use terminal manager to get or create terminal, instead of creating a new terminal each time
            const terminalManager = TerminalManager.getInstance();
            let terminal: vscode.Terminal;
            
            try {
                terminal = terminalManager.getOutputTerminal();
                log.debug('Using managed terminal for output capture');
            } catch (error) {
                log.error('Failed to get terminal from manager', error);
                return createResponse(null, `Failed to get terminal: ${formatError(error)}`);
            }

            // Show terminal
            terminal.show();

            // Check if Shell Integration API is supported
            if (!ShellIntegrationHelper.hasShellIntegration(terminal)) {
                log.warn('Shell Integration API not available, cannot capture output');
                terminal.sendText(command);
                await new Promise(resolve => setTimeout(resolve, 500));

                return createResponse(`Command executed: ${command}\n\nOutput cannot be captured in current VS Code version. Please upgrade to VS Code 1.93+ for output capture support.`);
            }

            // Use VS Code 1.93+ Shell Integration API to capture output
            try {
                // Create Promise to wait for command completion and capture output
                const outputPromise = new Promise<string>((resolve, reject) => {
                    try {
                        // Create timeout timer
                        const timer = setTimeout(() => {
                            log.warn(`Command execution timed out after ${timeoutMs}ms: ${command}`);
                            resolve(`Command execution timed out after ${timeoutMs}ms. Partial output may follow:\n[Output unavailable or command still running]`);
                        }, timeoutMs);

                        // Use ShellIntegrationHelper to check command detection support
                        if (ShellIntegrationHelper.hasCommandDetection(terminal)) {
                            // Register command finished event handler
                            const disposable = ShellIntegrationHelper.registerCommandFinishedHandler(
                                terminal,
                                (finishedCmd: any) => {
                                    clearTimeout(timer);
                                    disposable?.dispose();

                                    if (finishedCmd && finishedCmd.output) {
                                        log.debug('Command finished with output');
                                        // Use helper function to limit output lines
                                        resolve(limitOutputLines(finishedCmd.output));
                                    } else {
                                        log.debug('Command finished but no output captured');
                                        resolve('Command executed, but no output was captured');
                                    }
                                }
                            );

                            if (!disposable) {
                                clearTimeout(timer);
                                log.warn('Command detection registration failed');
                                terminal.sendText(command);
                                resolve('Command executed, but command detection registration failed');
                                return;
                            }

                            // Send command
                            terminal.sendText(command);
                        } else {
                            clearTimeout(timer);
                            terminal.sendText(command);
                            log.warn('Shell integration available but command detection not supported');
                            resolve('Command executed, but shell integration command detection not available');
                        }
                    } catch (shellError) {
                        log.error('Error using Shell Integration API', shellError);
                        reject(new Error(`Failed to use Shell Integration API: ${formatError(shellError)}`));

                        // Try to send command
                        try {
                            terminal.sendText(command);
                        } catch (e) {
                            // Ignore terminal operation failure
                        }
                    }
                });

                // Wait for command execution to complete
                const output = await outputPromise;
                return createResponse(output);
            } catch (shellError) {
                log.error('Error capturing command output', shellError);
                return createResponse(null, `Error capturing command output: ${formatError(shellError)}`);
            }
        } catch (error) {
            log.error('Error executing command with output', error);
            return createResponse(null, `Error executing command with output: ${formatError(error)}`);
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
            'Waits for a specified number of milliseconds (default: 5000ms = 5 seconds).\nOptionally accepts a milliseconds parameter to specify the wait duration.\nReturns "ok" after the wait completes.\nUse this tool when you need to pause before executing the next command.',
            {
                type: 'object',
                properties: {
                    milliseconds: {type: 'number'}
                },
                required: ['milliseconds']
            }
        );
    }

    async handle(args: ToolParams['wait']): Promise<Response> {
        try {
            const {milliseconds} = args;
            log.debug(`Waiting for ${milliseconds} milliseconds`);

            // Create wait using Promise
            await new Promise(resolve => setTimeout(resolve, milliseconds));

            log.debug(`Wait complete: ${milliseconds} milliseconds`);
            return createResponse('ok');
        } catch (error) {
            log.error('Error during wait', error);
            return createResponse(null, `Error during wait: ${formatError(error)}`);
        }
    }
}