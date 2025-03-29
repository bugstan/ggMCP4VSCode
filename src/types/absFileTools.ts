import * as vscode from 'vscode';
import {Response} from './index';
import {AbsTools} from './absTools';
import {responseHandler} from '../server/responseHandler';
import {FileOperationPerformance} from '../utils/performanceMonitor';
import {FileCache} from '../server/cache/fileCache';
import {FileReloader} from '../utils/fileReloader';
import path from 'path';
import {EventEmitter} from 'events';

/**
 * Base class for file operation tools
 * Provides file path handling, security checks, and performance monitoring functionality
 */
export abstract class AbsFileTools<T extends Record<string, any> = any> extends AbsTools<T> {
    // Add static encoder instances
    private static readonly textEncoder = new TextEncoder();
    private static readonly textDecoder = new TextDecoder();
    protected eventEmitter: EventEmitter;

    constructor(
        name: string,
        description: string,
        parameters: any
    ) {
        super(name, description, parameters);
        this.eventEmitter = new EventEmitter();
    }

    /**
     * Emit an event
     */
    protected emit(event: string, data: any): void {
        this.eventEmitter.emit(event, data);
    }

    /**
     * Add event listener
     */
    public on(event: string, listener: (data: any) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Remove event listener
     */
    public off(event: string, listener: (data: any) => void): void {
        this.eventEmitter.off(event, listener);
    }

    /**
     * Core implementation of file operation logic
     */
    protected async executeCore(args: T): Promise<Response> {
        const startTime = performance.now();

        const pathArg = this.extractPathFromArgs(args);
        this.log.error(`executeCore extractPathFromArgs 路径: ${pathArg}`);

        // Use base class path handling
        const {path, absolutePath, isSafe} = await this.preparePath(pathArg);
        this.log.error(`executeCore 绝对路径: ${absolutePath}`);

        if (!absolutePath || !isSafe) {
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
     * Read file content
     */
    protected async readFile(uri: vscode.Uri): Promise<string> {
        const data = await vscode.workspace.fs.readFile(uri);
        return AbsFileTools.textDecoder.decode(data);
    }

    /**
     * Write file content with minimal overhead
     */
    protected async writeFileSimple(
        uri: vscode.Uri,
        content: string,
        options?: {
            checkExists?: boolean,
            mustExist?: boolean
        }
    ): Promise<void> {
        try {
            // Check file existence if needed
            if (options?.checkExists) {
                const exists = this.fileExists(uri);
                if (options.mustExist && !exists) {
                    throw new Error('File does not exist');
                }
                if (!options.mustExist && exists) {
                    throw new Error('File already exists');
                }
            }

            // Write file content
            const data = AbsFileTools.textEncoder.encode(content);
            await vscode.workspace.fs.writeFile(uri, data);

            // Handle cache update and file reload asynchronously
            setImmediate(() => {
                // Update cache with new content
                FileCache.updateCache(uri.fsPath, content).catch(err => {
                    this.log.error(`Error updating cache for file: ${uri.fsPath}`, err);
                    // If cache update fails, invalidate the cache to ensure consistency
                    FileCache.invalidate(uri.fsPath);
                });

                // Reload file in editor
                FileReloader.reloadFile(uri.fsPath).catch(err => {
                    this.log.error(`Error reloading file: ${uri.fsPath}`, err);
                });
            });
        } catch (error) {
            // If file write fails, invalidate the cache
            FileCache.invalidate(uri.fsPath);
            throw error;
        }
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
     * Handle file system errors with specific error messages
     * @param error The error object
     * @param absolutePath The file path where the error occurred
     * @param operation The operation that failed (e.g., 'reading', 'writing', 'deleting')
     * @param isDirectory Whether the operation was on a directory
     * @returns Response with appropriate error message
     */
    protected handleFileSystemError(
        error: unknown,
        absolutePath: string,
        operation: string = 'accessing',
        isDirectory: boolean = false
    ): Response {
        const itemType = isDirectory ? 'directory' : 'file';
        this.log.error(`Error ${operation} ${itemType}: ${absolutePath}`, error);

        if (error instanceof vscode.FileSystemError) {
            switch (error.code) {
                case 'FileNotFound':
                    return responseHandler.failure(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} does not exist`);
                case 'NoPermissions':
                    return responseHandler.failure(`No permission to ${operation} the ${itemType}`);
                case 'FileIsADirectory':
                    return isDirectory
                        ? responseHandler.failure(`Internal error: Unexpected FileIsADirectory error`)
                        : responseHandler.failure(`Cannot ${operation} a directory as a file. Use the appropriate directory tool instead.`);
                case 'FileNotADirectory':
                    return isDirectory
                        ? responseHandler.failure(`Cannot ${operation} a file as a directory. Use the appropriate file tool instead.`)
                        : responseHandler.failure(`Internal error: Unexpected FileNotADirectory error`);
                case 'FileIsLocked':
                    return responseHandler.failure(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} is locked by another process`);
                case 'FileExists':
                    return responseHandler.failure(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} already exists`);
                default:
                    return responseHandler.failure(`File system error: ${error.message}`);
            }
        }

        return responseHandler.failure(`Error ${operation} ${itemType}: ${error instanceof Error ? error.message : String(error)}`);
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
            async () => AbsFileTools.textEncoder.encode(content),
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

    protected async writeFileWithResponse(
        absolutePath: string,
        content: string,
        options: {
            createDirectory?: boolean,
            mustExist?: boolean,
            includeSize?: boolean
        } = {}
    ): Promise<Response> {
        try {
            const fileUri = vscode.Uri.file(absolutePath);

            // Create directory if needed
            if (options.createDirectory) {
                const dirUri = vscode.Uri.file(path.dirname(absolutePath));
                await vscode.workspace.fs.createDirectory(dirUri);
            }

            // Write file
            await this.writeFileSimple(fileUri, content, {
                checkExists: true,
                mustExist: options.mustExist
            });

            // Build result
            const result: any = {
                path: absolutePath,
            };
            if (options.includeSize) {
                result.size = content.length;
            }

            return responseHandler.success(result);
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'writing');
        }
    }
}
