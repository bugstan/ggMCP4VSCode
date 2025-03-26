import path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('PathUtils');

// Cache for project root to avoid repeated queries
let cachedProjectRoot: string | null = null;
let cachedProjectRootTimestamp = 0;
const CACHE_TTL = 10000; // 10 seconds TTL

/**
 * Interface representing path resolution result
 */
export interface PathResult {
    /** Original path */
    original: string;
    /** Normalized path */
    normalized: string;
    /** Absolute path */
    absolute: string | null;
    /** Relative path (relative to project root) */
    relative: string | null;
    /** Whether the path is safe (does not contain directory traversal) */
    isSafe: boolean;
    /** Whether the path is within project directory */
    isWithinProject: boolean;
    /** Whether it's a directory */
    isDirectory: boolean;
    /** Error message (if any) */
    error: string | null;
}

// Cache recent path resolution results to avoid repeated calculations
const pathCache = new Map<string, PathResult>();
const CACHE_SIZE_LIMIT = 100;

/**
 * Get project root directory
 * Returns workspace root directory if available, otherwise returns current file directory
 * @returns Project root path or null
 */
export function getProjectRoot(): string | null {
    // Check cache first if not expired
    const now = Date.now();
    if (cachedProjectRoot && (now - cachedProjectRootTimestamp < CACHE_TTL)) {
        return cachedProjectRoot;
    }

    // First try to get workspace root directory
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        // Ensure safe access
        const firstFolder = workspaceFolders[0];
        if (firstFolder) {
            log.info(`Project root from workspace: ${firstFolder.uri.fsPath}`);
            cachedProjectRoot = firstFolder.uri.fsPath;
            cachedProjectRootTimestamp = now;
            return cachedProjectRoot;
        }
    }

    // If no workspace, try using current open file directory
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const directory = path.dirname(filePath);
        log.info(`Project root from active file: ${directory}`);
        cachedProjectRoot = directory;
        cachedProjectRootTimestamp = now;
        return cachedProjectRoot;
    }

    // No workspace and no open file
    log.warn('Could not determine project root: no workspace folders or active files');
    cachedProjectRoot = null;
    cachedProjectRootTimestamp = now;
    return null;
}

/**
 * Get current active file
 * @returns Active file path or null
 */
export function getActiveFile(): string | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        log.info(`Active file: ${activeEditor.document.uri.fsPath}`);
        return activeEditor.document.uri.fsPath;
    }

    log.info('No active file found');
    return null;
}

/**
 * Get current working directory
 * Prioritizes workspace root directory, falls back to current file directory
 * @returns Current working directory or null
 */
export function getCurrentDirectory(): string | null {
    // First try to get workspace root directory
    const workspaceRoot = getProjectRoot();
    if (workspaceRoot) {
        return workspaceRoot;
    }

    // If no workspace, use current open file directory
    const activeFile = getActiveFile();
    if (activeFile) {
        const directory = path.dirname(activeFile);
        log.info(`Current directory from active file: ${directory}`);
        return directory;
    }

    log.warn('Could not determine current directory');
    return null;
}

/**
 * Generate UUID
 * @returns UUID string
 */
export function uuid(): string {
    const generatedUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    log.info(`Generated UUID: ${generatedUuid}`);
    return generatedUuid;
}

/**
 * Clear path cache
 */
export function clearPathCache(): void {
    pathCache.clear();
    // Also clear project root cache
    cachedProjectRoot = null;
    cachedProjectRootTimestamp = 0;
    log.info('Path cache cleared');
}

/**
 * Normalize path and unify using / as separator
 * @param inputPath Input path
 * @returns Normalized path
 */
export function normalizePath(inputPath: string): string {
    // Safety check
    if (inputPath === undefined || inputPath === null) return '/';

    // Convert all backslashes to forward slashes
    let normalizedPath = String(inputPath).replace(/\\/g, '/');

    // Use path.normalize to handle ../ and ./ cases, then ensure using / again
    try {
        normalizedPath = path.normalize(normalizedPath).replace(/\\/g, '/');
    } catch (e) {
        log.error('Path normalization error', e);
        return '/'; // Return root path if error occurs
    }

    // Ensure not ending with / (unless it's the root path)
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
    }

    return normalizedPath;
}

/**
 * Check if path is safe (doesn't contain path traversal)
 * @param normalizedPath Already normalized path
 * @returns Whether it's safe
 */
export function isPathSafe(normalizedPath: string): boolean {
    try {
        // Check if path contains "../" or equals ".." (which could lead to directory traversal)
        return !(normalizedPath.includes('../') || normalizedPath === '..');
    } catch (e) {
        log.error('Path safety check error', e);
        return false; // Consider path unsafe if error occurs
    }
}

