import { AbsTerminalTools } from '../types/absTerminalTools';
import { Response } from '../types';
import { responseHandler } from '../server/responseHandler';

/**
 * Execute terminal command tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class ExecuteTerminalCommandTool extends AbsTerminalTools<{
    command: string;
}> {
    constructor() {
        super(
            'execute_terminal_command',
            'Execute a shell command in the IDE\'s integrated terminal. The command will be visible to the user and only returns execution status.',
            {
                type: 'object',
                properties: {
                    command: { type: 'string' }
                },
                required: ['command']
            }
        );
    }

    /**
     * Execute terminal command operation (implementing base class abstract method)
     */
    protected async executeTerminalOperation(_projectRoot: string, args: {
        command: string;
    }): Promise<Response> {
        try {
            const { command } = args;

            this.log.info(`Executing terminal command: ${command}`);

            // Get terminal
            const terminal = await this.prepareTerminal();
            if (!terminal) {
                return responseHandler.failure('No terminal available');
            }

            // Send command to terminal
            terminal.sendText(command);

            return responseHandler.success({
                status: 'executed'
            });
        } catch (error) {
            this.log.error('Error executing terminal command', error);
            return responseHandler.failure(`Error executing terminal command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Wait for specified milliseconds tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class WaitTool extends AbsTerminalTools<{
    milliseconds: number;
}> {
    constructor() {
        super(
            'wait',
            'Wait for a specified number of milliseconds before continuing.',
            {
                type: 'object',
                properties: {
                    milliseconds: { type: 'number' }
                },
                required: ['milliseconds']
            }
        );
    }

    /**
     * Wait operation (implementing base class abstract method)
     */
    protected async executeTerminalOperation(_projectRoot: string, args: {
        milliseconds: number;
    }): Promise<Response> {
        try {
            const { milliseconds } = args;

            this.log.info(`Waiting for ${milliseconds} milliseconds`);

            // Wait for the specified time
            await new Promise(resolve => setTimeout(resolve, milliseconds));

            return responseHandler.success({
                status: 'completed',
                message: `Waited for ${milliseconds} milliseconds`
            });
        } catch (error) {
            this.log.error('Error during wait operation', error);
            return responseHandler.failure(`Error during wait operation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Run command in background tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class RunCommandOnBackgroundTool extends AbsTerminalTools<{
    command: string;
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeout?: number;
}> {
    constructor() {
        super(
            'run_command_on_background',
            'Execute a command in the background and return its output. The command execution is not visible to the user.',
            {
                type: 'object',
                properties: {
                    command: { type: 'string' },
                    cwd: { type: 'string' },
                    env: { type: 'object' },
                    timeout: { type: 'number' }
                },
                required: ['command']
            }
        );
    }

    /**
     * Run command in background operation (implementing base class abstract method)
     */
    protected async executeTerminalOperation(projectRoot: string, args: {
        command: string;
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
    }): Promise<Response> {
        try {
            const { command, cwd, env, timeout } = args;

            this.log.info(`Executing background command: ${command}`);

            // Execute command in background
            const result = await this.executeCommandInBackground(command, {
                cwd: cwd || projectRoot,
                env,
                timeout
            });

            return responseHandler.success(result);
        } catch (error) {
            this.log.error('Error executing background command', error);
            return responseHandler.failure(`Error executing background command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
