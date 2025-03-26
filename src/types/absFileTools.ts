import * as vscode from 'vscode';
import * as path from 'path';
import {Response} from './index';
import {AbstractTool} from './absTool';
import {responseHandler} from '../server/responseHandler';
import {normalizePath, toAbsolutePathSafe, isPathWithinProject, toRelativePath} from '../utils/pathUtils';
import {FileOperationPerformance} from '../utils/performanceMonitor';
import {FileCache} from '../server/cache/fileCache';
import {FileReloader} from '../utils/fileReloader';

/**
 * Base class for file operation tools
 * Provides file path handling, security checks, and performance monitoring functionality
 */
export abstract class AbstractFileTools<T extends Record<string, any> = any> extends AbstractTool<T> {
    /**
     * Core implementation of file operation logic
     */
    protected async executeCore(args: T): Promise<Response> {
        const startTime = performance.now();

        // Prepare for file operation
        const {path, absolutePath} = await this.prepareFilePath(args);
        if (!absolutePath) {
            return responseHandler.failure('Invalid file path or project directory not found');
        }

        // Execute specific file operation
        const result = await this.execute(absolutePath, args);

        // Record performance
        const totalTime = performance.now() - startTime;
        this.recordPerformance(path, totalTime);

        return result;
    }

    /**
     * Prepare file path, including path normalization and security checks
     */
    protected async prepareFilePath(args: T): Promise<{ path: string, absolutePath: string | null }> {
        // Extract path from arguments
        const path = this.extractPathFromArgs(args);
        if (!path) {
            return {path: '', absolutePath: null};
        }

        // Normalize path
        const normalizedPath = normalizePath(path);
        const absolutePath = toAbsolutePathSafe(normalizedPath);

        // Security check
        if (absolutePath) {
            const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (projectRoot && !isPathWithinProject(absolutePath, projectRoot)) {
                this.log.warn('Path is outside project directory', {path: absolutePath});
                return {path, absolutePath: null};
            }
        }

        return {path, absolutePath};
    }

    /**
     * Extract path from arguments, can be overridden by subclasses
     * Default implementation extracts pathInProject property
     */
    protected extractPathFromArgs(args: T): string {
        return (args as any).pathInProject || '/';
    }

    /**
     * Execute specific file operation, to be implemented by subclasses
     */
    protected abstract execute(absolutePath: string, args: T): Promise<Response>;

    /**
     * Record performance data
     */
    protected recordPerformance(path: string, timeMs: number): void {
        if (timeMs > 200) {
            this.log.info(`File operation on ${path} took ${timeMs.toFixed(2)}ms`);
            // Record file operation performance (if involves large content)
            if (timeMs > 500) {
                FileOperationPerformance.recordFileWrite(path, 0, timeMs);
            }
        }
    }

    /**
     * Get relative path of file
     */
    protected getRelativePath(absolutePath: string): string {
        return toRelativePath(absolutePath) || absolutePath;
    }

    /**
     * Check if file exists
     */
    protected async fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Read file content
     */
    protected async readFile(uri: vscode.Uri): Promise<string> {
        const data = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder().decode(data);
    }

    /**
     * Write file content
     */
    protected async writeFile(uri: vscode.Uri, content: string): Promise<void> {
        const data = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(uri, data);
    }

    /**
     * Get file content (with cache support)
     */
    protected async getFileContent(absolutePath: string, useCache: boolean = true): Promise<string> {
        if (useCache) {
            return FileCache.getFileContent(absolutePath);
        } else {
            const fileUri = vscode.Uri.file(absolutePath);
            return this.readFile(fileUri);
        }
    }

    /**
     * Invalidate file cache
     */
    protected invalidateCache(absolutePath: string): void {
        FileCache.invalidate(absolutePath);
    }

