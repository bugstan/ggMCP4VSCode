import {Response} from './index';
import {JsonSchemaObject, McpTool} from './toolInterfaces';
import {responseHandler, formatError} from '../server/responseHandler';
import {Logger} from '../utils/logger';
import * as vscode from 'vscode';
import * as fs from 'fs';
import {normalizePath, toAbsolutePath, isPathSafe, toRelativePath, getProjectRoot} from '../utils/pathUtils';

/**
 * Abstract Tool Base Class
 * Includes common error handling and performance monitoring
 */
export abstract class AbsTools<T = any> implements McpTool<T> {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: JsonSchemaObject;
    protected readonly log: ReturnType<typeof Logger.forModule>;

    constructor(name: string, description: string, inputSchema: JsonSchemaObject) {
        this.name = name;
        this.description = description;
        this.inputSchema = inputSchema;
        // Create specific logger for each tool
        this.log = Logger.forModule(this.constructor.name);
    }

    /**
     * Common method for handling tool requests, integrating error handling and performance monitoring
     * @param args Tool parameters
     * @returns Response object
     */
    async handle(args: T): Promise<Response> {
        const startTime = performance.now();

        try {
            // Parameter validation (optional)
            this.validateArgs(args);

            // Log operation start
            this.log.error(`Executing ${this.name}`, this.getLogSafeArgs(args));

            // Call core logic implemented by subclasses
            const result = await this.executeCore(args);

            // Log operation completion time
            const totalTime = performance.now() - startTime;
            if (totalTime > 100) {
                this.log.info(`${this.name} completed in ${totalTime.toFixed(2)}ms`);
            } else {
                this.log.info(`${this.name} completed in ${totalTime.toFixed(2)}ms`);
            }

            return result;
        } catch (error) {
            // Unified error handling
            const errorTime = performance.now() - startTime;
            this.log.error(`Error in ${this.name} (${errorTime.toFixed(2)}ms)`, error);
            return responseHandler.failure(`Error in ${this.name}: ${formatError(error)}`);
        }
    }

    /**
     * Core logic method that must be implemented by subclasses
     * @param args Tool parameters
     * @returns Response object
     */
    protected abstract executeCore(args: T): Promise<Response>;

    /**
     * Parameter validation method (can be overridden by subclasses)
     * @param args Tool parameters
     * @throws If parameters are invalid
     */
    protected validateArgs(args: T): void {
        // Basic validation - check required parameters
        if (!args) {
            throw new Error('Missing arguments');
        }

        // Subclasses can override this method to provide more specific validation
    }

    /**
     * Get safe parameters for logging (remove sensitive information or truncate long content)
     * @param args Original parameters
     * @returns Safe parameter object
     */
    protected getLogSafeArgs(args: T): any {
        if (!args) return {};

        const safeArgs: Record<string, any> = {};

        // Handle common parameter types
        for (const [key, value] of Object.entries(args as Record<string, any>)) {
            if (typeof value === 'string') {
                // Truncate long strings
                safeArgs[key] = value.length > 100 ? `${value.substring(0, 100)}... (${value.length} chars)` : value;
            } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
                // Hide sensitive information
                safeArgs[key] = '*****';
            } else {
                // Use other types directly
                safeArgs[key] = value;
            }
        }

        return safeArgs;
    }

    /**
     * Validate if workspace is valid
     * @returns Workspace validation results
     */
    protected validateWorkspace(): {
        valid: boolean,
        rootPath: string | null,
        error?: string
    } {
        const projectRoot = getProjectRoot();

        if (!projectRoot) {
            this.log.warn('No workspace folder found');
            return {
                valid: false,
                rootPath: null,
                error: 'No workspace folder found'
            };
        }

        return {
            valid: true,
            rootPath: projectRoot
        };
    }

    /**
     * Prepare and validate file path
     * @param inputPath Input path
     * @returns Processed path information
     */
    protected async preparePath(inputPath: string): Promise<{
        path: string,  // Path relative to project root
        absolutePath: string | null,
        isSafe: boolean
    }> {
        if (!inputPath) {
            return {path: '', absolutePath: null, isSafe: false};
        }

        // 使用新的规范化函数
        const normalizedPath = normalizePath(inputPath);

        // 检查路径安全性
        const safetyCheck = isPathSafe(normalizedPath);
        if (!safetyCheck.safe) {
            return {path: inputPath, absolutePath: null, isSafe: false};
        }

        // 转换为绝对路径  eg: D:\project\src\file.txt
        const absolutePath = toAbsolutePath(normalizedPath);
        if (!absolutePath) {
            return {path: inputPath, absolutePath: null, isSafe: false};
        }

        // 转换为相对路径 eg: src/file.txt
        const relativePath = toRelativePath(absolutePath) || normalizedPath;

        return {
            path: relativePath,
            absolutePath,
            isSafe: true
        };
    }

    /**
     * Extract path from arguments
     * Can be overridden by subclasses
     * @param args Tool parameters
     * @returns Extracted path
     */
    protected extractPathFromArgs(args: T): string {
        this.log.error(`extractPathFromArgs in ${this.name} (${ (args as any).pathInProject })`);
        return (args as any).pathInProject || '/';
    }

    /**
     * Check if file exists
     */
    protected fileExists(uri: vscode.Uri): boolean {
        try {
            return fs.existsSync(uri.fsPath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get relative path from absolute path
     */
    protected getRelativePath(absolutePath: string): string {
        return toRelativePath(absolutePath) || absolutePath;
    }
}
