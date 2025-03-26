import { AbstractTerminalTools } from '../types/absTerminalTools';
import { Response } from '../types';
import { responseHandler } from '../server/responseHandler';
import { TerminalDetector, OSType, TerminalInfo, TerminalType } from '../utils/terminalDetector';

/**
 * Get terminal information tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class GetTerminalInfoTool extends AbstractTerminalTools {
    constructor() {
        super(
            'get_terminal_info',
            'Retrieve information about the current terminal and operating system environment. ' +
            'Returns data about OS type, terminal type, and whether it is the default terminal.',
            { type: 'object', properties: {} }
        );
    }

    /**
     * This tool does not require terminal
     */
    protected requiresTerminal(): boolean {
        return false;
    }

    /**
     * Execute get terminal information operation (implementing base class abstract method)
     */
    protected async executeTerminalOperation(_projectRoot: string, _args: any): Promise<Response> {
        try {
            // Get basic OS information
            const osType = TerminalDetector.getOSType();
            const osVersion = await this.getOSVersion(osType);

            this.log.info(`Detecting terminal information (OS: ${osType}, Version: ${osVersion})`);

            // Get terminal type information
            const terminalType = await this.getTerminalType();
            const isDefault = TerminalDetector.isDefaultTerminal(terminalType);

            const info: TerminalInfo = {
                osType,
                osVersion,
                terminalType,
                isIntegratedTerminal: false, // Since we're not using VSCode terminal
                isDefault
            };

            this.log.info('Terminal information detected', info);
            return responseHandler.success(info);
        } catch (error) {
            this.log.error('Error getting terminal information', error);
            return responseHandler.failure(`Error getting terminal information: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get OS version using system commands
     */
    private async getOSVersion(osType: OSType): Promise<string> {
        try {
            let command = '';
            switch (osType) {
                case OSType.Windows:
                    command = 'ver';
                    break;
                case OSType.macOS:
                case OSType.Linux:
                    command = 'uname -a';
                    break;
                default:
                    return 'Unknown';
            }

            const result = await this.executeCommandInBackground(command);
            return result.stdout.trim();
        } catch (error) {
            this.log.error('Error getting OS version', error);
            return 'Unknown';
        }
    }

    /**
     * Get terminal type using system commands
     */
    private async getTerminalType(): Promise<TerminalType> {
        try {
            const command = process.platform === 'win32' ? 'echo %TERM%' : 'echo $TERM';
            const result = await this.executeCommandInBackground(command);
            const termType = result.stdout.trim().toLowerCase();

            // Map terminal type string to TerminalType enum
            if (termType.includes('windows-terminal')) {
                return TerminalType.WindowsTerminal;
            } else if (termType.includes('powershell')) {
                return TerminalType.PowerShell;
            } else if (termType.includes('cmd')) {
                return TerminalType.CMD;
            } else if (termType.includes('bash')) {
                return TerminalType.Bash;
            } else if (termType.includes('zsh')) {
                return TerminalType.Zsh;
            } else if (termType.includes('fish')) {
                return TerminalType.Fish;
            } else if (termType.includes('gnome')) {
                return TerminalType.Gnome;
            } else if (termType.includes('konsole')) {
                return TerminalType.Konsole;
            } else if (termType.includes('xterm')) {
                return TerminalType.Xterm;
            } else if (termType.includes('terminal')) {
                return TerminalType.Terminal;
            } else if (termType.includes('iterm')) {
                return TerminalType.ITerm;
            } else {
                return TerminalType.Other;
            }
        } catch (error) {
            this.log.error('Error getting terminal type', error);
            return TerminalType.Other;
        }
    }
}

/**
 * Execute OS-specific command tool
 * Inherits from AbstractTerminalTools base class to utilize common terminal operation functionality
 */
export class ExecuteOSSpecificCommandTool extends AbstractTerminalTools<{
    windowsCommand?: string;
    unixCommand?: string;
    macCommand?: string;
    command?: string
}> {
    constructor() {
        super(
            'execute_os_specific_command',
            'Execute a command with syntax adjusted for the detected operating system and terminal. ' +
            'You can provide different command versions for different platforms, or a generic command.',
            {
                type: 'object',
                properties: {
                    windowsCommand: { type: 'string' },
                    unixCommand: { type: 'string' },
                    macCommand: { type: 'string' },
                    command: { type: 'string' }
                }
            }
        );
    }

    /**
     * Execute OS-specific command operation (implementing base class abstract method)
     */
    protected async executeTerminalOperation(_projectRoot: string, args: {
        windowsCommand?: string;
        unixCommand?: string;
        macCommand?: string;
        command?: string
    }): Promise<Response> {
        try {
            const { windowsCommand, unixCommand, macCommand, command } = args;

            // If no specific command provided, use generic command
            if (!windowsCommand && !unixCommand && !macCommand && !command) {
                return responseHandler.failure('No command specified');
            }

            // Get OS type to determine which command to use
            const osType = TerminalDetector.getOSType();

            // Default to generic command
            let commandToExecute = command || '';

            // Override generic command based on OS type
            switch (osType) {
                case OSType.Windows:
                    if (windowsCommand) {
                        commandToExecute = windowsCommand;
                    }
                    break;
                case OSType.macOS:
                    if (macCommand) {
                        commandToExecute = macCommand;
                    } else if (unixCommand) {
                        commandToExecute = unixCommand;
                    }
                    break;
                case OSType.Linux:
                    if (unixCommand) {
                        commandToExecute = unixCommand;
                    }
                    break;
            }

            if (!commandToExecute) {
                return responseHandler.failure(`No command specified for ${osType} operating system`);
            }

            this.log.info(`Executing OS-specific command for ${osType}: ${commandToExecute}`);

            // Get terminal
            const terminal = await this.prepareTerminal();
            if (!terminal) {
                return responseHandler.failure('No terminal available');
            }

            // Send command to terminal
            terminal.sendText(commandToExecute);

            return responseHandler.success({
                osType,
                command: commandToExecute,
                executed: true
            });
        } catch (error) {
            this.log.error('Error executing OS-specific command', error);
            return responseHandler.failure(`Error executing OS-specific command: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
