import * as vscode from 'vscode';
import {AbsFileTools} from '../types/absFileTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';
import { getFileName, getDirName } from '../utils/pathUtils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File content search tool
 * Inherits from AbstractFileTools base class to utilize common file operation functionality
 */
export class SearchInFilesContentTool extends AbsFileTools<ToolParams['searchInFilesContent']> {
    constructor() {
        super(
            'search_in_files_content',
            'Search for a text substring within all files in the project using IntelliJ\'s search engine. Returns an array of file information containing matches.',
            {
                type: 'object',
                properties: {
                    searchText: {type: 'string'},
                    caseSensitive: {type: 'boolean', default: false}
                },
                required: ['searchText']
            }
        );
    }

    /**
     * Get .gitignore patterns from workspace
     */
    private async getGitignorePatterns(): Promise<string[]> {
        const patterns: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            return patterns;
        }

        for (const folder of workspaceFolders) {
            const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');
            try {
                if (fs.existsSync(gitignorePath)) {
                    const content = await fs.promises.readFile(gitignorePath, 'utf8');
                    const lines = content.split('\n')
                        .map(line => line.trim())
                        .filter(line => line && !line.startsWith('#'));

                    patterns.push(...lines.map(line => `**/${line}`));
                }
            } catch (err) {
                this.log.warn(`Error reading .gitignore: ${err}`);
            }
        }

        return patterns;
    }

    /**
     * Execute file search operation (implementing base class abstract method)
     */
    protected async execute(_absolutePath: string, args: ToolParams['searchInFilesContent']): Promise<Response> {
        const {searchText, caseSensitive = false} = args;

        if (!searchText) {
            this.log.warn('Empty search text provided');
            return responseHandler.failure('Search text cannot be empty');
        }

        try {
            // Get workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return responseHandler.failure('No workspace folder found');
            }

            // Get .gitignore patterns
            const excludePatterns = await this.getGitignorePatterns();

            // Use VS Code's findFiles API with dynamic .gitignore rules
            const files = await vscode.workspace.findFiles(
                '**/*',
                excludePatterns.join(',')
            );

            // Process files in parallel
            const foundFiles = await this.processFilesInParallel(
                files,
                async (file) => {
                    try {
                        // Check if file exists
                        if (!(await this.fileExists(file))) return null;

                        // Exclude binary files
                        if (this.isProbablyBinaryFile(file.fsPath)) {
                            this.log.info(`Skipping binary file: ${file.fsPath}`);
                            return null;
                        }

                        // Read file content without cache
                        const content = await this.readFile(file);
                        const searchContent = caseSensitive ? content : content.toLowerCase();
                        const searchTextLower = caseSensitive ? searchText : searchText.toLowerCase();

                        // Search for text
                        return searchContent.includes(searchTextLower) ? file.fsPath : null;
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
                    pathInProject: this.getRelativePath(filePath)
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
export class FindFilesByNameSubstringTool extends AbsFileTools<ToolParams['findFilesByNameSubstring']> {
    constructor() {
        super(
            'find_files_by_name_substring',
            'Search for all files in the project whose names contain the specified substring. Returns an array of file information.',
            {
                type: 'object',
                properties: {
                    nameSubstring: {type: 'string'},
                    caseSensitive: {type: 'boolean', default: false}
                },
                required: ['nameSubstring']
            }
        );
    }

    /**
     * Get .gitignore patterns from workspace
     */
    private async getGitignorePatterns(): Promise<string[]> {
        const patterns: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            return patterns;
        }

        for (const folder of workspaceFolders) {
            const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');
            try {
                if (fs.existsSync(gitignorePath)) {
                    const content = await fs.promises.readFile(gitignorePath, 'utf8');
                    const lines = content.split('\n')
                        .map(line => line.trim())
                        .filter(line => line && !line.startsWith('#'));

                    patterns.push(...lines.map(line => `**/${line}`));
                }
            } catch (err) {
                this.log.warn(`Error reading .gitignore: ${err}`);
            }
        }

        return patterns;
    }

    /**
     * Execute file find operation (implementing base class abstract method)
     */
    protected async execute(_absolutePath: string, args: ToolParams['findFilesByNameSubstring']): Promise<Response> {
        const {nameSubstring, caseSensitive = false} = args;

        if (!nameSubstring) {
            this.log.warn('Empty search string provided');
            return responseHandler.failure('Search string cannot be empty');
        }

        try {
            // Get workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return responseHandler.failure('No workspace folder found');
            }

            // Get .gitignore patterns
            const excludePatterns = await this.getGitignorePatterns();

            // Use VS Code's findFiles API with dynamic .gitignore rules and optimized glob pattern
            const searchPattern = `**/*${nameSubstring}*`;
            const files = await vscode.workspace.findFiles(
                searchPattern,
                excludePatterns.join(',')
            );

            // Format results with richer information and apply case sensitivity filter
            const results = files
                .filter(file => {
                    const fileName = getFileName(file.fsPath);
                    return caseSensitive
                        ? fileName.includes(nameSubstring)
                        : fileName.toLowerCase().includes(nameSubstring.toLowerCase());
                })
                .map(file => {
                    const fileName = getFileName(file.fsPath);
                    const dirPath = getDirName(file.fsPath);

                    return {
                        pathInProject: this.getRelativePath(file.fsPath),
                        name: fileName,
                        directory: this.getRelativePath(dirPath) || ''
                    };
                });

            return responseHandler.success(results);
        } catch (error) {
            this.log.error('Error finding files', error);
            return responseHandler.failure(`Error finding files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
