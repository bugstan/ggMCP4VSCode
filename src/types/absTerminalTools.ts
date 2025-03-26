import * as vscode from 'vscode';
import {Response} from './index';
import {AbstractTool} from './absTool';
import {responseHandler} from '../server/responseHandler';
import {TerminalManager} from '../utils/terminalManager';
import {ShellIntegrationHelper} from '../utils/shellIntegrationHelper';
import * as child_process from 'child_process';

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
        // Prepare terminal
        const terminal = await this.prepareTerminal();

        // If terminal is required but failed to get
        if (this.requiresTerminal() && !terminal) {
            return responseHandler.failure('Failed to get or create terminal');
        }

        // Execute specific terminal operation
        return await this.executeCommand(terminal, args);
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

            // Wait for terminal to be ready
            if (terminal) {
                const isReady = await ShellIntegrationHelper.waitForTerminalReady(terminal);
                if (!isReady) {
                    this.log.warn('Terminal is not ready after waiting');
                    return null;
                }
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
    protected abstract executeCommand(terminal: vscode.Terminal | null, args: T): Promise<Response>;

    /**
     * Limit output line count
     */
    protected limitOutputLines(output: string, maxLines: number = 2000): string {
        const lines = output.split('\n');
        if (lines.length > maxLines) {
            const truncated = lines.slice(0, maxLines).join('\n');
            return `${truncated}\n\n[Output truncated, showing first ${maxLines} lines]`;
        }
        return output;
    }

    /**
     * Execute command and capture output
     */
    protected async executeCommandWithOutput(
        terminal: vscode.Terminal,
        command: string,
        timeoutMs: number
    ): Promise<string> {
        return new Promise<string>((resolve) => {
            try {
                // Check Shell Integration API support
                if (!ShellIntegrationHelper.hasShellIntegration(terminal)) {
                    terminal.sendText(command);
                    setTimeout(() => {
                        resolve(`Command executed: ${command}\n\nOutput cannot be captured in current VS Code version.`);
                    }, 500);
                    return;
                }

                // Create timeout timer
                const timer = setTimeout(() => {
                    this.log.warn(`Command execution timed out after ${timeoutMs}ms: ${command}`);
                    resolve(`Command execution timed out after ${timeoutMs}ms.`);
                }, timeoutMs);

                // Check command detection support
                if (ShellIntegrationHelper.hasCommandDetection(terminal)) {
                    // Register command completion event handler
                    const disposable = ShellIntegrationHelper.registerCommandFinishedHandler(
                        terminal,
                        (finishedCmd: any) => {
                            clearTimeout(timer);
                            disposable?.dispose();

                            if (finishedCmd && finishedCmd.output) {
                                resolve(this.limitOutputLines(finishedCmd.output));
                            } else {
                                resolve('Command executed, but no output was captured');
                            }
                        }
                    );

                    if (!disposable) {
                        clearTimeout(timer);
                        terminal.sendText(command);
                        resolve('Command executed, but command detection registration failed');
                        return;
                    }

                    // Send command
                    terminal.sendText(command);
                } else {
                    clearTimeout(timer);
                    terminal.sendText(command);
                    resolve('Command executed, but shell integration command detection not available');
                }
            } catch (error) {
                terminal.sendText(command);
                resolve(`Failed to use Shell Integration API: ${error}`);
            }
        });
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
            env?: NodeJS.ProcessEnv;
        } = {}
    ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || this.getTimeoutMs();
            const timer = setTimeout(() => {
                process.kill(-childProcess.pid!);
                reject(new Error(`Command execution timed out after ${timeout}ms`));
            }, timeout);

            const childProcess = child_process.exec(command, {
                cwd: options.cwd,
                env: options.env,
                maxBuffer: 1024 * 1024, // 1MB buffer
                windowsHide: true // Hide window on Windows
            }, (error, stdout, stderr) => {
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
