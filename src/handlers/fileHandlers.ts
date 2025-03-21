import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { analyzePath, toRelativePath } from '../utils/pathUtils';
import { FileReloader } from '../utils/fileReloader';
import { getCurrentDirectory } from '../utils/project';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileHandlers');

/**
 * Create a new file and populate it with content
 */
export async function createNewFileWithText(params: { pathInProject: string, text: string }): Promise<Response> {
    try {
        const {pathInProject, text} = params;

        // Use improved path analysis tool
        const pathInfo = analyzePath(pathInProject);
        log.debug('Creating new file', { path: pathInfo.normalized });

        if (!pathInfo.isSafe || !pathInfo.absolute) {
            return errorResponse('Cannot determine file path or path is unsafe');
        }

        // Create URI
        const fileUri = vscode.Uri.file(pathInfo.absolute);
        const dirUri = vscode.Uri.file(path.dirname(pathInfo.absolute));

        try {
            // Ensure directory exists
            await vscode.workspace.fs.createDirectory(dirUri);

            // Write file content
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            await vscode.workspace.fs.writeFile(fileUri, bytes);

            // Open the newly created file
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);

            log.info('File created successfully', { path: pathInfo.absolute });
            return successResponse({
                path: pathInfo.absolute,
                relativePath: pathInfo.relative
            });
        } catch (err) {
            log.error('File creation operation failed', err);
            return errorResponse(`File creation operation failed: ${formatError(err)}`);
        }
    } catch (error) {
        log.error('Error creating file', error);
        return errorResponse(`Error creating file: ${formatError(error)}`);
    }
}

/**
 * Find files by name substring
 */
export async function findFilesByNameSubstring(params: { nameSubstring: string }): Promise<Response> {
    try {
        const {nameSubstring} = params;

        if (!nameSubstring) {
            log.warn('Search string is empty');
            return errorResponse('Search string cannot be empty');
        }

        // Get current working directory
        const currentDir = getCurrentDirectory();
        if (!currentDir) {
            log.warn('Cannot determine search scope');
            return errorResponse('Cannot determine search scope');
        }

        log.debug('Starting file search', { substring: nameSubstring, directory: currentDir });

        // Use VS Code API to search for files
        const files = await vscode.workspace.findFiles('**/*' + nameSubstring + '*');
        log.info(`Search completed, found ${files.length} matching files`);

        // Format results
        const results = files.map(file => {
            const relativePath = toRelativePath(file.fsPath);
            return {
                path: file.fsPath,
                relativePath: relativePath,
                name: path.basename(file.fsPath)
            };
        });

        return successResponse({
            results: results,
            currentDirectory: currentDir
        });
    } catch (error) {
        log.error('Error finding files', error);
        return errorResponse(`Error finding files: ${formatError(error)}`);
    }
}

/**
 * Get file content by path
 */
export async function getFileTextByPath(params: { pathInProject: string }): Promise<Response> {
    try {
        const {pathInProject} = params;
        
        // Use improved path analysis tool
        const pathInfo = analyzePath(pathInProject);
        log.debug('Getting file content', { path: pathInfo.normalized });

        if (!pathInfo.isSafe || !pathInfo.absolute) {
            log.warn('Cannot determine file path or path is unsafe', { path: pathInProject });
            return errorResponse('Cannot determine file path or path is unsafe');
        }

        try {
            // Create URI and read file content
            const fileUri = vscode.Uri.file(pathInfo.absolute);
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = new TextDecoder().decode(content);

            log.debug('File content read', { path: pathInfo.absolute, size: content.byteLength });
            return successResponse({
                content: text,
                path: pathInfo.absolute,
                relativePath: pathInfo.relative
            });
        } catch (err) {
            log.error('File does not exist or cannot be accessed', err, { path: pathInfo.absolute });
            return errorResponse('File does not exist or cannot be accessed');
        }
    } catch (error) {
        log.error('Error getting file content', error);
        return errorResponse(`Error getting file content: ${formatError(error)}`);
    }
}

/**
 * Replace file content by path
 */
export async function replaceFileTextByPath(params: { pathInProject: string, text: string }): Promise<Response> {
    try {
        const {pathInProject, text} = params;
        
        // Use improved path analysis tool
        const pathInfo = analyzePath(pathInProject);
        log.debug('Replacing file content', { path: pathInfo.normalized });

        if (!pathInfo.isSafe || !pathInfo.absolute) {
            log.warn('Cannot determine file path or path is unsafe', { path: pathInProject });
            return errorResponse('Cannot determine file path or path is unsafe');
        }

        // Create URI
        const fileUri = vscode.Uri.file(pathInfo.absolute);

        // Check if file exists
        try {
            await vscode.workspace.fs.stat(fileUri);
        } catch (err) {
            log.error('File does not exist or cannot be accessed', err, { path: pathInfo.absolute });
            return errorResponse('File does not exist or cannot be accessed');
        }

        // Check if file is already open in editor and has unsaved changes
        if (FileReloader.hasUnsavedChanges(pathInfo.absolute)) {
            log.warn('File has unsaved changes', { path: pathInfo.absolute });
            return errorResponse('File has unsaved changes, please save or discard changes before trying to modify');
        }

        try {
            // Write file content
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            await vscode.workspace.fs.writeFile(fileUri, bytes);

            // Reload open file
            await FileReloader.reloadFile(pathInfo.absolute);

            log.info('File content updated', { path: pathInfo.absolute, size: bytes.byteLength });
            return successResponse({
                path: pathInfo.absolute,
                relativePath: pathInfo.relative,
                status: 'File has been updated and reloaded'
            });
        } catch (err) {
            log.error('Cannot modify file content', err, { path: pathInfo.absolute });
            return errorResponse(`Cannot modify file content: ${formatError(err)}`);
        }
    } catch (error) {
        log.error('Error replacing file content', error);
        return errorResponse(`Error replacing file content: ${formatError(error)}`);
    }
}