/**
 * Check if path is within project directory, preventing path traversal attacks
 * @param absolutePath Absolute path to check
 * @param projectRoot Project root directory
 * @returns Whether path is within project directory
 */
export function isPathWithinProject(absolutePath: string, projectRoot: string): boolean {
    try {
        if (!absolutePath || !projectRoot) return false;

        const normalizedPath = path.normalize(absolutePath);
        const normalizedRoot = path.normalize(projectRoot);

        // Check if normalized path starts with project root directory
        return normalizedPath.startsWith(normalizedRoot);
    } catch (e) {
        log.error('Directory check error', e);
        return false; // Consider path unsafe if error occurs
    }
}

/**
 * Convert relative path to absolute path
 * @param relativePath Relative path (normalized)
 * @returns Absolute path or null
 */
export function toAbsolutePath(relativePath: string): string | null {
    try {
        // If already absolute path, return directly
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }

        // Try to resolve using project root directory
        const projectRoot = getProjectRoot();
        if (projectRoot) {
            return path.join(projectRoot, relativePath);
        }

        // Try to resolve using current directory
        const currentDir = getCurrentDirectory();
        if (currentDir) {
            return path.join(currentDir, relativePath);
        }

        // Unable to resolve
        log.warn('Unable to resolve path, missing project root and current directory reference', { relativePath });
        return null;
    } catch (e) {
        log.error('Path conversion error', e);
        return null;
    }
}

/**
 * Convert absolute path to project relative path
 * @param absolutePath Absolute path
 * @returns Relative path or null
 */
export function toRelativePath(absolutePath: string): string | null {
    try {
        if (!absolutePath) return null;

        // Get project root directory or current directory
        const rootDir = getProjectRoot() || getCurrentDirectory();
        if (!rootDir) {
            // No reference directory, return absolute path (normalized)
            return normalizePath(absolutePath);
        }

        // Normalize paths
        const normalizedAbsPath = path.normalize(absolutePath);
        const normalizedRoot = path.normalize(rootDir);

        // Check if path is within reference directory
        if (normalizedAbsPath.startsWith(normalizedRoot)) {
            // Calculate relative path
            let relativePath = path.relative(normalizedRoot, normalizedAbsPath).replace(/\\/g, '/');

            // Ensure root directory returns /
            if (!relativePath) {
                return '/';
            }

            return relativePath;
        } else {
            // Path not within reference directory, return absolute path (normalized)
            return normalizePath(absolutePath);
        }
    } catch (e) {
        log.error('Relative path conversion error', e);
        return null;
    }
}

/**
 * Fully analyze path, including normalization, safety check, path conversion etc.
 * Uses cache to avoid repeated calculations
 * @param inputPath Input path
 * @param forceNoCache Force not to use cache
 * @returns Path resolution result
 */
export function analyzePath(inputPath: string, forceNoCache = false): PathResult {
    try {
        // If cache is available and not forcibly disabled, try to use cache
        if (!forceNoCache && pathCache.has(inputPath)) {
            const cachedResult = pathCache.get(inputPath);
            if (cachedResult) {
                log.info('Using path cache', { path: inputPath });
                return cachedResult;
            }
        }

        // Initialize result object
        const result: PathResult = {
            original: inputPath,
            normalized: '',
            absolute: null,
            relative: null,
            isSafe: false,
            isWithinProject: false,
            isDirectory: false,
            error: null
        };

        // Normalize path
        result.normalized = normalizePath(inputPath);
        log.info('Normalized path', { original: inputPath, normalized: result.normalized });

        // Safety check
        result.isSafe = isPathSafe(result.normalized);
        if (!result.isSafe) {
            result.error = 'Unsafe path, may contain directory traversal';
            log.warn('Path safety check failed', { path: result.normalized });
            return updateCache(result);
        }

        // Special handling for root path "/"
        if (result.normalized === '/') {
            const projectRoot = getProjectRoot();
            if (projectRoot) {
                result.absolute = projectRoot;
                result.relative = '/';
                result.isWithinProject = true;
                result.isDirectory = true;
                log.info('Resolved root path "/"', { absolute: result.absolute });
                return updateCache(result);
            } else {
                result.error = 'Cannot resolve root path, missing project context';
                log.warn('Cannot resolve root path, missing project context');
                return updateCache(result);
            }
        }

        // Resolve absolute path
        result.absolute = toAbsolutePath(result.normalized);
        if (!result.absolute) {
            result.error = 'Cannot resolve absolute path';
            log.warn('Cannot resolve absolute path', { normalized: result.normalized });
            return updateCache(result);
        }

        // Check if path is within project directory
        const projectRoot = getProjectRoot();
        if (projectRoot) {
            result.isWithinProject = isPathWithinProject(result.absolute, projectRoot);
        }

        // If path is within project, calculate relative path
        if (result.isWithinProject) {
            result.relative = toRelativePath(result.absolute);
        }

        // Simple inference whether it's a directory (based on path ending)
        // Note: More accurate check should use file system API, but this requires async operation
        result.isDirectory = result.normalized.endsWith('/') || result.original.endsWith('/') || result.original.endsWith('\\');

        // Cache and return result
        return updateCache(result);
    } catch (e) {
        log.error('Path analysis error', e, { path: inputPath });

        // Return result with error
        const errorResult: PathResult = {
            original: inputPath,
            normalized: inputPath,
            absolute: null,
            relative: null,
            isSafe: false,
            isWithinProject: false,
            isDirectory: false,
            error: e instanceof Error ? e.message : String(e)
        };
        return errorResult; // Don't cache errors
    }
}

