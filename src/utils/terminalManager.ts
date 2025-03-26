import * as vscode from 'vscode';
import {Logger} from './logger';

// Create module-specific logger
const log = Logger.forModule('TerminalManager');

/**
 * Command output status type definition
 */
export type CommandStatus = 'idle' | 'running' | 'completed' | 'error';

/**
 * Global terminal manager for reusing terminals to avoid accumulation
 * Implemented as a singleton to ensure the same terminal instances are used across the application
 */
export class TerminalManager {
    private static instance: TerminalManager;
    private outputTerminal: vscode.Terminal | null = null;
    
    // Add command output storage
    private lastCommandOutput: string = '';
    private commandStatus: CommandStatus = 'idle';
    
    private constructor() {}
    
    /**
     * Get the singleton instance of TerminalManager
     * @returns The singleton TerminalManager instance
     */
    public static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }
    
    /**
     * Get or create a terminal for output operations
     * Reuses existing terminal if available, otherwise creates a new one
     * @returns VS Code terminal instance
     */
    public getOutputTerminal(): vscode.Terminal {
        if (!this.outputTerminal || this.isTerminalClosed(this.outputTerminal)) {
            this.outputTerminal = vscode.window.createTerminal('MCP Output Terminal');
            log.info('Created new MCP Output Terminal');
        }
        return this.outputTerminal;
    }
    
    /**
     * Check if the specified terminal is closed
     * @param terminal VS Code terminal to check
     * @returns True if terminal is closed, false otherwise
     */
    private isTerminalClosed(terminal: vscode.Terminal): boolean {
        // Since VS Code API doesn't have a direct method to check if terminal is closed,
        // we check if the terminal is in the current active terminal list
        return !vscode.window.terminals.some(t => t.name === terminal.name);
    }
    
    /**
     * Dispose the output terminal if it exists
     */
    public disposeOutputTerminal(): void {
        if (this.outputTerminal) {
            try {
                this.outputTerminal.dispose();
                log.info('Disposed MCP Output Terminal');
            } catch (e) {
                log.error('Error disposing terminal', e);
            } finally {
                this.outputTerminal = null;
            }
        }
    }
    
    /**
     * Set last command output and status
     * @param output Command output
     * @param status Command status
     */
    public setCommandOutput(output: string, status: CommandStatus): void {
        this.lastCommandOutput = output;
        this.commandStatus = status;
        log.info(`Updated command output. Status: ${status}`);
    }
    
    /**
     * Get last command output and status
     * @returns Object containing output and status
     */
    public getCommandOutput(): { output: string; status: CommandStatus } {
        return {
            output: this.lastCommandOutput,
            status: this.commandStatus
        };
    }
}