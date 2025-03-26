import * as vscode from 'vscode';
import * as path from 'path';
import {AbstractFileTools} from '../types/absFileTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';

/**
 * File content search tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class SearchInFilesContentTool extends AbstractFileTools<ToolParams['searchInFilesContent']> {
    constructor() {
        super(
            'search_in_files_content',
            'Search for a text substring within all files in the project using IntelliJ\'s search engine. Returns an array of file information containing matches.',
            {
                type: 'object',
                properties: {
                    searchText: {type: 'string'}
                },
                required: ['searchText']
            }
        );
    }

    /**
     * Execute file search operation (implementing base class abstract method)
     */
    protected async execute(_absolutePath: string, args: ToolParams['searchInFilesContent']): Promise<Response> {
        const {searchText} = args;

        if (!searchText) {
            this.log.warn('Empty search text provided');
            return responseHandler.failure('Search text cannot be empty');
        }

        try {
            // Use VS Code's search API
            const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);

            // Use base class parallel processing method to handle files
            const foundFiles = await this.processFilesInParallel(
                files,
                async (file) => {
                    try {
                        // Check if file exists
                        if (!(await this.fileExists(file))) return null;

                        // Exclude potential binary files
                        if (this.isProbablyBinaryFile(file.fsPath)) return null;

                        // Read file content
                        const content = await this.readFile(file);

                        // Search for text
                        return content.includes(searchText) ? file.fsPath : null;
                    } catch (err) {
                        // Skip files that cannot be read
                        this.log.info(`Skipping file ${file.fsPath}: ${err}`);
                        return null;
                    }
                },
                {skipErrors: true, maxConcurrent: 20}
            );

            // Filter out null results and convert to response format
            const formattedResults = foundFiles
                .filter(Boolean)
                .map(filePath => ({
                    path: this.getRelativePath(filePath),
                    absolutePath: filePath
                }));

            this.log.info(`Found ${formattedResults.length} files containing the search text`);
            return responseHandler.success(formattedResults);
        } catch (err) {
            this.log.error('Error executing search', err);
            return responseHandler.failure(`Error executing search: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/**
 * Find files by name substring tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class FindFilesByNameSubstringTool extends AbstractFileTools<ToolParams['findFilesByNameSubstring']> {
    constructor() {
        super(
            'find_files_by_name_substring',
            'Search for all files in the project whose names contain the specified substring. Returns an array of file information.',
            {
                type: 'object',
                properties: {
                    nameSubstring: {type: 'string'}
                },
                required: ['nameSubstring']
            }
        );
    }

    /**
     * Execute file find operation (implementing base class abstract method)
     */
    protected async execute(_absolutePath: string, args: ToolParams['findFilesByNameSubstring']): Promise<Response> {
        const {nameSubstring} = args;

        if (!nameSubstring) {
            this.log.warn('Empty search string provided');
            return responseHandler.failure('Search string cannot be empty');
        }

        try {
            // Use performance measurement method
            const {result: files, timeMs} = await this.measurePerformance(
                'File name search',
                async () => {
                    // Optimize search pattern: ensure using VS Code's glob pattern for more efficient filename matching
                    const searchPattern = `**/*${nameSubstring}*`;
                    return vscode.workspace.findFiles(searchPattern, '**/node_modules/**', 1000);
                }
            );

            this.log.info(`Found ${files.length} matching files in ${timeMs.toFixed(2)}ms`);

            // Format results with richer information
            const results = files.map(file => {
                const fileName = path.basename(file.fsPath);
                const dirPath = path.dirname(file.fsPath);

                return {
                    path: this.getRelativePath(file.fsPath),
                    name: fileName,
                    directory: this.getRelativePath(dirPath) || '',
                    absolutePath: file.fsPath
                };
            });

            return responseHandler.success(results);
        } catch (error) {
            this.log.error('Error finding files', error);
            return responseHandler.failure(`Error finding files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}