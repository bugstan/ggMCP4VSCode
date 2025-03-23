import * as os from 'os';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('TerminalDetector');

/**
 * Terminal Type Enum
 * Represents different types of terminals across operating systems
 */
export enum TerminalType {
    CMD = 'cmd',
    PowerShell = 'powershell',
    WindowsTerminal = 'windows-terminal',
    Bash = 'bash',
    Zsh = 'zsh',
    Fish = 'fish',
    Terminal = 'terminal', // macOS Terminal.app
    ITerm = 'iterm',       // macOS iTerm2
    Gnome = 'gnome-terminal',
    Konsole = 'konsole',
    Xterm = 'xterm',
    Other = 'other'
}

/**
 * Operating System Type Enum
 */
export enum OSType {
    Windows = 'windows',
    macOS = 'macos',
    Linux = 'linux',
    Other = 'other'
}

/**
 * Terminal Information Interface
 */
export interface TerminalInfo {
    osType: OSType;
    terminalType: TerminalType;
    osVersion?: string;
    isIntegratedTerminal: boolean;
    isDefault: boolean;
}

/**
 * Terminal Detector Class
 * Provides methods to detect the current terminal and OS information
 */
export class TerminalDetector {
    /**
     * Detect current OS type
     */
    public static getOSType(): OSType {
        const platform = os.platform();
        
        if (platform === 'win32') {
            return OSType.Windows;
        } else if (platform === 'darwin') {
            return OSType.macOS;
        } else if (platform === 'linux') {
            return OSType.Linux;
        } else {
            return OSType.Other;
        }
    }

    /**
     * Get OS version information
     */
    public static getOSVersion(): string {
        return os.release();
    }
    
    /**
     * Check if terminal is VS Code's integrated terminal
     * @param terminal VSCode terminal instance
     */
    public static isIntegratedTerminal(terminal: vscode.Terminal): boolean {
        // In VS Code API there's not a direct way to check,
        // but we can infer it from the name or use a command detection trick
        const name = terminal.name.toLowerCase();
        const isIntegrated = !name.includes('external');
        
        return isIntegrated;
    }
    
    /**
     * Detect terminal type using environment variables
     * @param callback Callback function that receives the detected terminal type
     */
    public static detectTerminalType(callback: (terminalType: TerminalType) => void): void {
        const osType = this.getOSType();
        
        switch (osType) {
            case OSType.Windows:
                this.detectWindowsTerminal(callback);
                break;
            case OSType.macOS:
                this.detectMacTerminal(callback);
                break;
            case OSType.Linux:
                this.detectLinuxTerminal(callback);
                break;
            default:
                callback(TerminalType.Other);
        }
    }
    
    /**
     * Check if current terminal is the default for the OS
     * @param terminalType Terminal type to check
     */
    public static isDefaultTerminal(terminalType: TerminalType): boolean {
        const osType = this.getOSType();
        
        switch (osType) {
            case OSType.Windows:
                return terminalType === TerminalType.CMD;
            case OSType.macOS:
                return terminalType === TerminalType.Terminal;
            case OSType.Linux:
                // Depends on distribution, but usually some form of bash
                return terminalType === TerminalType.Bash;
            default:
                return false;
        }
    }
    
    /**
     * Get complete terminal information
     * @param callback Callback function that receives terminal information
     */
    public static getTerminalInfo(terminal?: vscode.Terminal, callback?: (info: TerminalInfo) => void): void {
        const osType = this.getOSType();
        const osVersion = this.getOSVersion();
        
        // If we don't have a terminal instance, we can't check if it's integrated
        const isIntegrated = terminal ? this.isIntegratedTerminal(terminal) : false;
        
        this.detectTerminalType((terminalType) => {
            const isDefault = this.isDefaultTerminal(terminalType);
            
            const info: TerminalInfo = {
                osType,
                osVersion,
                terminalType,
                isIntegratedTerminal: isIntegrated,
                isDefault
            };
            
            if (callback) {
                callback(info);
            }
        });
    }
    
