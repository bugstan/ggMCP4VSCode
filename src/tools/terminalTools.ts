import * as vscode from 'vscode';
import { AbstractTerminalTools } from '../types/absTerminalTools';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';
import { ShellIntegrationHelper } from '../utils/shellIntegrationHelper';

/**
 * Get terminal text content tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class GetTerminalTextTool extends AbstractTerminalTools {
    constructor() {
        super(
            'get_terminal_text',
            'Retrieves the current text content from the first active terminal in the IDE.\nUse this tool to access the terminal\'s output and command history.\nReturns one of two possible responses:\n- The terminal\'s text content if a terminal exists\n- empty string if no terminal is open or available\nNote: Only captures text from the first terminal if multiple terminals are open',
            {type: 'object', properties: {}}
        );
    }

    /**
     * This tool does not require terminal display
     */
    protected shouldShowTerminal(): boolean {
        return false;
    }

    /**
     * Execute get terminal text operation (implementing base class abstract method)
     */
    protected async executeCommand(terminal: vscode.Terminal | null, _args: any): Promise<Response> {
        try {
            // Check if terminal exists
            if (!terminal) {
                this.log.info('No terminals are open');
                return responseHandler.success('');
            }

            // Use VS Code 1.93+ Shell Integration API to get terminal content
            try {
                if ('onDidWriteData' in terminal) {
                    // This feature is not available in older VS Code versions, log warning
                    this.log.warn('Terminal content request using legacy method, modern API not available');
                    return responseHandler.success('Terminal content not directly accessible in current VS Code version. Please upgrade to VS Code 1.93+ for this functionality.');
                }

                // Use ShellIntegrationHelper to check Shell Integration API support
                if (ShellIntegrationHelper.hasShellIntegration(terminal)) {
                    const output = ShellIntegrationHelper.getCurrentCommandOutput(terminal);
                    if (output) {
                        this.log.info('Retrieved terminal output using Shell Integration API');
                        return responseHandler.success(output);
                    } else {
                        this.log.info('No current command output available');
                        return responseHandler.success('No current command output available');
                    }
                }

                // If Shell Integration API is not available
                this.log.info('Terminal Shell Integration API not available in current VS Code version');
                return responseHandler.success('Terminal content not directly accessible. Please upgrade to VS Code 1.93+ for Shell Integration API support.');
            } catch (shellError) {
                this.log.error('Error using Shell Integration API', shellError);
                return responseHandler.success('Error retrieving terminal content using Shell Integration API');
            }
        } catch (error) {
            this.log.error('Error getting terminal content', error);
            return responseHandler.failure(`Error getting terminal content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Execute terminal command tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class ExecuteTerminalCommandTool extends AbstractTerminalTools<ToolParams['executeTerminalCommand']> {
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

    /**
     * Execute terminal command operation (implementing base class abstract method)
     */
    protected async executeCommand(terminal: vscode.Terminal | null, args: ToolParams['executeTerminalCommand']): Promise<Response> {
        try {
            const {command} = args;
            this.log.info(`Executing terminal command: ${command}`);

            // Get timeout configuration
            const timeoutMs = this.getTimeoutMs();

            // Ensure terminal exists
            if (!terminal) {
                return responseHandler.failure('No terminal available');
            }

            // Use ShellIntegrationHelper to check Shell Integration API
            if (ShellIntegrationHelper.hasShellIntegration(terminal)) {
                this.log.info('Using Shell Integration API to capture command output');

                // Send command and wait for output
                const output = await this.executeCommandWithOutput(terminal, command, timeoutMs);
                return responseHandler.success(output);
            } else {
                // If Shell Integration API is not supported, use traditional method
                this.log.info('Shell Integration API not available, executing command without output capture');
                terminal.sendText(command);

                // Wait a bit to ensure command is sent
                await new Promise(resolve => setTimeout(resolve, 500));

                return responseHandler.success(`Command executed: ${command}\n\nOutput cannot be captured in current VS Code version. Please upgrade to VS Code 1.93+ for output capture support.`);
            }
        } catch (error) {
            this.log.error('Error executing terminal command', error);
            return responseHandler.failure(`Error executing terminal command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Execute command and capture output tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class ExecuteCommandWithOutputTool extends AbstractTerminalTools<ToolParams['executeCommandWithOutput']> {
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

    /**
     * Execute command and capture output operation (implementing base class abstract method)
     */
    protected async executeCommand(terminal: vscode.Terminal | null, args: ToolParams['executeCommandWithOutput']): Promise<Response> {
        try {
            const {command} = args;
            this.log.info(`Executing command with output capture: ${command}`);

            // Update command status to "running"
            this.terminalManager.setCommandOutput('', 'running');

            // Get timeout configuration
            const timeoutMs = this.getTimeoutMs();

            // Ensure terminal exists
            if (!terminal) {
                const errorMessage = 'Failed to get terminal';
                this.terminalManager.setCommandOutput(errorMessage, 'error');
                return responseHandler.failure(errorMessage);
            }

            // Check if Shell Integration API is supported
            if (!ShellIntegrationHelper.hasShellIntegration(terminal)) {
                this.log.warn('Shell Integration API not available, cannot capture output');
                terminal.sendText(command);
                await new Promise(resolve => setTimeout(resolve, 500));

                const outputText = `Command executed: ${command}\n\nOutput cannot be captured in current VS Code version. Please upgrade to VS Code 1.93+ for output capture support.`;
                this.terminalManager.setCommandOutput(outputText, 'completed');
                return responseHandler.success(outputText);
            }

            // Use VS Code 1.93+ Shell Integration API to capture output
            try {
                // Use base class method to execute command and capture output
                const output = await this.executeCommandWithOutput(terminal, command, timeoutMs);
                
                // Set command output status
                this.terminalManager.setCommandOutput(output, 'completed');
                
                return responseHandler.success(output);
            } catch (shellError) {
                this.log.error('Error capturing command output', shellError);
                const errorMessage = `Error capturing command output: ${shellError instanceof Error ? shellError.message : String(shellError)}`;
                this.terminalManager.setCommandOutput(errorMessage, 'error');
                return responseHandler.failure(errorMessage);
            }
        } catch (error) {
            this.log.error('Error executing command with output', error);
            const errorMessage = `Error executing command with output: ${error instanceof Error ? error.message : String(error)}`;
            this.terminalManager.setCommandOutput(errorMessage, 'error');
            return responseHandler.failure(errorMessage);
        }
    }
}

/**
 * Get command output tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class GetCommandOutputTool extends AbstractTerminalTools {
    constructor() {
        super(
            'get_command_output',
            'Gets the output from the last command executed with execute_command_with_output.\nReturns the command output and status.',
            {type: 'object', properties: {}}
        );
    }

    /**
     * This tool does not require terminal
     */
    protected requiresTerminal(): boolean {
        return false;
    }

    /**
     * Execute get command output operation (implementing base class abstract method)
     */
    protected async executeCommand(_terminal: vscode.Terminal | null, _args: any): Promise<Response> {
        try {
            const {output, status} = this.terminalManager.getCommandOutput();

            this.log.info(`Getting command output. Status: ${status}`);
            return responseHandler.success({
                status,
                output
            });
        } catch (error) {
            this.log.error('Error getting command output', error);
            return responseHandler.failure(`Error getting command output: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Wait for specified milliseconds tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class WaitTool extends AbstractTerminalTools<ToolParams['wait']> {
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

    /**
     * This tool does not require terminal
     */
    protected requiresTerminal(): boolean {
        return false;
    }

    /**
     * Execute wait operation (implementing base class abstract method)
     */
    protected async executeCommand(_terminal: vscode.Terminal | null, args: ToolParams['wait']): Promise<Response> {
        try {
            const {milliseconds} = args;
            this.log.info(`Waiting for ${milliseconds} milliseconds`);

            // Use Promise to implement wait
            await new Promise(resolve => setTimeout(resolve, milliseconds));

            this.log.info(`Wait complete: ${milliseconds} milliseconds`);
            return responseHandler.success('ok');
        } catch (error) {
            this.log.error('Error during wait', error);
            return responseHandler.failure(`Error during wait: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}