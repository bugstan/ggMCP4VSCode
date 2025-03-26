import * as vscode from 'vscode';
import {Response} from './index';
import {AbstractTool} from './absTool';
import {responseHandler} from '../server/responseHandler';
import {TerminalManager} from '../utils/terminalManager';
import child_process from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getProjectRoot } from '../utils/pathUtils';

const execAsync = promisify(exec);

/**
 * Base class for terminal operation tools
 * Provides terminal access and command execution functionality
 */
export abstract class AbstractTerminalTools<T = any> extends AbstractTool<T> {
    protected readonly terminalManager = TerminalManager.getInstance();

    /**
     * Core logic implementation for terminal operations
     */
    protected async executeCore(args: T): Promise<Response> {
        try {
            const projectRoot = getProjectRoot();
            if (!projectRoot) {
                return responseHandler.failure('No project root found');
            }

            return await this.executeTerminalOperation(projectRoot, args);
        } catch (error) {
            this.log.error('Error executing terminal operation', error);
            return responseHandler.failure(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Prepare terminal environment
     */
    protected async prepareTerminal(): Promise<vscode.Terminal | null> {
        try {
            // Get or create terminal
            let terminal = vscode.window.activeTerminal;
            if (!terminal && this.requiresTerminal()) {
                terminal = this.terminalManager.getOutputTerminal();
                this.log.info('Created new terminal for operation');
            }

            // Show terminal
            if (terminal && this.shouldShowTerminal()) {
                terminal.show();
            }

            return terminal ?? null;
        } catch (error) {
            this.log.error('Error preparing terminal', error);
            return null;
        }
    }

    /**
     * Whether terminal is required, defaults to true
     */
    protected requiresTerminal(): boolean {
        return true;
    }

    /**
     * Whether terminal should be shown, defaults to true
     */
    protected shouldShowTerminal(): boolean {
        return true;
    }

    /**
     * Get terminal timeout settings
     */
    protected getTimeoutMs(): number {
        const config = vscode.workspace.getConfiguration('ggMCP');
        return config.get<number>('terminalTimeout', 15000);
    }

    /**
     * Execute specific terminal operation, needs to be implemented by subclasses
     */
    protected abstract executeTerminalOperation(projectRoot: string, args: T): Promise<Response>;

    /**
     * Execute command and capture output
     */
    protected async executeCommand(command: string, cwd: string): Promise<{
        stdout: string,
        stderr: string,
        exitCode: number | null
    }> {
        try {
            this.log.info(`Executing command in ${cwd}: ${command}`);
            const { stdout, stderr } = await execAsync(command, { cwd });

            return {
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0
            };
        } catch (error: unknown) {
            this.log.error(`Error executing command: ${command}`, error);
            return {
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                exitCode: error instanceof Error && 'code' in error ? Number(error.code) : -1
            };
        }
    }

    /**
     * Limit output lines to prevent overwhelming the UI
     */
    protected limitOutputLines(output: string, maxLines: number = 100): string {
        const lines = output.split('\n');
        if (lines.length <= maxLines) {
            return output;
        }
        return lines.slice(0, maxLines).join('\n') + '\n... (output truncated)';
    }

    /**
     * Execute command in background using Node.js child_process
     * @param command Command to execute
     * @param options Command execution options
     * @returns Promise with command execution result
     */
    protected async executeCommandInBackground(
        command: string,
        options: {
            timeout?: number;
            cwd?: string;
            env?: Record<string, string | undefined>;
        } = {}
    ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || this.getTimeoutMs();
            let childProcess: child_process.ChildProcess;

            const timer = setTimeout(() => {
                if (childProcess && childProcess.pid) {
                    process.kill(-childProcess.pid);
                }
                reject(new Error(`Command execution timed out after ${timeout}ms`));
            }, timeout);

            childProcess = child_process.exec(command, {
                cwd: options.cwd,
                env: options.env,
                maxBuffer: 1024 * 1024, // 1MB buffer
                windowsHide: true // Hide window on Windows
            }, (error: Error | null, stdout: string, stderr: string) => {
                clearTimeout(timer);
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        stdout: stdout || '',
                        stderr: stderr || '',
                        exitCode: childProcess.exitCode || 0
                    });
                }
            });
        });
    }
}
