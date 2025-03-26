import {Response} from './index';
import {AbstractTool} from './absTool';
import {responseHandler} from '../server/responseHandler';
import {withGitRepository, executeGitCommand, escapeShellArg} from '../utils/gitUtils';

/**
 * Base class for Git operation tools
 * Provides Git repository access and command execution functionality
 */
export abstract class AbstractGitTools<T = any> extends AbstractTool<T> {
    /**
     * Core implementation of Git operation logic
     */
    protected async executeCore(args: T): Promise<Response> {
        // Use withGitRepository helper function
        return await withGitRepository(async (repository) => {
            if (!repository) {
                return responseHandler.failure('No Git repository found');
            }

            // Execute specific Git operation
            return await this.executeGitOperation(repository, args);
        });
    }

    /**
     * Execute specific Git operation, to be implemented by subclasses
     */
    protected abstract executeGitOperation(repository: any, args: T): Promise<Response>;

    /**
     * Safely execute Git command
     */
    protected async executeGitCommand(command: string): Promise<{
        stdout: string,
        stderr: string,
        exitCode: number | null
    }> {
        try {
            // return await executeGitCommand(command);
            const result = await executeGitCommand(command);
            return result ?? {
                stdout: '',
                stderr: 'Unknown error: executeGitCommand returned null',
                exitCode: null
            };
        } catch (error) {
            this.log.error(`Error executing Git command: ${command}`, error);
            return {
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                exitCode: -1
            };
        }
    }

    /**
     * Safely escape command arguments
     */
    protected escapeArg(arg: string): string {
        return escapeShellArg(arg);
    }

    /**
     * Get current branch name
     */
    protected getCurrentBranch(repository: any): string | undefined {
        try {
            return repository.state.HEAD?.name;
        } catch (error) {
            this.log.error('Error getting current branch', error);
            return undefined;
        }
    }

    /**
     * Get working tree changes
     */
    protected getWorkingTreeChanges(repository: any): any[] {
        try {
            // Compatible with different API versions
            if (repository.state && repository.state.workingTreeChanges) {
                return repository.state.workingTreeChanges;
            } else if (repository.state && repository.state.changes) {
                return repository.state.changes;
            }
            return [];
        } catch (error) {
            this.log.error('Error getting working tree changes', error);
            return [];
        }
    }

    /**
     * Format Git status to human-readable string
     */
    protected formatGitStatus(statusCode: any): string {
        // If not string type, convert to JSON string for debugging
        if (statusCode !== null && typeof statusCode !== 'string') {
            try {
                // First try using toString method
                if (typeof statusCode.toString === 'function' && statusCode.toString() !== '[object Object]') {
                    return statusCode.toString();
                }
                // If toString is not available or returns [object Object], use JSON.stringify
                const jsonStr = JSON.stringify(statusCode);
                this.log.info(`Non-string status code converted to JSON: ${jsonStr}`);
                return 'UNKNOWN'; // Return a default value instead of the JSON string itself
            } catch (e) {
                this.log.warn(`Failed to convert status code to JSON: ${e}`);
                return 'UNKNOWN';
            }
        }
        
        switch (statusCode.toUpperCase()) {
            case 'MODIFIED':
            case 'M':
                return 'MODIFIED';
            case 'ADDED':
            case 'A':
                return 'ADDED';
            case 'DELETED':
            case 'D':
                return 'DELETED';
            case 'RENAMED':
            case 'R':
                return 'RENAMED';
            case 'COPIED':
            case 'C':
                return 'COPIED';
            case 'UNTRACKED':
            case '?':
                return 'UNTRACKED';
            case 'IGNORED':
            case '!':
                return 'IGNORED';
            case 'CONFLICTED':
            case 'U':
                return 'CONFLICTED';
            default:
                return statusCode;
        }
    }

    /**
     * Parse Git command line output
     */
    protected parseCommandOutput(stdout: string, errorMessage: string = 'Command execution failed'): Response {
        if (!stdout || stdout.trim() === '') {
            return responseHandler.success([]);
        }

        try {
            const lines = stdout.split('\n').filter(line => line.trim() !== '');
            return responseHandler.success(lines);
        } catch (error) {
            this.log.error('Error parsing command output', error);
            return responseHandler.failure(errorMessage);
        }
    }
}