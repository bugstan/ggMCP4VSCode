import {AbstractGitTools} from '../types/absGitTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';
import {toRelativePath} from '../utils/pathUtils';

/**
 * Get project version control status tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetProjectVcsStatusTool extends AbstractGitTools {
    constructor() {
        super(
            'get_project_vcs_status',
            'Retrieves the current version control status of files in the project.\nUse this tool to get information about modified, added, deleted, and moved files in your VCS (e.g., Git).\nReturns a JSON-formatted list of changed files, where each entry contains:\n- path: The file path relative to project root\n- type: The type of change (e.g., MODIFICATION, ADDITION, DELETION, MOVED)\nReturns an empty list ([]) if no changes are detected or VCS is not configured.\nReturns error "project dir not found" if project directory cannot be determined.\nNote: Works with any VCS supported by the IDE, but is most commonly used with Git',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * Execute Git version control status operation (implementing base class abstract method)
     */
    protected async executeGitOperation(repository: any, _args: any): Promise<Response> {
        try {
            this.log.info('Getting project VCS status');

            // Use base class getWorkingTreeChanges method to get changes
            const changes = this.getWorkingTreeChanges(repository);

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
                const statusDesc = this.formatGitStatus(statusCode);

                return {
                    path: relativePath || path,
                    type: statusDesc
                };
            });

            this.log.info(`Found ${result.length} changed files in VCS`);
            return responseHandler.success(result);
        } catch (error) {
            this.log.error('Error getting version control status:', error);
            return responseHandler.failure(`Error getting version control status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Find commit by message tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class FindCommitByMessageTool extends AbstractGitTools<ToolParams['findCommitByMessage']> {
    constructor() {
        super(
            'find_commit_by_message',
            'Searches for a commit based on the provided text or keywords in the project history.\nUseful for finding specific change sets or code modifications by commit messages or diff content.\nTakes a query parameter and returns the matching commit information.\nReturns matched commit hashes as a JSON array.',
            {
                type: 'object',
                properties: {
                    text: {type: 'string'}
                },
                required: ['text']
            }
        );
    }

    /**
     * Execute Git find commit operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['findCommitByMessage']): Promise<Response> {
        try {
            const {text} = args;
            this.log.info(`Searching for commits with text: ${text}`);

            // Use base class escapeArg method to prevent command injection
            const escapedText = this.escapeArg(text);

            // Build git log command
            const logCommand = `git log --grep="${escapedText}" --format="%H" -n 10`;

            // Use base class executeGitCommand method to execute Git command
            const result = await this.executeGitCommand(logCommand);

            if (result.exitCode !== 0 || !result.stdout) {
                this.log.warn(`Git command failed with exit code: ${result.exitCode || 'N/A'}`);
                this.log.info(`Error output: ${result.stderr || 'N/A'}`);
                return responseHandler.success([]);
            }

            // Use base class parseCommandOutput method to process command output
            return this.parseCommandOutput(result.stdout, 'Error parsing git log output');
        } catch (error) {
            this.log.error('Error finding commits:', error);
            return responseHandler.failure(`Error finding commits: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}