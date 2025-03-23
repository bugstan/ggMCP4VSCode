import * as vscode from 'vscode';
import * as path from 'path';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { createResponse, formatError } from '../utils/response';
import { normalizePath, toAbsolutePathSafe, toRelativePath } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileSystemTools');

/**
 * Create a new file and populate it with content
 */
export class CreateNewFileWithTextTool extends AbstractMcpTool<ToolParams['createNewFileWithText']> {
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

    async handle(args: ToolParams['createNewFileWithText']): Promise<Response> {
        try {
            const { pathInProject, text } = args;
            log.debug(`Creating new file: ${pathInProject}`);

            // Path normalization and safety check
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                log.warn(`Cannot find project directory for path: ${pathInProject}`);
                return createResponse(null, "can't find project dir");
            }

            // Create URI
            const fileUri = vscode.Uri.file(absolutePath);
            const dirUri = vscode.Uri.file(path.dirname(absolutePath));

            try {
                // Ensure directory exists
                log.debug(`Creating directory: ${path.dirname(absolutePath)}`);
                await vscode.workspace.fs.createDirectory(dirUri);

                // Write file content
                log.debug(`Writing content to file: ${absolutePath}`);
                const encoder = new TextEncoder();
                const bytes = encoder.encode(text);
                await vscode.workspace.fs.writeFile(fileUri, bytes);

                log.info(`Successfully created file: ${absolutePath}`);
                return createResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.error(`Failed to create file: ${absolutePath}`, err);
                return createResponse(null, `Failed to create file: ${formatError(err)}`);
            }
        } catch (error) {
            log.error('Error creating file', error);
            return createResponse(null, `Error creating file: ${formatError(error)}`);
        }
    }
}

/**
 * List files in folder
 */
export class ListFilesInFolderTool extends AbstractMcpTool<ToolParams['listFilesInFolder']> {
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

    async handle(args: ToolParams['listFilesInFolder']): Promise<Response> {
        try {
            const { pathInProject } = args;
            log.debug(`Listing contents of folder: ${pathInProject}`);

            // Path normalization and safety check
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                log.warn('Project directory not found');
                return createResponse(null, 'project dir not found');
            }

            // Create URI
            const dirUri = vscode.Uri.file(absolutePath);

            try {
                // Check if directory exists and is really a directory
                try {
                    const stat = await vscode.workspace.fs.stat(dirUri);
                    if (stat.type !== vscode.FileType.Directory) {
                        log.warn(`Path is not a directory: ${normalizedPath}`);
                        return createResponse(null, `Path is not a directory: ${normalizedPath}`);
                    }
                } catch (err) {
                    log.warn(`Directory does not exist or cannot be accessed: ${normalizedPath}`, err);
                    return createResponse(null, `Directory does not exist or cannot be accessed: ${normalizedPath}`);
                }

                // Read directory contents
                log.debug(`Reading directory contents: ${absolutePath}`);
                const entries = await vscode.workspace.fs.readDirectory(dirUri);

                // Format results
                const result = [];

                for (const [name, fileType] of entries) {
                    try {
                        // Calculate absolute path for each entry
                        const entryAbsPath = path.join(absolutePath, name);

                        // Convert to relative path and normalize separators
                        const entryRelPath = toRelativePath(entryAbsPath) || '';

                        result.push({
                            name: name,
                            type: fileType === vscode.FileType.Directory ? 'directory' : 'file',
                            path: entryRelPath
                        });
                    } catch (entryErr) {
                        // Skip entries that cannot be processed
                        log.warn(`Error processing entry: ${name}`, entryErr);
                    }
                }

                // Sort: directories first, then files, same type sorted by name
                result.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });

                log.debug(`Found ${result.length} items in directory: ${absolutePath}`);
                
                // Special handling for list_files_in_folder response, add newlines
                const jsonWithNewlines = JSON.stringify(result).replace(/},{/g, '},\n{');
                
                // Return formatted JSON string directly, without letting createResponse handle it
                return {
                    status: jsonWithNewlines,
                    error: null
                };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                log.error(`Cannot access path: ${normalizedPath}`, err);
                return createResponse(null, `Cannot access path: ${normalizedPath} (${errorMessage})`);
            }
        } catch (error) {
            log.error('Error listing folder contents', error);
            return createResponse(null, `Error listing folder contents: ${formatError(error)}`);
        }
    }
}