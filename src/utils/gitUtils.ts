import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getProjectRoot, toRelativePath } from './pathUtils';
import { Logger } from './logger';

const execAsync = promisify(exec);
const log = Logger.forModule('GitUtils');

/**
 * Get Git API
 * @returns Git API or null
 */
export async function getGitAPI() {
    // Use VS Code API to get git extension
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        log.warn('Git extension not installed');
        return null; // Git extension not installed
    }

    // Ensure Git extension is activated
    if (!gitExtension.isActive) {
        await gitExtension.activate();
    }

    const api = gitExtension.exports.getAPI(1);
    if (!api) {
        log.warn('Failed to get Git API');
        return null;
    }

    log.info('Git API retrieved successfully');
    return api;
}

/**
 * Get current Git repository
 * @returns Git repository or null
 */
export async function getCurrentRepository() {
    const api = await getGitAPI();

    if (!api) {
        return null;
    }

    const repositories = api.repositories;

    if (!repositories || repositories.length === 0) {
        log.warn('No Git repositories found in workspace');
        return null; // No Git repository
    }

    // Get the first repository
    const repo = repositories[0];
    if (repo && repo.rootUri) {
        log.info(`Found Git repository: ${repo.rootUri.fsPath}`);
    } else {
        log.info(`Found Git repository but root URI is not available`);
    }
    return repo;
}

/**
 * Execute Git command
 * @param command Git command
 * @returns Command execution result
 */
export async function executeGitCommand(command: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
}> {
    try {
        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            throw new Error('No project root found');
        }

        log.info(`Executing Git command in ${projectRoot}: ${command}`);
        const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });

        return {
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
        };
    } catch (error) {
        log.error(`Error executing Git command: ${command}`, error);
        return {
            stdout: '',
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: error instanceof Error && 'code' in error ? Number(error.code) : -1,
        };
    }
}

/**
 * Escape shell command arguments
 * @param arg Argument to escape
 * @returns Escaped argument
 */
export function escapeShellArg(arg: string): string {
    return arg.replace(/[\"'\\\\\\n\\r]/g, '\\\\$&');
}

/**
 * Get change status description
 * @param status Change status letter code
 * @returns Status description
 */
export function getChangeStatusDescription(status: string): string {
    switch (status) {
        case 'A':
            return 'ADDED';
        case 'M':
            return 'MODIFIED';
        case 'D':
            return 'DELETED';
        case 'R':
            return 'RENAMED';
        case 'C':
            return 'COPIED';
        case 'U':
            return 'UPDATED';
        default:
            return status;
    }
}

/**
 * Format an error to a string
 * @param error Any error object or value
 * @returns Formatted error string, never undefined
 */
export function formatErrorSafe(error: unknown): string {
    if (error === undefined || error === null) {
        return 'Unknown error';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

/**
 * Execute Git repository operations with proper error handling
 * This is a generic utility that wraps Git operations and handles common errors
 *
 * @param action Function to execute with repository context
 * @returns Result of the action or throws an error
 */
export async function withGitRepository<T>(action: (repository: any) => Promise<T>): Promise<T> {
    try {
        log.info('Starting Git repository operation');

        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            log.warn('No project root found');
            throw new Error('project dir not found');
        }

        const repository = await getCurrentRepository();
        if (!repository) {
            log.warn('No Git repository found for operation');
            throw new Error('No Git repository found');
        }

        return await action(repository);
    } catch (error) {
        log.error('Git operation failed', error);
        // Format error but throw it to let the caller handle it
        const errorMsg: string = formatErrorSafe(error);
        throw new Error(`Git operation failed: ${errorMsg}`);
    }
}

/**
 * Get all available branches
 * @returns List of branches or null
 */
export async function getBranches(): Promise<{ name: string; current: boolean }[] | null> {
    try {
        const result = await executeGitCommand('git branch');
        if (!result || result.exitCode !== 0) {
            return null;
        }

        const branches = result.stdout
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => {
                const current = line.startsWith('*');
                const name = line.replace('*', '').trim();
                return { name, current };
            });

        return branches;
    } catch (error) {
        log.error('Error getting branches', error);
        return null;
    }
}

/**
 * Get Git repository info
 */
export async function getRepoInfo(): Promise<{
    rootPath: string | null;
    currentBranch: string | null;
    remote: string | null;
} | null> {
    const repository = await getCurrentRepository();
    if (!repository) {
        return null;
    }

    try {
        // Handle potential null/undefined rootUri
        let rootPath: string | null = null;
        if (repository.rootUri && repository.rootUri.fsPath) {
            rootPath = repository.rootUri.fsPath;
        }

        // Get current branch - ensure null if undefined
        let currentBranch: string | null = null;
        if (repository.state && repository.state.HEAD && repository.state.HEAD.name) {
            currentBranch = repository.state.HEAD.name;
        }

        // Get remote - ensure null if undefined
        let remote: string | null = null;
        const remoteResult = await executeGitCommand('git remote -v');
        if (remoteResult && remoteResult.exitCode === 0) {
            const remotesLines = remoteResult.stdout.split('\n');
            if (remotesLines.length > 0) {
                // const match = remotesLines[0].match(/^(\\S+)\\s+(\\S+)/);
                const match = remotesLines[0]!.match(/^(\\S+)\\s+(\\S+)/);
                if (match && match.length >= 3 && match[2]) {
                    remote = match[2];
                }
            }
        }

        return { rootPath, currentBranch, remote };
    } catch (error) {
        log.error('Error getting repo info', error);
        return null;
    }
}

/**
 * Get file Git status
 * @param filePath File path
 * @returns Status info
 */
export async function getFileStatus(filePath: string): Promise<{
    isTracked: boolean;
    isModified: boolean;
    isStaged: boolean;
    status: string;
} | null> {
    try {
        const relativePath = toRelativePath(filePath);
        // Fix: Check for null or undefined relativePath
        if (relativePath === null || relativePath === undefined) {
            log.warn(`Could not determine relative path for: ${filePath}`);
            return null;
        }

        const result = await executeGitCommand(
            `git status --porcelain \"${escapeShellArg(relativePath)}\"`
        );
        if (!result || result.exitCode !== 0) {
            return null;
        }

        const statusLine = result.stdout.trim();
        if (!statusLine) {
            // File is tracked and not modified
            return {
                isTracked: true,
                isModified: false,
                isStaged: false,
                status: 'UNMODIFIED',
            };
        }

        // Parse status code (e.g., ' M', 'M ', 'MM', '??', etc.)
        const statusCode = statusLine.substring(0, 2);
        const isTracked = !statusCode.includes('??');
        const isModified =
            statusCode.includes('M') || statusCode.includes('A') || statusCode.includes('D');
        const isStaged = statusCode[0] !== ' ' && statusCode[0] !== '?';

        return {
            isTracked,
            isModified,
            isStaged,
            status: getChangeStatusDescription(statusCode.trim()),
        };
    } catch (error) {
        log.error('Error getting file status', error);
        return null;
    }
}
