import * as vscode from 'vscode';
import { AbsFileTools } from '../types/absFileTools';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';
import { getDirName, joinPaths } from '../utils/pathUtils';
import { CacheManager } from '../utils/cacheManager';

// Create file cache instance
const fileCache = new CacheManager<string>();

/**
 * Get file content tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class GetFileTextByPathTool extends AbsFileTools<ToolParams['getFileTextByPath']> {
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
                pathInProject: this.getRelativePath(absolutePath)
            });
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'reading');
        }
    }
}

/**
 * Replace file content tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ReplaceFileTextByPathTool extends AbsFileTools<ToolParams['replaceFileTextByPath']> {
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
            const fileUri = vscode.Uri.file(absolutePath);
            await this.writeFileSimple(fileUri, text, {
                checkExists: true,
                mustExist: true
            });

            return responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
                size: text.length
            });
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'writing');
        }
    }
}

/**
 * Create new file tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class CreateNewFileWithTextTool extends AbsFileTools<ToolParams['createNewFileWithText']> {
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
            // Ensure directory exists
            const dirUri = vscode.Uri.file(getDirName(absolutePath));
            await vscode.workspace.fs.createDirectory(dirUri);

            // Write file
            const fileUri = vscode.Uri.file(absolutePath);
            await this.writeFileSimple(fileUri, text, {
                checkExists: true,
                mustExist: false
            });

            return responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath)
            });
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'creating');
        }
    }
}

/**
 * List folder contents tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ListFilesInFolderTool extends AbsFileTools<ToolParams['listFilesInFolder']> {
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
            // Check if path is safe and within project directory
            const { isSafe } = await this.preparePath(absolutePath);
            if (!isSafe) {
                return responseHandler.failure('Path is outside project directory');
            }

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
                        pathInProject: entryRelPath
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
            return this.handleFileSystemError(err, absolutePath, 'listing', true);
        }
    }
}

/**
 * Replace file content at specific position tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ReplaceFileContentAtPositionTool extends AbsFileTools<ToolParams['replace_file_content_at_position']> {
    constructor() {
        super(
            'replace_file_content_at_position',
            'Replace a portion of file content at specified line positions. This tool allows replacing content between specific lines in a file, optionally with a character offset within the line. The replacement is precise and only affects the specified range, leaving the rest of the file unchanged.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    startLine: { type: 'number' },
                    endLine: { type: 'number' },
                    content: { type: 'string' },
                    offset: { type: 'number', optional: true }
                },
                required: ['pathInProject', 'startLine', 'endLine', 'content']
            }
        );
    }

    /**
     * Execute file content replacement operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, args: ToolParams['replace_file_content_at_position']): Promise<Response> {
        const { startLine, endLine, content, offset = 0 } = args;

        try {
            const fileUri = vscode.Uri.file(absolutePath);

            // Read current file content
            const currentContent = await this.readFile(fileUri);
            const lines = currentContent.split('\n');

            // Validate line numbers
            if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                return responseHandler.failure('Invalid line numbers');
            }

            // Convert to 0-based index
            const startIndex = startLine - 1;
            const endIndex = endLine - 1;

            // Replace content at specified position
            if (startLine === endLine) {
                // Single line replacement
                const lineToModify = lines[startIndex] as string;
                const newLine = lineToModify.substring(0, offset) + content + lineToModify.substring(offset + content.length);
                lines[startIndex] = newLine;
            } else {
                // Multi-line replacement
                const newLines = content.split('\n');
                lines.splice(startIndex, endIndex - startIndex + 1, ...newLines);
            }

            // Join lines back together
            const newContent = lines.join('\n');

            // Write updated content
            await this.writeFileSimple(fileUri, newContent, {
                checkExists: true,
                mustExist: true
            });

            return responseHandler.success('ok');
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'replacing content in');
        }
    }
}

/**
 * Append content to file tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class AppendFileContentTool extends AbsFileTools<ToolParams['appendFileContent']> {
    constructor() {
        super(
            'append_file_content',
            'Append content to the end of a file. Returns an error if the file does not exist or cannot be accessed.',
            {
                type: 'object',
                properties: {
                    pathInProject: {type: 'string'},
                    content: {type: 'string'}
                },
                required: ['pathInProject', 'content']
            }
        );
    }

    /**
     * Execute file append operation (implementing base class abstract method)
     */
    protected async execute(absolutePath: string, args: ToolParams['appendFileContent']): Promise<Response> {
        const {content} = args;

        try {
            const fileUri = vscode.Uri.file(absolutePath);

            // Check if file exists
            if (!(await this.fileExists(fileUri))) {
                return responseHandler.failure('File does not exist');
            }

            // Read existing content
            const existingContent = await this.readFile(fileUri);

            // Append new content
            const newContent = existingContent + content;

            // Write back to file
            await this.writeFileSimple(fileUri, newContent, {
                checkExists: true,
                mustExist: true
            });

            // Handle cache update asynchronously
            setImmediate(() => {
                fileCache.delete(absolutePath);
            });

            return responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
                size: newContent.length
            });
        } catch (err) {
            return this.handleFileSystemError(err, absolutePath, 'appending to');
        }
    }
}
