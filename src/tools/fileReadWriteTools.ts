import * as vscode from 'vscode';
import { AbsFileTools } from '../types/absFileTools';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';
import { getDirName, joinPaths } from '../utils/pathUtils';
import { FileCache } from '../server/cache';

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
                    pathInProject: { type: 'string' },
                },
                required: ['pathInProject'],
            }
        );
    }

    /**
     * Execute file read operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        _args: ToolParams['getFileTextByPath']
    ): Promise<Response> {
        try {
            // Use base class cached file read method
            const text = await this.getFileContent(absolutePath, true);
            this.log.info(
                `Successfully read file content: ${absolutePath}, size: ${text.length} characters`
            );

            return responseHandler.success({
                content: text,
                pathInProject: this.getRelativePath(absolutePath),
            });
        } catch (err: unknown) {
            return this.handleFileSystemError(err, absolutePath, 'reading');
        }
    }
}

/**
 * Rewrite file content tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class RewriteFileContentTool extends AbsFileTools<ToolParams['rewriteFileContent']> {
    constructor() {
        super(
            'rewrite_file_content',
            'Replace the entire content of a specified project file with new text. This completely overwrites the file with the provided content.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    text: { type: 'string' },
                },
                required: ['pathInProject', 'text'],
            }
        );
    }

    /**
     * Execute file rewrite operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        args: ToolParams['rewriteFileContent']
    ): Promise<Response> {
        const { text } = args;

        try {
            const fileUri = vscode.Uri.file(absolutePath);

            // Step 1: Complete file operation
            await this.writeFileSimple(fileUri, text, {
                checkExists: true,
                mustExist: true,
                skipCacheUpdate: true, // Skip automatic cache update
            });

            // Step 2: Prepare response to send to client
            const response = responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
                size: text.length,
            });

            // Step 3: Asynchronously update cache and open file
            setTimeout(() => {
                // Update cache
                FileCache.updateCache(absolutePath, text).catch((err: unknown) => {
                    this.log.error(`Error updating cache for file: ${absolutePath}`, err);
                    FileCache.invalidate(absolutePath);
                });

                // Open file in editor
                setTimeout(async () => {
                    this.openFileInEditorTab(fileUri, absolutePath, 'rewrite_file_content');
                }, 0);
            }, 0);

            // Step 4: Return response immediately
            return response;
        } catch (err: unknown) {
            return this.handleFileSystemError(err, absolutePath, 'rewriting');
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
                    text: { type: 'string' },
                },
                required: ['pathInProject', 'text'],
            }
        );
    }

    /**
     * Execute file creation operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        args: ToolParams['createNewFileWithText']
    ): Promise<Response> {
        const { text } = args;

        try {
            // Step 1: Complete file operation
            // Ensure directory exists
            const dirUri = vscode.Uri.file(getDirName(absolutePath));
            await vscode.workspace.fs.createDirectory(dirUri);

            // Write file
            const fileUri = vscode.Uri.file(absolutePath);
            await this.writeFileSimple(fileUri, text, {
                checkExists: true,
                mustExist: false,
                skipCacheUpdate: true, // Skip automatic cache update
            });

            // Step 2: Prepare response to send to client
            const response = responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
            });

            // Step 3: Asynchronously update cache and open file
            setTimeout(() => {
                // Update cache
                FileCache.updateCache(absolutePath, text).catch((err: unknown) => {
                    this.log.error(`Error updating cache for file: ${absolutePath}`, err);
                    FileCache.invalidate(absolutePath);
                });

                // Open file in editor
                setTimeout(async () => {
                    this.openFileInEditorTab(fileUri, absolutePath, 'create_new_file_with_text');
                }, 0);
            }, 0);

            // Step 4: Return response immediately
            return response;
        } catch (err: unknown) {
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
                    pathInProject: { type: 'string' },
                },
                required: ['pathInProject'],
            }
        );
    }

    /**
     * Execute directory list operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        _args: ToolParams['listFilesInFolder']
    ): Promise<Response> {
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
            const { result: entries } = await this.measurePerformance('Directory read', async () =>
                vscode.workspace.fs.readDirectory(dirUri)
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
                        pathInProject: entryRelPath,
                    });
                } catch (entryErr: unknown) {
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
            return responseHandler.success(result);
        } catch (err: unknown) {
            return this.handleFileSystemError(err, absolutePath, 'listing', true);
        }
    }
}

/**
 * Replace file content at specific position tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ReplaceFileContentAtPositionTool extends AbsFileTools<
    ToolParams['replaceFileContentAtPosition']
> {
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
                    offset: { type: 'number', optional: true },
                },
                required: ['pathInProject', 'startLine', 'endLine', 'content'],
            }
        );
    }

    /**
     * Execute file content replacement operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        args: ToolParams['replaceFileContentAtPosition']
    ): Promise<Response> {
        const { startLine, endLine, content, offset = 0 } = args;

        try {
            // Step 1: Complete file operation
            const fileUri = vscode.Uri.file(absolutePath);

            // Read current file content
            const currentContent = await this.readFile(fileUri);
            
            // Detect original line ending format
            const originalLineEnding = currentContent.includes('\r\n') ? '\r\n' : '\n';
            
            // Normalize to LF for processing (preserves line structure)
            const normalizedContent = currentContent.replace(/\r\n/g, '\n');
            const lines = normalizedContent.split('\n');

            // Validate line numbers
            if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                return responseHandler.failure('Invalid line numbers');
            }

            // Convert to 0-based index
            const startIndex = startLine - 1;
            const endIndex = endLine - 1;

            // Adapt the incoming content's line endings to LF for consistent processing
            const adaptedContent = content.replace(/\r\n/g, '\n');

            // Replace content at specified position
            if (startLine === endLine) {
                // Single line replacement
                const lineToModify = lines[startIndex] as string;
                lines[startIndex] = lineToModify.substring(0, offset) +
                    adaptedContent +
                    lineToModify.substring(offset + adaptedContent.length);
            } else {
                // Multi-line replacement
                const newLines = adaptedContent.split('\n');
                lines.splice(startIndex, endIndex - startIndex + 1, ...newLines);
            }

            // Join lines back together with original line ending format
            const newContent = lines.join(originalLineEnding);

            // Write updated content
            await this.writeFileSimple(fileUri, newContent, {
                checkExists: true,
                mustExist: true,
                skipCacheUpdate: true, // Skip automatic cache update
            });

            // Step 2: Prepare response to send to client
            const response = responseHandler.success('ok');

            // Step 3: Asynchronously update cache and open file
            setTimeout(() => {
                // Update cache
                FileCache.updateCache(absolutePath, newContent).catch((err: unknown) => {
                    this.log.error(`Error updating cache for file: ${absolutePath}`, err);
                    FileCache.invalidate(absolutePath);
                });

                // Open file in editor
                setTimeout(async () => {
                    this.openFileInEditorTab(
                        fileUri,
                        absolutePath,
                        'replace_file_content_at_position'
                    );
                }, 0);
            }, 0);

            // Step 4: Return response immediately
            return response;
        } catch (err: unknown) {
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
                    pathInProject: { type: 'string' },
                    content: { type: 'string' },
                },
                required: ['pathInProject', 'content'],
            }
        );
    }

    /**
     * Execute file append operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        args: ToolParams['appendFileContent']
    ): Promise<Response> {
        const { content } = args;

        try {
            // Step 1: Complete file operation
            const fileUri = vscode.Uri.file(absolutePath);

            // Check if file exists
            if (!(await this.fileExists(fileUri))) {
                return responseHandler.failure('File does not exist');
            }

            // Read existing content
            const existingContent = await this.readFile(fileUri);

            // Adapt the new content's line endings to match the existing file
            const adaptedContent = this.adaptLineEndings(existingContent, content);

            // Append new content
            const newContent = existingContent + adaptedContent;

            // Write back to file
            await this.writeFileSimple(fileUri, newContent, {
                checkExists: true,
                mustExist: true,
                skipCacheUpdate: true, // Skip automatic cache update
            });

            // Step 2: Prepare response to send to client
            const response = responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
                size: newContent.length,
            });

            // Step 3: Asynchronously update cache and open file
            setTimeout(() => {
                // Update cache
                FileCache.updateCache(absolutePath, newContent).catch((err: unknown) => {
                    this.log.error(`Error updating cache for file: ${absolutePath}`, err);
                    FileCache.invalidate(absolutePath);
                });

                // Open file in editor
                setTimeout(async () => {
                    this.openFileInEditorTab(fileUri, absolutePath, 'append_file_content');
                }, 0);
            }, 0);

            // Step 4: Return response immediately
            return response;
        } catch (err: unknown) {
            return this.handleFileSystemError(err, absolutePath, 'appending to');
        }
    }
}

/**
 * Replace specific text occurrences in a file
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class ReplaceSpecificTextTool extends AbsFileTools<ToolParams['replaceSpecificText']> {
    constructor() {
        super(
            'replace_specific_text',
            'Replaces specific text occurrences in a file with new text and automatically opens the file after replacement.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    oldText: { type: 'string' },
                    newText: { type: 'string' },
                },
                required: ['pathInProject', 'oldText', 'newText'],
            }
        );
    }

    /**
     * Execute text replacement operation (implementing base class abstract method)
     */
    protected async execute(
        absolutePath: string,
        args: ToolParams['replaceSpecificText']
    ): Promise<Response> {
        const { oldText, newText } = args;

        try {
            const fileUri = vscode.Uri.file(absolutePath);

            // read the file content
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            let currentContent = new TextDecoder().decode(fileData);

            // check line endings
            const originalLineEnding = currentContent.includes('\r\n') ? '\r\n' : '\n';

            // replace line endings for consistency
            currentContent = currentContent.replace(/\r\n|\r/g, '\n');
            const normalizedOldText = oldText.replace(/\r\n|\r/g, '\n');
            const normalizedNewText = newText.replace(/\r\n|\r/g, '\n');

            // build regex for replacement
            const escapedOldText = this.escapeRegExp(normalizedOldText);
            const regex = new RegExp(escapedOldText, 'gs'); // 's' flag for global and dotAll mode

            // search for occurrences of the specified text
            if (!regex.test(currentContent)) {
                this.log.error(
                    `No occurrences of the specified text found in file: ${absolutePath}`
                );
                return responseHandler.failure('no occurrences found');
            }

            // execute replacement
            const newContent = currentContent.replace(regex, normalizedNewText);

            // count the number of replacements
            const replacementCount = (currentContent.match(regex) || []).length;

            // restore original line endings
            const finalContent = newContent.replace(/\n/g, originalLineEnding);

            // write the new content back to the file
            // const encodedNewContent = new TextEncoder().encode(finalContent);
            // await vscode.workspace.fs.writeFile(fileUri, encodedNewContent);

            // write the content back to the file
            await this.writeFileSimple(fileUri, finalContent, {
                checkExists: true,
                mustExist: true,
                skipCacheUpdate: true,
            });

            // make response
            const response = responseHandler.success({
                pathInProject: this.getRelativePath(absolutePath),
                replacedCount: replacementCount,
            });

            // asynchronously update cache and open file in editor
            setTimeout(() => {
                FileCache.updateCache(absolutePath, finalContent).catch((err: unknown) => {
                    this.log.error(`Error updating cache for file: ${absolutePath}`, err);
                    FileCache.invalidate(absolutePath);
                });

                setTimeout(async () => {
                    this.openFileInEditorTab(fileUri, absolutePath, 'replace_specific_text');
                }, 0);
            }, 0);

            return response;
        } catch (error) {
            this.log.error(`Error replacing text: ${error}`);
            return responseHandler.failure('replacement failed');
        }
    }

    /**
     * Escape special characters in a string for use in a regular expression
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