/**
 * Update path cache and return result
 * @param result Path resolution result
 * @returns Input result (for chaining)
 */
function updateCache(result: PathResult): PathResult {
    // Simple cache eviction strategy: clear entire cache when size exceeds limit
    if (pathCache.size >= CACHE_SIZE_LIMIT) {
        log.info('Path cache reached limit, clearing cache');
        pathCache.clear();
    }

    // Cache result
    pathCache.set(result.original, result);
    return result;
}

/**
 * Convert project relative path to absolute path, with safety check
 * Returns null if path conversion fails or is unsafe
 * @param pathInProject Project relative path
 * @returns Absolute path or null
 */
export function toAbsolutePathSafe(pathInProject: string): string | null {
    const pathResult = analyzePath(pathInProject);

    if (pathResult.error || !pathResult.isSafe) {
        log.warn('Path unsafe or resolution error', { path: pathInProject, error: pathResult.error });
        return null;
    }

    return pathResult.absolute;
}

/**
 * Check if path is absolute
 * @param inputPath Input path to check
 * @returns Whether the path is absolute
 */
export function isAbsolutePath(inputPath: string): boolean {
    try {
        return path.isAbsolute(inputPath);
    } catch (e) {
        log.error('Path absolute check error', e);
        return false;
    }
}

/**
 * Get directory name from path
 * @param inputPath Input path
 * @returns Directory name
 */
export function getDirName(inputPath: string): string {
    try {
        return path.dirname(inputPath);
    } catch (e) {
        log.error('Error getting directory name', e);
        return '';
    }
}

/**
 * Get file name from path
 * @param inputPath Input path
 * @returns File name
 */
export function getFileName(inputPath: string): string {
    try {
        return path.basename(inputPath);
    } catch (e) {
        log.error('Error getting file name', e);
        return '';
    }
}

/**
 * Extend path object with utility methods
 * @param inputPath Input path
 * @returns Path helper object with utility methods
 */
export function createPathHelper(inputPath: string) {
    const pathResult = analyzePath(inputPath);

    return {
        ...pathResult,
        /**
         * Get normalized path
         */
        getNormalized(): string {
            return pathResult.normalized;
        },

        /**
         * Get absolute path (if available)
         */
        getAbsolute(): string | null {
            return pathResult.absolute;
        },

        /**
         * Get relative path (if available)
         */
        getRelative(): string | null {
            return pathResult.relative;
        },

        /**
         * Whether path is safe
         */
        isSafe(): boolean {
            return pathResult.isSafe;
        },

        /**
         * Whether path is within project directory
         */
        isWithinProject(): boolean {
            return pathResult.isWithinProject;
        },

        /**
         * Whether path is valid (safe and can resolve absolute path)
         */
        isValid(): boolean {
            return pathResult.isSafe && pathResult.absolute !== null;
        },

        /**
         * Get filename part
         */
        getFileName(): string {
            return pathResult.absolute ? path.basename(pathResult.absolute) : '';
        },

        /**
         * Get extension
         */
        getExtension(): string {
            return pathResult.absolute ? path.extname(pathResult.absolute) : '';
        },

        /**
         * Get directory name
         */
        getDirName(): string {
            return getDirName(pathResult.absolute || inputPath);
        }
    };
}

/**
 * Join multiple paths safely
 * @param paths Paths to join
 * @returns Joined path
 */
export function joinPaths(...paths: string[]): string {
    try {
        // Filter out empty or undefined paths
        const validPaths = paths.filter(p => p && p !== '');
        if (validPaths.length === 0) return '';

        // Join paths and normalize
        return normalizePath(path.join(...validPaths));
    } catch (e) {
        log.error('Error joining paths', e);
        return '';
    }
}