    /**
     * Check if file is likely to be binary (by extension)
     */
    protected isProbablyBinaryFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const binaryExtensions = [
            '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.zip', '.rar', '.7z', '.tar', '.gz',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.tiff', '.webp',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv'
        ];
        return binaryExtensions.includes(ext);
    }

    /**
     * Performance timing utility method
     */
    protected async measurePerformance<R>(
        operation: string,
        callback: () => Promise<R>,
        logThresholdMs: number = 200
    ): Promise<{ result: R, timeMs: number }> {
        const startTime = performance.now();
        const result = await callback();
        const timeMs = performance.now() - startTime;

        if (timeMs > logThresholdMs) {
            this.log.info(`${operation} took ${timeMs.toFixed(2)}ms`);
        }

        return {result, timeMs};
    }

    /**
     * Write file content with performance tracking
     */
    protected async writeFileWithPerformanceTracking(
        absolutePath: string,
        content: string,
        options?: {
            reloadAfterWrite?: boolean,
            delayReloadMs?: number,
            useCache?: boolean
        }
    ): Promise<{ writeTimeMs: number, size: number }> {
        const startTime = performance.now();
        const textLength = content?.length || 0;
        const isLargeFile = textLength > 1024 * 1024; // Consider files larger than 1MB as large files

        if (isLargeFile) {
            this.log.info(`Processing large file write: ${textLength} characters`);
        }

        // Create URI
        const fileUri = vscode.Uri.file(absolutePath);

        // Check if file exists
        let fileExists = true;
        try {
            await vscode.workspace.fs.stat(fileUri);
        } catch (err) {
            fileExists = false;
        }

        // Encode text and measure performance
        const {timeMs: encodeTimeMs, result: bytes} = await this.measurePerformance(
            'Text encoding',
            async () => new TextEncoder().encode(content),
            100
        );

        this.log.info('Text encoding -- encodeTimeMs:', encodeTimeMs, 'bytes:', bytes);

        // Write file and measure performance
        const {timeMs: writeTimeMs} = await this.measurePerformance(
            'File write',
            async () => vscode.workspace.fs.writeFile(fileUri, bytes),
            200
        );

        // Invalidate cache
        if (options?.useCache !== false) {
            this.invalidateCache(absolutePath);
        }

        // Handle file reload
        if (options?.reloadAfterWrite !== false && fileExists) {
            const delayMs = options?.delayReloadMs || (isLargeFile ? 100 : 10);
            setTimeout(async () => {
                try {
                    const {timeMs: reloadTimeMs, result: reloadSuccess} = await this.measurePerformance(
                        'File reload',
                        async () => FileReloader.reloadFile(absolutePath),
                        200
                    );
                    this.log.info('reloadAfterWrite -- timeMs:', reloadTimeMs, 'reloadSuccess:', reloadSuccess);
                } catch (reloadErr) {
                    this.log.error(`Error reloading file: ${absolutePath}`, reloadErr);
                }
            }, delayMs);
        }

        // Record file write performance data
        const totalTimeMs = performance.now() - startTime;
        FileOperationPerformance.recordFileWrite(absolutePath, textLength, totalTimeMs);

        return {
            writeTimeMs: Math.round(writeTimeMs),
            size: textLength
        };
    }

    /**
     * Process multiple files in parallel
     */
    protected async processFilesInParallel<R>(
        files: vscode.Uri[],
        processor: (file: vscode.Uri) => Promise<R | null>,
        options?: {
            maxConcurrent?: number,
            skipErrors?: boolean
        }
    ): Promise<R[]> {
        const maxConcurrent = options?.maxConcurrent || 10;
        const results: R[] = [];

        // Create task queue
        const queue = [...files];
        const running: Promise<void>[] = [];

        // Process function
        const processNext = async (): Promise<void> => {
            if (queue.length === 0) return;

            const file = queue.shift()!;
            try {
                const result = await processor(file);
                if (result !== null) {
                    results.push(result);
                }
            } catch (err) {
                if (!options?.skipErrors) {
                    throw err;
                }
                this.log.info(`Error processing file ${file.fsPath}: ${err}`);
            }

            // Continue processing next in queue
            return processNext();
        };

        // Start initial parallel tasks
        const startConcurrent = Math.min(maxConcurrent, files.length);
        for (let i = 0; i < startConcurrent; i++) {
            running.push(processNext());
        }

        // Wait for all tasks to complete
        await Promise.all(running);
        return results;
    }
}