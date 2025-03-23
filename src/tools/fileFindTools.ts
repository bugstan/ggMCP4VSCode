import * as vscode from 'vscode';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { createResponse, formatError } from '../utils/response';
import { toRelativePath } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('FileFindTools');

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
                return createResponse(null, 'Search string cannot be empty');
            }

            // Use VS Code API to search for files
            const files = await vscode.workspace.findFiles('**/*' + nameSubstring + '*');
            log.debug(`Found ${files.length} matching files`);

            // Format results
            const results = files.map(file => {
                return {
                    path: toRelativePath(file.fsPath),
                    name: vscode.workspace.asRelativePath(file)
                };
            });

            return createResponse(results);
        } catch (error) {
            log.error('Error finding files', error);
            return createResponse(null, `Error finding files: ${formatError(error)}`);
        }
    }
}