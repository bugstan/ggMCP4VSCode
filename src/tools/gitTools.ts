import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {createResponse, formatError} from '../utils/response';
import {toRelativePath} from '../utils/pathUtils';
import {escapeShellArg, executeGitCommand, getChangeStatusDescription, withGitRepository} from '../utils/gitUtils';
import {Logger} from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('GitTools');

/**
 * Get project version control status tool
 */
export class GetProjectVcsStatusTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_project_vcs_status',
            'Get the version control status of files in the project. Returns a list of changed files with paths and change types.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        return withGitRepository(async (repository) => {
            try {
                log.debug('Getting project VCS status');
                
                // Get working tree changes, compatible with different API versions
                let changes = [];
                try {
                    // Try to get working tree changes
                    if (repository.state && repository.state.workingTreeChanges) {
                        changes = repository.state.workingTreeChanges;
                    } else if (repository.state && repository.state.changes) {
                        changes = repository.state.changes;
                    }
                } catch (err) {
                    log.error('Error getting Git changes:', err);
                    // Continue execution, return empty array
                }

                // Format results
                const result = changes.map((change: any) => {
                    let path;

                    // Try different property names to get path
                    if (change.uri && change.uri.path) {
                        path = change.uri.path;
                    } else if (change.resourceUri && change.resourceUri.path) {
                        path = change.resourceUri.path;
                    } else if (change.path) {
                        path = change.path;
                    } else {
                        path = '';
                    }

                    // Convert to project relative path
                    const relativePath = toRelativePath(path);
                    
                    // Get status description
                    const statusCode = change.status || change.type || 'UNKNOWN';
                    const statusDesc = getChangeStatusDescription(statusCode);

                    return {
                        path: relativePath || path,
                        type: statusDesc
                    };
                });

                log.info(`Found ${result.length} changed files in VCS`);
                return createResponse(result);
            } catch (error) {
                log.error('Error getting version control status:', error);
                return createResponse(null, formatError(error));
            }
        });
    }
}

/**
 * Find commit by message tool
 */
export class FindCommitByMessageTool extends AbstractMcpTool<ToolParams['findCommitByMessage']> {
    constructor() {
        super(
            'find_commit_by_message',
            'Search for a commit based on the provided text or keywords in the project history. Returns an array of matching commit hashes.',
            {
                type: 'object',
                properties: {
                    text: { type: 'string' }
                },
                required: ['text']
            }
        );
    }

    async handle(args: ToolParams['findCommitByMessage']): Promise<Response> {
        try {
            const { text } = args;
            log.debug(`Searching for commits with text: ${text}`);

            // Escape the search text to prevent command injection
            const escapedText = escapeShellArg(text);

            // Execute git log command to search for commits
            const logCommand = `git log --grep="${escapedText}" --format="%H" -n 10`;
            
            const result = await executeGitCommand(logCommand);
            
            if (!result || result.exitCode !== 0) {
                log.warn(`Git command failed with exit code: ${result?.exitCode || 'N/A'}`);
                log.debug(`Error output: ${result?.stderr || 'N/A'}`);
                return createResponse([]);
            }

            // Parse commit hashes
            const commits = result.stdout
                .split('\n')
                .filter((line: string) => line.trim() !== '');

            log.info(`Found ${commits.length} matching commits`);
            return createResponse(commits);
        } catch (error) {
            log.error('Error finding commits:', error);
            return createResponse(null, formatError(error));
        }
    }
}