import * as vscode from 'vscode';
import * as path from 'path';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { normalizePath, toAbsolutePathSafe, toRelativePath } from '../utils/pathUtils';
import { FileReloader } from '../utils/fileReloader';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileTools');

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
                return errorResponse("can't find project dir");
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
                return successResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.error(`Failed to create file: ${absolutePath}`, err);
                return errorResponse(`Failed to create file: ${formatError(err)}`);
            }
        } catch (error) {
            log.error('Error creating file', error);
            return errorResponse(`Error creating file: ${formatError(error)}`);
        }
    }
}

/**
 * Find files by name substring
 */
export class FindFilesByNameSubstringTool extends AbstractMcpTool<ToolParams['findFilesByNameSubstring']> {
    constructor() {
        super(
            'find_files_by_name_substring',
            'Search for all files in the project whose names contain the specified substring. Returns an array of file information.',
            {
                type: 'object',
                properties: {
                    nameSubstring: { type: 'string' }
                },
                required: ['nameSubstring']
            }
        );
    }

    async handle(args: ToolParams['findFilesByNameSubstring']): Promise<Response> {
        try {
            const { nameSubstring } = args;
            log.debug(`Searching for files containing name substring: ${nameSubstring}`);

            if (!nameSubstring) {
                log.warn('Empty search string provided');
                return errorResponse('Search string cannot be empty');
            }

            // Use VS Code API to search for files
            const files = await vscode.workspace.findFiles('**/*' + nameSubstring + '*');
            log.debug(`Found ${files.length} matching files`);

            // Format results
            const results = files.map(file => {
                return {
                    path: toRelativePath(file.fsPath),
                    name: path.basename(file.fsPath)
                };
            });

            return successResponse(results);
        } catch (error) {
            log.error('Error finding files', error);
            return errorResponse(`Error finding files: ${formatError(error)}`);
        }
    }
}

/**
 * Get file content by path
 */
export class GetFileTextByPathTool extends AbstractMcpTool<ToolParams['getFileTextByPath']> {
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

    async handle(args: ToolParams['getFileTextByPath']): Promise<Response> {
        try {
            const { pathInProject } = args;
            log.debug(`Getting text content for file: ${pathInProject}`);
            
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                log.warn('Project directory not found');
                return errorResponse('project dir not found');
            }

            try {
                // Create URI and read file content
                const fileUri = vscode.Uri.file(absolutePath);
                const content = await vscode.workspace.fs.readFile(fileUri);
                const text = new TextDecoder().decode(content);
                
                log.debug(`Successfully read file content: ${absolutePath}, size: ${text.length} characters`);

                return successResponse({
                    content: text,
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.warn(`File not found: ${absolutePath}`, err);
                return errorResponse('file not found');
            }
        } catch (error) {
            log.error('Error getting file content', error);
            return errorResponse(`Error getting file content: ${formatError(error)}`);
        }
    }
}

/**
 * Replace file content by path
 */
export class ReplaceFileTextByPathTool extends AbstractMcpTool<ToolParams['replaceFileTextByPath']> {
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

    async handle(args: ToolParams['replaceFileTextByPath']): Promise<Response> {
        try {
            const { pathInProject, text } = args;
            log.debug(`Replacing content for file: ${pathInProject}`);
            
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                log.warn('Project directory not found');
                return errorResponse('project dir not found');
            }

            try {
                // Create URI
                const fileUri = vscode.Uri.file(absolutePath);

                // Check if file exists
                try {
                    await vscode.workspace.fs.stat(fileUri);
                    log.debug(`File exists: ${absolutePath}`);
                } catch (err) {
                    log.warn(`File not found: ${absolutePath}`, err);
                    return errorResponse('file not found');
                }

                // Write file content
                log.debug(`Writing new content to file: ${absolutePath}, size: ${text.length} characters`);
                const encoder = new TextEncoder();
                const bytes = encoder.encode(text);
                await vscode.workspace.fs.writeFile(fileUri, bytes);

                // Reload open file if needed
                log.debug(`Reloading file if open: ${absolutePath}`);
                await FileReloader.reloadFile(absolutePath);

                log.info(`Successfully replaced file content: ${absolutePath}`);
                return successResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.error(`Could not get document: ${absolutePath}`, err);
                return errorResponse('could not get document');
            }
        } catch (error) {
            log.error('Error replacing file content', error);
            return errorResponse(`Error replacing file content: ${formatError(error)}`);
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
                return errorResponse('project dir not found');
            }

            // Create URI
            const dirUri = vscode.Uri.file(absolutePath);

            try {
                // Check if directory exists and is really a directory
                try {
                    const stat = await vscode.workspace.fs.stat(dirUri);
                    if (stat.type !== vscode.FileType.Directory) {
                        log.warn(`Path is not a directory: ${normalizedPath}`);
                        return errorResponse(`Path is not a directory: ${normalizedPath}`);
                    }
                } catch (err) {
                    log.warn(`Directory does not exist or cannot be accessed: ${normalizedPath}`, err);
                    return errorResponse(`Directory does not exist or cannot be accessed: ${normalizedPath}`);
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
                
                // Return formatted JSON string directly, without letting successResponse handle it
                return {
                    status: jsonWithNewlines,
                    error: null
                };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                log.error(`Cannot access path: ${normalizedPath}`, err);
                return errorResponse(`Cannot access path: ${normalizedPath} (${errorMessage})`);
            }
        } catch (error) {
            log.error('Error listing folder contents', error);
            return errorResponse(`Error listing folder contents: ${formatError(error)}`);
        }
    }
}

/**
 * Search in files content
 */
export class SearchInFilesContentTool extends AbstractMcpTool<ToolParams['searchInFilesContent']> {
    constructor() {
        super(
            'search_in_files_content',
            'Search for a text substring within all files in the project. Returns an array of file information containing matches.',
            {
                type: 'object',
                properties: {
                    searchText: { type: 'string' }
                },
                required: ['searchText']
            }
        );
    }

    async handle(args: ToolParams['searchInFilesContent']): Promise<Response> {
        try {
            const { searchText } = args;
            log.debug(`Searching for text in files: ${searchText}`);

            if (!searchText) {
                log.warn('Empty search text provided');
                return errorResponse('Search text cannot be empty');
            }

            // Create storage for search results
            const foundFiles = [];

            try {
                // Use vscode.workspace.findFiles to implement basic text search functionality
                const files = await vscode.workspace.findFiles('**/*');
                log.debug(`Found ${files.length} files to search through`);

                // Search for text content in found files
                for (const file of files) {
                    try {
                        // Read file content
                        const document = await vscode.workspace.openTextDocument(file);
                        const text = document.getText();

                        // Check if contains search text
                        if (text.includes(searchText)) {
                            foundFiles.push({
                                path: toRelativePath(file.fsPath)
                            });
                        }
                    } catch (err) {
                        // Ignore errors for individual files, continue processing others
                        log.warn(`Unable to read file ${file.fsPath}`, err);
                    }
                }

                log.info(`Found ${foundFiles.length} files containing the search text`);
                return successResponse(foundFiles);
            } catch (err) {
                log.error('Error executing search', err);
                return errorResponse(`Error executing search: ${err instanceof Error ? err.message : String(err)}`);
            }
        } catch (error) {
            log.error('Error searching in file content', error);
            return errorResponse(`Error searching in file content: ${formatError(error)}`);
        }
    }
}