import path from 'path';
import * as vscode from 'vscode';
import {Logger} from './logger';

// Create a module-specific logger
const log = Logger.forModule('PathUtils');

// Cache project root directory to avoid repeated queries
let cachedProjectRoot: string | null = null;
let cachedProjectRootTimestamp = 0;
const CACHE_TTL = 10000; // 10 seconds cache validity

/**
 * Get project root directory
 * Returns workspace root directory if available, otherwise current file directory
 * @returns Project root path or null
 */
export function getProjectRoot(): string | null {
    // First check if cache is valid
    const now = Date.now();
    if (cachedProjectRoot && (now - cachedProjectRootTimestamp < CACHE_TTL)) {
        return cachedProjectRoot;
    }

    // First try to get workspace root directory
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const firstFolder = workspaceFolders[0];
        if (firstFolder) {
            log.info(`Project root directory from workspace: ${firstFolder.uri.fsPath}`);
            cachedProjectRoot = firstFolder.uri.fsPath;
            cachedProjectRootTimestamp = now;
            return cachedProjectRoot;
        }
    }

    // If no workspace, try to use the directory of the currently open file
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const directory = path.dirname(filePath);
        log.info(`Project root directory from active file: ${directory}`);
        cachedProjectRoot = directory;
        cachedProjectRootTimestamp = now;
        return cachedProjectRoot;
    }

    // No workspace folders and no open files
    log.warn('Cannot determine project root directory: No workspace folders or active files');
    cachedProjectRoot = null;
    cachedProjectRootTimestamp = now;
    return null;
}

/**
 * Normalize path and use / as separator
 * @param inputPath Input path
 * @returns Normalized path
 */
export function normalizePath(inputPath: string): string {
    // Safety check
    if (inputPath === undefined || inputPath === null) return '/';

    // Convert all backslashes to forward slashes
    let normalizedPath = String(inputPath).replace(/\\/g, '/');

    // Use path.normalize to handle ../ and ./ cases, then ensure / is used
    try {
        normalizedPath = path.normalize(normalizedPath).replace(/\\/g, '/');
    } catch (e) {
        log.error('Path normalization error', e);
        return '/'; // Return root path if error occurs
    }

    // Ensure it doesn't end with / (except for root path)
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
    }

    return normalizedPath;
}

/**
 * Check if path is safe and within project
 * Merged original isPathSafe and isPathWithinProject functions
 * @param normalizedPath Already normalized path
 * @param projectRoot Project root directory (optional)
 * @returns Object containing safety and reason
 */
export function isPathSafe(normalizedPath: string, projectRoot?: string | null): {
    safe: boolean;
    withinProject: boolean;
    reason?: string;
} {
    try {
        // Get project root directory (if not provided)
        const root = projectRoot ?? getProjectRoot();

        // Check if path contains potential directory traversal patterns
        const hasDirTraversal = normalizedPath.includes('../') || normalizedPath === '..';

        // Check if within project directory (if project root exists)
        let withinProject = false;
        if (root && path.isAbsolute(normalizedPath)) {
            const normalizedRoot = path.normalize(root).replace(/\\/g, '/');
            withinProject = normalizedPath.startsWith(normalizedRoot);
        }

        if (hasDirTraversal) {
            return {
                safe: false,
                withinProject,
                reason: 'Path contains directory traversal pattern (../)'
            };
        }

        return {
            safe: true,
            withinProject
        };
    } catch (e) {
        log.error('Path safety check error', e);
        return {
            safe: false,
            withinProject: false,
            reason: `Safety check error: ${e instanceof Error ? e.message : String(e)}`
        };
    }
}

/**
 * Convert path to absolute path
 * @param inputPath Input path
 * @returns Absolute path or null
 */
export function toAbsolutePath(inputPath: string): string | null {
    try {
        // Normalize path
        const normalizedPath = normalizePath(inputPath);

        // Get project root directory
        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            log.warn('Cannot determine project root directory');
            return null;
        }

        // Special handling for root path "/"
        if (normalizedPath === '/') {
            return projectRoot;
        }

        // Handle paths starting with / (relative to project root)
        if (normalizedPath.startsWith('/')) {
            return path.join(projectRoot, normalizedPath.slice(1));
        }

        // Handle already absolute paths
        if (path.isAbsolute(normalizedPath)) {
            return normalizedPath;
        }

        // Handle regular relative paths (relative to project root)
        return path.join(projectRoot, normalizedPath);
    } catch (e) {
        log.error('Path conversion error', e);
        return null;
    }
}

/**
 * Convert absolute path to path relative to project root
 * @param absolutePath Absolute path
 * @returns Relative path or null
 */
export function toRelativePath(absolutePath: string): string | null {
    try {
        if (!absolutePath) {
            return null;
        }

        // Normalize absolute path
        const normalizedAbsPath = path.normalize(absolutePath).replace(/\\/g, '/');

        // Get project root directory
        const rootDir = getProjectRoot();
        if (!rootDir) {
            // No reference directory, return normalized absolute path
            return normalizePath(absolutePath);
        }

        const normalizedRoot = path.normalize(rootDir).replace(/\\/g, '/');

        // Check if path is within project directory
        if (normalizedAbsPath.startsWith(normalizedRoot)) {
            // Calculate relative path
            let relativePath = path.relative(normalizedRoot, normalizedAbsPath).replace(/\\/g, '/');

            // Ensure empty relative path returns /
            if (!relativePath) {
                return '/';
            }

            return relativePath;
        } else {
            // Path is not within project directory, return normalized absolute path
            return normalizePath(absolutePath);
        }
    } catch (e) {
        log.error('Relative path conversion error', e);
        return null;
    }
}

/**
 * Determine if path is absolute
 * @param inputPath Input path
 * @returns Whether path is absolute
 */
export function isAbsolutePath(inputPath: string): boolean {
    try {
        return path.isAbsolute(inputPath);
    } catch (e) {
        log.error('Path type check error', e);
        return false;
    }
}

/**
 * Join multiple path segments into a single path
 * @param paths Path segments
 * @returns Joined path
 */
export function joinPaths(...paths: string[]): string {
    try {
        // Filter out empty paths
        const validPaths = paths.filter(p => p && p !== '');
        if (validPaths.length === 0) return '';

        // Join paths and normalize
        return normalizePath(path.join(...validPaths));
    } catch (e) {
        log.error('Path joining error', e);
        return '';
    }
}

/**
 * Get directory name
 * @param inputPath Input path
 * @returns Directory name
 */
export function getDirName(inputPath: string): string {
    try {
        return path.dirname(inputPath);
    } catch (e) {
        log.error('Get directory name error', e);
        return '';
    }
}

/**
 * Get file name
 * @param inputPath Input path
 * @returns File name
 */
export function getFileName(inputPath: string): string {
    try {
        return path.basename(inputPath);
    } catch (e) {
        log.error('Get file name error', e);
        return '';
    }
}