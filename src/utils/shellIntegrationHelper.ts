import * as vscode from 'vscode';

/**
 * Shell Integration API Helper Class
 * Provides unified methods for checking and using Shell Integration API, avoiding type issues
 */
export class ShellIntegrationHelper {
    /**
     * Check if terminal supports Shell Integration API
     * @param terminal VS Code terminal object
     * @returns Whether Shell Integration API is supported
     */
    public static hasShellIntegration(terminal: vscode.Terminal): boolean {
        return 'shellIntegration' in terminal;
    }

    /**
     * Check if terminal supports command detection
     * @param terminal VS Code terminal object
     * @returns Whether command detection is supported
     */
    public static hasCommandDetection(terminal: vscode.Terminal): boolean {
        try {
            // Use any type to bypass type checking, as we already checked property existence in hasShellIntegration
            const shellIntegration = (terminal as any).shellIntegration;
            return !!shellIntegration && !!shellIntegration.commandDetection;
        } catch {
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
                return undefined;
            }
            
            const shellIntegration = (terminal as any).shellIntegration;
            if (shellIntegration && 
                shellIntegration.commandDetection && 
                typeof shellIntegration.commandDetection.onCommandFinished === 'function') {
                return shellIntegration.commandDetection.onCommandFinished(callback);
            }
            return undefined;
        } catch {
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
            const shellIntegration = (terminal as any).shellIntegration;
            if (shellIntegration && shellIntegration.currentCommand) {
                return shellIntegration.currentCommand.output;
            }
            return undefined;
        } catch {
            return undefined;
        }
    }
}