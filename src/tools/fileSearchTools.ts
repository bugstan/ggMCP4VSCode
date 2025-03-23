import * as vscode from 'vscode';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { createResponse, formatError } from '../utils/response';
import { toRelativePath } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileSearchTools');

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
                return createResponse(null, 'Search text cannot be empty');
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
                return createResponse(foundFiles);
            } catch (err) {
                log.error('Error executing search', err);
                return createResponse(null, `Error executing search: ${err instanceof Error ? err.message : String(err)}`);
            }
        } catch (error) {
            log.error('Error searching in file content', error);
            return createResponse(null, `Error searching in file content: ${formatError(error)}`);
        }
    }
}