/**
 * List files in folder
 */
export async function listFilesInFolder(params: { pathInProject: string }): Promise<Response> {
    log.debug(`Starting to process directory request`, { path: params.pathInProject });

    try {
        const {pathInProject} = params;

        // Use improved path analysis tool
        const pathInfo = analyzePath(pathInProject);
        log.debug('Directory info', pathInfo);

        if (!pathInfo.isSafe || !pathInfo.absolute) {
            log.warn('Cannot determine directory path or path is unsafe', { path: pathInProject });
            return errorResponse('Cannot determine directory path or path is unsafe');
        }

        // Create URI
        const dirUri = vscode.Uri.file(pathInfo.absolute);

        try {
            // Check if directory exists and is actually a directory
            try {
                const stat = await vscode.workspace.fs.stat(dirUri);
                if (stat.type !== vscode.FileType.Directory) {
                    log.warn('Path is not a directory', { path: pathInfo.absolute, type: stat.type });
                    return errorResponse(`Path is not a directory: ${pathInfo.normalized}`);
                }
            } catch (err) {
                log.error('Directory does not exist or cannot be accessed', err, { path: pathInfo.absolute });
                return errorResponse(`Directory does not exist or cannot be accessed: ${pathInfo.normalized}`);
            }

            // Read directory contents
            log.debug(`Reading directory contents`, { path: pathInfo.absolute });
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            log.debug(`Directory contents read successfully`, { path: pathInfo.absolute, entryCount: entries.length });

            // Format results
            const result = [];

            for (const [name, fileType] of entries) {
                try {
                    // Calculate absolute path for each entry
                    const entryAbsPath = path.join(pathInfo.absolute, name);

                    // Convert to relative path and unify separators
                    const entryRelPath = toRelativePath(entryAbsPath) || '';

                    result.push({
                        name: name,
                        type: fileType === vscode.FileType.Directory ? 'directory' : 'file',
                        path: entryRelPath
                    });
                } catch (entryErr) {
                    // Skip entries that can't be processed
                    log.warn(`Error processing entry`, { name, error: formatError(entryErr) });
                }
            }

            // Sort: directories first, then files, same type sorted by name
            result.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            log.info(`Successfully processed directory contents`, { path: pathInfo.normalized, entryCount: result.length });

            return successResponse(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            log.error('Failed to read directory contents', err, { path: pathInfo.normalized });
            return errorResponse(`Cannot access path: ${pathInfo.normalized} (${errorMessage})`);
        }
    } catch (error) {
        log.error('Unexpected error occurred during processing', error);
        return errorResponse(`Error listing folder contents: ${formatError(error)}`);
    }
}

/**
 * Search for text in file contents
 */
export async function searchInFilesContent(params: { searchText: string }): Promise<Response> {
    try {
        const {searchText} = params;

        if (!searchText) {
            log.warn('Search text is empty');
            return errorResponse('Search text cannot be empty');
        }

        // Get current working directory
        const currentDir = getCurrentDirectory();
        if (!currentDir) {
            log.warn('Cannot determine search scope');
            return errorResponse('Cannot determine search scope');
        }

        log.debug('Starting content search', { searchText, directory: currentDir });

        // Create storage for search results
        const foundFiles = [];

        try {
            // Use vscode.workspace.findFiles to implement basic text search functionality
            const files = await vscode.workspace.findFiles('**/*');
            log.debug(`Found ${files.length} files to search for content`);

            // Search for text content in found files
            for (const file of files) {
                try {
                    // Read file content
                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();

                    // Check if it contains the search text
                    if (text.includes(searchText)) {
                        foundFiles.push({
                            path: toRelativePath(file.fsPath),
                            name: path.basename(file.fsPath)
                        });
                    }
                } catch (err) {
                    // Ignore errors for individual files, continue processing other files
                    log.warn(`Cannot read file`, { path: file.fsPath, error: formatError(err) });
                }
            }

            log.info(`Search completed, found matches in ${foundFiles.length} files`);
            return successResponse({
                results: foundFiles,
                searchDirectory: currentDir
            });
        } catch (err) {
            log.error('Error executing search', err);
            return errorResponse(`Error executing search: ${err instanceof Error ? err.message : String(err)}`);
        }
    } catch (error) {
        log.error('Error searching file content', error);
        return errorResponse(`Error searching file content: ${formatError(error)}`);
    }
}