    /**
     * Detect Windows terminal type
     */
    private static detectWindowsTerminal(callback: (terminalType: TerminalType) => void): void {
        // Check for common Windows environment variables
        const isPowerShell = process.env.PSModulePath !== undefined;
        
        if (isPowerShell) {
            callback(TerminalType.PowerShell);
            return;
        }
        
        // Try to detect via a command
        exec('echo %ComSpec%', (error, stdout) => {
            if (error) {
                log.warn('Error detecting Windows terminal', error);
                callback(TerminalType.Other);
                return;
            }
            
            const output = stdout.trim().toLowerCase();
            
            if (output.includes('cmd.exe')) {
                callback(TerminalType.CMD);
            } else if (output.includes('powershell.exe')) {
                callback(TerminalType.PowerShell);
            } else if (output.includes('windowsterminal')) {
                callback(TerminalType.WindowsTerminal);
            } else {
                callback(TerminalType.Other);
            }
        });
    }
    
    /**
     * Detect macOS terminal type
     */
    private static detectMacTerminal(callback: (terminalType: TerminalType) => void): void {
        // Check for shell environment variable
        const shellEnv = process.env.SHELL || '';
        
        if (shellEnv.includes('zsh')) {
            callback(TerminalType.Zsh);
            return;
        } else if (shellEnv.includes('bash')) {
            callback(TerminalType.Bash);
            return;
        } else if (shellEnv.includes('fish')) {
            callback(TerminalType.Fish);
            return;
        }
        
        // Try to detect via a command
        exec('ps -p $PPID -o comm=', (error, stdout) => {
            if (error) {
                log.warn('Error detecting macOS terminal', error);
                callback(TerminalType.Other);
                return;
            }
            
            const output = stdout.trim().toLowerCase();
            
            if (output.includes('terminal')) {
                callback(TerminalType.Terminal);
            } else if (output.includes('iterm')) {
                callback(TerminalType.ITerm);
            } else if (output.includes('zsh')) {
                callback(TerminalType.Zsh);
            } else if (output.includes('bash')) {
                callback(TerminalType.Bash);
            } else if (output.includes('fish')) {
                callback(TerminalType.Fish);
            } else {
                callback(TerminalType.Other);
            }
        });
    }
    
    /**
     * Detect Linux terminal type
     */
    private static detectLinuxTerminal(callback: (terminalType: TerminalType) => void): void {
        // Check for shell environment variable
        const shellEnv = process.env.SHELL || '';
        
        if (shellEnv.includes('zsh')) {
            callback(TerminalType.Zsh);
            return;
        } else if (shellEnv.includes('bash')) {
            callback(TerminalType.Bash);
            return;
        } else if (shellEnv.includes('fish')) {
            callback(TerminalType.Fish);
            return;
        }
        
        // Try to detect via terminal environment variables
        if (process.env.TERM_PROGRAM) {
            const termProgram = process.env.TERM_PROGRAM.toLowerCase();
            
            if (termProgram.includes('gnome')) {
                callback(TerminalType.Gnome);
                return;
            } else if (termProgram.includes('konsole')) {
                callback(TerminalType.Konsole);
                return;
            } else if (termProgram.includes('xterm')) {
                callback(TerminalType.Xterm);
                return;
            }
        }
        
        // Try command line detection as fallback
        exec('ps -p $PPID -o comm=', (error, stdout) => {
            if (error) {
                log.warn('Error detecting Linux terminal', error);
                callback(TerminalType.Other);
                return;
            }
            
            const output = stdout.trim().toLowerCase();
            
            if (output.includes('gnome')) {
                callback(TerminalType.Gnome);
            } else if (output.includes('konsole')) {
                callback(TerminalType.Konsole);
            } else if (output.includes('xterm')) {
                callback(TerminalType.Xterm);
            } else if (output.includes('bash')) {
                callback(TerminalType.Bash);
            } else if (output.includes('zsh')) {
                callback(TerminalType.Zsh);
            } else if (output.includes('fish')) {
                callback(TerminalType.Fish);
            } else {
                callback(TerminalType.Other);
            }
        });
    }
}