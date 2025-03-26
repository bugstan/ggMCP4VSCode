import * as vscode from 'vscode';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('ShellIntegrationHelper');

/**
 * Shell Integration API Helper Class
 * Note: VSCode's TerminalShellIntegration type is not yet complete
 * We use type assertions as a temporary solution until VSCode provides complete types
 */
export class ShellIntegrationHelper {
    /**
     * Check if terminal supports Shell Integration API
     * @param terminal VS Code terminal object
     * @returns Whether Shell Integration API is supported
     */
    public static hasShellIntegration(terminal: vscode.Terminal): boolean {
        try {
            const hasIntegration = 'shellIntegration' in terminal;
            if (!hasIntegration) {
                log.warn('Terminal does not support Shell Integration API');
            }
            return hasIntegration;
        } catch (error) {
            log.error('Error checking Shell Integration API support', error);
            return false;
        }
    }

    /**
     * Check if terminal supports command detection
     * @param terminal VS Code terminal object
     * @returns Whether command detection is supported
     */
    public static hasCommandDetection(terminal: vscode.Terminal): boolean {
        try {
            if (!this.hasShellIntegration(terminal)) {
                return false;
            }

            const shellIntegration = (terminal.shellIntegration as any);
            const hasDetection = !!shellIntegration?.commandDetection;

            if (!hasDetection) {
                log.warn('Terminal does not support command detection');
            }
            return hasDetection;
        } catch (error) {
            log.error('Error checking command detection support', error);
            return false;
        }
    }

    /**
     * Register command finished event handler
     * @param terminal VS Code terminal object
     * @param callback Command finished callback function
     * @returns Event handler disposable object or undefined
     */
    public static registerCommandFinishedHandler(
        terminal: vscode.Terminal,
        callback: (command: any) => void
    ): vscode.Disposable | undefined {
        try {
            if (!this.hasCommandDetection(terminal)) {
                log.warn('Cannot register command finished handler: command detection not supported');
                return undefined;
            }

            const shellIntegration = (terminal.shellIntegration as any);
            if (!shellIntegration?.commandDetection?.onCommandFinished) {
                log.warn('Command finished handler registration failed: method not available');
                return undefined;
            }

            const disposable = shellIntegration.commandDetection.onCommandFinished(callback);
            if (!disposable) {
                log.warn('Command finished handler registration failed: no disposable returned');
                return undefined;
            }

            log.info('Successfully registered command finished handler');
            return disposable;
        } catch (error) {
            log.error('Error registering command finished handler', error);
            return undefined;
        }
    }

    /**
     * Get current command output
     * @param terminal VS Code terminal object
     * @returns Current command output or undefined
     */
    public static getCurrentCommandOutput(terminal: vscode.Terminal): string | undefined {
        try {
            if (!this.hasShellIntegration(terminal)) {
                log.warn('Cannot get command output: Shell Integration API not supported');
                return undefined;
            }

            const shellIntegration = (terminal.shellIntegration as any);
            const output = shellIntegration?.currentCommand?.output;

            if (!output) {
                log.warn('No current command output available');
            } else {
                log.info('Successfully retrieved current command output');
            }

            return output;
        } catch (error) {
            log.error('Error getting current command output', error);
            return undefined;
        }
    }

    /**
     * Wait for terminal to be ready
     * @param terminal VS Code terminal object
     * @param timeoutMs Timeout in milliseconds
     * @returns Promise that resolves when terminal is ready
     */
    public static async waitForTerminalReady(terminal: vscode.Terminal, timeoutMs: number = 1000): Promise<boolean> {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = 100;

            const check = () => {
                if (this.hasShellIntegration(terminal)) {
                    log.info('Terminal is ready');
                    resolve(true);
                    return;
                }

                if (Date.now() - startTime >= timeoutMs) {
                    log.warn('Timeout waiting for terminal to be ready');
                    resolve(false);
                    return;
                }

                setTimeout(check, checkInterval);
            };

            check();
        });
    }
}
