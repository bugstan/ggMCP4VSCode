import * as vscode from 'vscode';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { createResponse, formatError } from '../utils/response';
import { normalizePath, toAbsolutePathSafe, toRelativePath } from '../utils/pathUtils';
import { FileReloader } from '../utils/fileReloader';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileReadWriteTools');

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
                return createResponse(null, 'project dir not found');
            }

            try {
                // Create URI and read file content
                const fileUri = vscode.Uri.file(absolutePath);
                const content = await vscode.workspace.fs.readFile(fileUri);
                const text = new TextDecoder().decode(content);
                
                log.debug(`Successfully read file content: ${absolutePath}, size: ${text.length} characters`);

                return createResponse({
                    content: text,
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.warn(`File not found: ${absolutePath}`, err);
                return createResponse(null, 'file not found');
            }
        } catch (error) {
            log.error('Error getting file content', error);
            return createResponse(null, `Error getting file content: ${formatError(error)}`);
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
                return createResponse(null, 'project dir not found');
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
                    return createResponse(null, 'file not found');
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
                return createResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                log.error(`Could not get document: ${absolutePath}`, err);
                return createResponse(null, 'could not get document');
            }
        } catch (error) {
            log.error('Error replacing file content', error);
            return createResponse(null, `Error replacing file content: ${formatError(error)}`);
        }
    }
}