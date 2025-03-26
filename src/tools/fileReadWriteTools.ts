import * as vscode from 'vscode';
import { AbstractFileTools } from '../types/absFileTools';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';
import { getDirName, joinPaths } from '../utils/pathUtils';

/**
 * Get file content tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class GetFileTextByPathTool extends AbstractFileTools<ToolParams['getFileTextByPath']> {
    constructor() {
        super(
            'get_file_text_by_path',
            'Get the text content of a file using its path relative to the project root. Returns an error if the file does not exist or is outside the project scope.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    /**
     * Execute file read operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, _args: ToolParams['getFileTextByPath']): Promise<Response> {
        try {
            // Use base class cached file read method
            const text = await this.getFileContent(absolutePath, true);
            this.log.info(`Successfully read file content: ${absolutePath}, size: ${text.length} characters`);

            return responseHandler.success({
                content: text,
                path: absolutePath,
                relativePath: this.getRelativePath(absolutePath)
            });
        } catch (err) {
            this.log.warn(`File not found: ${absolutePath}`, err);
            return responseHandler.failure('file not found');
        }
    }
}

/**
 * Replace file content tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ReplaceFileTextByPathTool extends AbstractFileTools<ToolParams['replaceFileTextByPath']> {
    constructor() {
        super(
            'replace_file_text_by_path',
            'Replace the entire content of a specified project file with new text. Returns an error if the file does not exist or cannot be accessed.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    text: { type: 'string' }
                },
                required: ['pathInProject', 'text']
            }
        );
    }

    /**
     * Execute file replace operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, args: ToolParams['replaceFileTextByPath']): Promise<Response> {
        const { text } = args;

        try {
            // Use optimized file write method
            const { writeTimeMs, size } = await this.writeFileWithPerformanceTracking(
                absolutePath,
                text,
                { reloadAfterWrite: true }
            );

            return responseHandler.success({
                path: absolutePath,
                relativePath: this.getRelativePath(absolutePath),
                size,
                operationTimeMs: writeTimeMs
            });
        } catch (err) {
            this.log.error(`Error writing file: ${absolutePath}`, err);
            return responseHandler.failure(`Error writing file: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/**
 * Create new file tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class CreateNewFileWithTextTool extends AbstractFileTools<ToolParams['createNewFileWithText']> {
    constructor() {
        super(
            'create_new_file_with_text',
            'Create a new file at the specified path in the project directory and populate it with content. Returns an error if project directory cannot be determined.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    text: { type: 'string' }
                },
                required: ['pathInProject', 'text']
            }
        );
    }

    /**
     * Execute file creation operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, args: ToolParams['createNewFileWithText']): Promise<Response> {
        const { text } = args;

        try {
            // Create directory
            await this.measurePerformance(
                'Directory creation',
                async () => {
                    const dirUri = vscode.Uri.file(getDirName(absolutePath));
                    await vscode.workspace.fs.createDirectory(dirUri);
                    return true;
                }
            );

            // Use optimized file write method
            const { writeTimeMs, size } = await this.writeFileWithPerformanceTracking(
                absolutePath,
                text,
                { reloadAfterWrite: false }
            );

            this.log.info(`Successfully created file: ${absolutePath} in ${writeTimeMs}ms of size ${size}`);
            return responseHandler.success({
                path: absolutePath,
                relativePath: this.getRelativePath(absolutePath),
                operationTimeMs: writeTimeMs
            });
        } catch (err) {
            this.log.error(`Failed to create file: ${absolutePath}`, err);
            return responseHandler.failure(`Failed to create file: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/**
 * List folder contents tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ListFilesInFolderTool extends AbstractFileTools<ToolParams['listFilesInFolder']> {
    constructor() {
        super(
            'list_files_in_folder',
            'List all files and directories in the specified project folder. Returns an array of entry information.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    /**
     * Execute directory list operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, _args: ToolParams['listFilesInFolder']): Promise<Response> {
        try {
            // Check if path is a directory
            const dirUri = vscode.Uri.file(absolutePath);
            const stat = await vscode.workspace.fs.stat(dirUri);

            if (stat.type !== vscode.FileType.Directory) {
                this.log.warn(`Path is not a directory: ${absolutePath}`);
                return responseHandler.failure(`Path is not a directory: ${absolutePath}`);
            }

            // Use performance measurement method to read directory contents
            const { result: entries, timeMs } = await this.measurePerformance(
                'Directory read',
                async () => vscode.workspace.fs.readDirectory(dirUri)
            );

            // Format results
            const result = [];
            for (const [name, fileType] of entries) {
                try {
                    // Calculate path for each entry
                    const entryAbsPath = joinPaths(absolutePath, name);
                    const entryRelPath = this.getRelativePath(entryAbsPath);

                    result.push({
                        name: name,
                        type: fileType === vscode.FileType.Directory ? 'directory' : 'file',
                        path: entryRelPath
                    });
                } catch (entryErr) {
                    // Skip entries that cannot be processed
                    this.log.warn(`Error processing entry: ${name}`, entryErr);
                }
            }

            // Sort: directories first, then files, same type sorted by name
            result.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            this.log.info(`Found ${result.length} items in directory: ${absolutePath}, time: ${timeMs.toFixed(2)}ms`);
            return responseHandler.success(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.log.error(`Cannot access path: ${absolutePath}`, err);
            return responseHandler.failure(`Cannot access path: ${absolutePath} (${errorMessage})`);
        }
    }
}
