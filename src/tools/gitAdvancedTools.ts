import {AbstractGitTools} from '../types/absGitTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';
import {getBranches} from '../utils/gitUtils';

/**
 * Get file modification history tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetFileHistoryTool extends AbstractGitTools<ToolParams['getFileHistory']> {
    constructor() {
        super(
            'get_file_history',
            'Get the modification history of a specified file. Returns a list of commits with their hash, author, date, and message.',
            {
                type: 'object',
                properties: {
                    pathInProject: {type: 'string'},
                    maxCount: {type: 'number'}
                },
                required: ['pathInProject']
            }
        );
    }

    /**
     * Execute Git get file history operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['getFileHistory']): Promise<Response> {
        try {
            const {pathInProject, maxCount = 10} = args;
            this.log.info(`Getting file history for: ${pathInProject}, max count: ${maxCount}`);

            // Build git log command
            const command = `git log --max-count=${maxCount} --format="%H|%an|%ad|%s" --date=short -- "${this.escapeArg(pathInProject)}"`;

            // Use base class executeGitCommand method to execute Git command
            const result = await this.executeGitCommand(command);

            if (result.exitCode !== 0 || !result.stdout) {
                this.log.error(`Failed to get file history: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to get file history: ${result.stderr}`);
            }

            // Parse commit records
            const commits = result.stdout
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => {
                    const parts = line.split('|');
                    return {
                        hash: parts[0] || '',
                        author: parts[1] || '',
                        date: parts[2] || '',
                        message: parts.slice(3).join('|') || ''
                    };
                });

            this.log.info(`Found ${commits.length} history entries for file: ${pathInProject}`);
            return responseHandler.success({
                file: pathInProject,
                commits: commits
            });
        } catch (error) {
            this.log.error('Error getting file history', error);
            return responseHandler.failure(`Error getting file history: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get file diff tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetFileDiffTool extends AbstractGitTools<ToolParams['getFileDiff']> {
    constructor() {
        super(
            'get_file_diff',
            'Get the diff information for a file. Can compare differences between two commits, between a specific commit and the working area, or between the staging area and working area.',
            {
                type: 'object',
                properties: {
                    pathInProject: {type: 'string'},
                    hash1: {type: 'string'},
                    hash2: {type: 'string'}
                },
                required: ['pathInProject']
            }
        );
    }

    /**
     * Execute Git get file diff operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['getFileDiff']): Promise<Response> {
        try {
            const {pathInProject, hash1, hash2} = args;
            this.log.info(`Getting file diff for: ${pathInProject} between ${hash1 || 'working copy'} and ${hash2 || 'index'}`);

            // Build git diff command
            let command: string;
            const escapedPath = this.escapeArg(pathInProject);

            if (hash1 && hash2) {
                command = `git diff ${this.escapeArg(hash1)} ${this.escapeArg(hash2)} -- "${escapedPath}"`;
            } else if (hash1) {
                command = `git diff ${this.escapeArg(hash1)} -- "${escapedPath}"`;
            } else {
                command = `git diff -- "${escapedPath}"`;
            }

            this.log.info(`Executing Git command: ${command}`);
            const result = await this.executeGitCommand(command);

            if (result.exitCode !== 0) {
                this.log.error(`Failed to get file diff: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to get file diff: ${result.stderr}`);
            }

            this.log.info(`Successfully retrieved diff for file: ${pathInProject}`);
            return responseHandler.success({
                file: pathInProject,
                diff: result.stdout
            });
        } catch (error) {
            this.log.error('Error getting file diff', error);
            return responseHandler.failure(`Error getting file diff: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get branch information tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetBranchInfoTool extends AbstractGitTools {
    constructor() {
        super(
            'get_branch_info',
            'Get current branch information and a list of all available branches. Includes local and remote branches.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * Execute Git get branch info operation (implementing base class abstract method)
     */
    protected async executeGitOperation(repository: any, _args: any): Promise<Response> {
        try {
            this.log.info('Getting branch information');

            // Use base class getCurrentBranch method to get current branch
            const currentBranch = this.getCurrentBranch(repository) || '';

            // Get all branches
            const branches = await getBranches();

            if (!branches) {
                this.log.error('Failed to get branch information');
                return responseHandler.failure('Failed to get branch information');
            }

            // Format branch information
            const formattedBranches = branches.map(branch => ({
                name: branch.name,
                isCurrent: branch.current,
                isRemote: branch.name.includes('/')
            }));

            this.log.info(`Found ${formattedBranches.length} branches, current branch: ${currentBranch}`);
            return responseHandler.success({
                currentBranch,
                branches: formattedBranches
            });
        } catch (error) {
            this.log.error('Error getting branch info', error);
            return responseHandler.failure(`Error getting branch info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get commit details tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetCommitDetailsTool extends AbstractGitTools<ToolParams['getCommitDetails']> {
    constructor() {
        super(
            'get_commit_details',
            'Get detailed information for a specific commit, including author, date, commit message, and list of changed files.',
            {
                type: 'object',
                properties: {
                    hash: {type: 'string'}
                },
                required: ['hash']
            }
        );
    }

    /**
     * Execute Git get commit details operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['getCommitDetails']): Promise<Response> {
        try {
            const {hash} = args;
            this.log.info(`Getting commit details for hash: ${hash}`);

            if (!hash) {
                this.log.warn('Empty commit hash provided');
                return responseHandler.failure('Commit hash cannot be empty');
            }

            // Build git show command
            const detailCommand = `git show --name-status --format="%H%n%an%n%ae%n%ad%n%s%n%b" --date=iso ${this.escapeArg(hash)}`;
            this.log.info(`Executing Git command: ${detailCommand}`);

            const detailResult = await this.executeGitCommand(detailCommand);

            if (detailResult.exitCode !== 0 || !detailResult.stdout) {
                this.log.error(`Failed to get commit details: ${detailResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to get commit details: ${detailResult.stderr}`);
            }

            const lines = detailResult.stdout.split('\n').filter(line => line.trim() !== '');

            // Ensure sufficient lines for parsing
            if (lines.length < 6) {
                this.log.error('Insufficient commit details');
                return responseHandler.failure('Insufficient commit details');
            }

            // Extract basic commit information
            const [commitHash, author, email, date, subject, ...bodyLines] = lines;

            // Separate message body and changed files
            const bodyEndIndex = bodyLines.findIndex(line => /^[A-Z]\t/.test(line));
            const body = bodyEndIndex > -1 ? bodyLines.slice(0, bodyEndIndex).join('\n').trim() : '';
            const fileChanges = bodyEndIndex > -1
                ? bodyLines.slice(bodyEndIndex)
                : bodyLines;

            // Parse changed files
            const changes = fileChanges
                .map(line => {
                    const match = line.trim().match(/^([A-Z])\t(.+)$/);
                    if (!match) return null;
                    return {
                        status: match[1] || '',
                        path: match[2] || ''
                    };
                })
                .filter(change => change !== null);

            this.log.info(`Successfully retrieved details for commit: ${hash}`);
            return responseHandler.success({
                hash: commitHash,
                author,
                email,
                date,
                subject,
                body,
                changes
            });
        } catch (error) {
            this.log.error('Error getting commit details', error);
            return responseHandler.failure(`Error getting commit details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Commit changes tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class CommitChangesTool extends AbstractGitTools<ToolParams['commitChanges']> {
    constructor() {
        super(
            'commit_changes',
            'Commit current changes. If amend is set to true, modify the last commit. Automatically stages unstaged changes.',
            {
                type: 'object',
                properties: {
                    message: {type: 'string'},
                    amend: {type: 'boolean'}
                },
                required: ['message']
            }
        );
    }

    /**
     * Execute Git commit changes operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['commitChanges']): Promise<Response> {
        try {
            const {message, amend = false} = args;
            this.log.info(`Committing changes with message: "${message}", amend: ${amend}`);

            if (!message && !amend) {
                this.log.warn('Empty commit message provided');
                return responseHandler.failure('Commit message cannot be empty');
            }

            // Check repository status
            const statusResult = await this.executeGitCommand('git status --porcelain');

            if (statusResult.exitCode !== 0) {
                this.log.error(`Failed to check repository status: ${statusResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to check repository status: ${statusResult.stderr}`);
            }

            const hasUnstagedChanges = statusResult.stdout.split('\n')
                .some(line => line.trim() !== '' && line.startsWith('??'));

            const hasChanges = statusResult.stdout.trim() !== '';

            // Stage changes if needed
            if (hasUnstagedChanges) {
                this.log.info('Staging untracked files');
                const stageResult = await this.executeGitCommand('git add .');
                if (stageResult.exitCode !== 0) {
                    this.log.error(`Failed to stage changes: ${stageResult.stderr || 'Unknown error'}`);
                    return responseHandler.failure(`Failed to stage changes: ${stageResult.stderr}`);
                }
            }

            // Validate commit
            if (!hasChanges && !amend) {
                this.log.warn('No changes to commit');
                return responseHandler.failure('No changes to commit');
            }

            // Prepare commit command
            const escapedMessage = this.escapeArg(message || '');
            const commitCommand = amend
                ? `git commit --amend -m "${escapedMessage}"`
                : `git commit -m "${escapedMessage}"`;

            this.log.info(`Executing Git command: ${commitCommand}`);

            // Execute commit
            const commitResult = await this.executeGitCommand(commitCommand);

            if (commitResult.exitCode !== 0) {
                this.log.error(`Failed to commit changes: ${commitResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to commit changes: ${commitResult.stderr}`);
            }

            this.log.info(`Successfully ${amend ? 'amended' : 'committed'} changes`);
            return responseHandler.success({
                success: true,
                message: amend ? 'Modified previous commit' : 'Successfully committed changes'
            });
        } catch (error) {
            this.log.error('Error committing changes', error);
            return responseHandler.failure(`Error committing changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Pull changes tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class PullChangesTool extends AbstractGitTools<ToolParams['pullChanges']> {
    constructor() {
        super(
            'pull_changes',
            'Pull changes from the remote repository. Can specify remote repository name and branch name.',
            {
                type: 'object',
                properties: {
                    remote: {type: 'string'},
                    branch: {type: 'string'}
                }
            }
        );
    }

    /**
     * Execute Git pull changes operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['pullChanges']): Promise<Response> {
        try {
            const {remote = 'origin', branch} = args;
            this.log.info(`Pulling changes from remote: ${remote}${branch ? `, branch: ${branch}` : ''}`);

            // Build pull command
            const pullCommand = branch
                ? `git pull ${this.escapeArg(remote)} ${this.escapeArg(branch)}`
                : `git pull ${this.escapeArg(remote)}`;

            this.log.info(`Executing Git command: ${pullCommand}`);

            // Execute pull
            const pullResult = await this.executeGitCommand(pullCommand);

            if (pullResult.exitCode !== 0) {
                this.log.error(`Failed to pull changes: ${pullResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to pull changes: ${pullResult.stderr}`);
            }

            this.log.info('Successfully pulled changes');
            return responseHandler.success({
                success: true,
                message: pullResult.stdout || 'Successfully pulled changes'
            });
        } catch (error) {
            this.log.error('Error pulling changes', error);
            return responseHandler.failure(`Error pulling changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Switch branch tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class SwitchBranchTool extends AbstractGitTools<ToolParams['switchBranch']> {
    constructor() {
        super(
            'switch_branch',
            'Switch to the specified branch. Returns an error if the branch does not exist.',
            {
                type: 'object',
                properties: {
                    branch: {type: 'string'}
                },
                required: ['branch']
            }
        );
    }

    /**
     * Execute Git switch branch operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['switchBranch']): Promise<Response> {
        try {
            const {branch} = args;
            this.log.info(`Switching to branch: ${branch}`);

            if (!branch) {
                this.log.warn('Empty branch name provided');
                return responseHandler.failure('Branch name cannot be empty');
            }

            const checkoutCommand = `git checkout ${this.escapeArg(branch)}`;
            this.log.info(`Executing Git command: ${checkoutCommand}`);

            const checkoutResult = await this.executeGitCommand(checkoutCommand);

            if (checkoutResult.exitCode !== 0) {
                this.log.error(`Failed to switch branch: ${checkoutResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to switch branch: ${checkoutResult.stderr}`);
            }

            this.log.info(`Successfully switched to branch: ${branch}`);
            return responseHandler.success({
                success: true,
                message: `Switched to branch '${branch}'`
            });
        } catch (error) {
            this.log.error('Error switching branch', error);
            return responseHandler.failure(`Error switching branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Create branch tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class CreateBranchTool extends AbstractGitTools<ToolParams['createBranch']> {
    constructor() {
        super(
            'create_branch',
            'Create a new branch and switch to it. Can specify a starting point (commit hash or branch name).',
            {
                type: 'object',
                properties: {
                    branch: {type: 'string'},
                    startPoint: {type: 'string'}
                },
                required: ['branch']
            }
        );
    }

    /**
     * Execute Git create branch operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, args: ToolParams['createBranch']): Promise<Response> {
        try {
            const {branch, startPoint} = args;
            this.log.info(`Creating branch: ${branch}${startPoint ? ` from ${startPoint}` : ''}`);

            if (!branch) {
                this.log.warn('Empty branch name provided');
                return responseHandler.failure('Branch name cannot be empty');
            }

            // Build create branch command
            const createCommand = startPoint
                ? `git checkout -b ${this.escapeArg(branch)} ${this.escapeArg(startPoint)}`
                : `git checkout -b ${this.escapeArg(branch)}`;

            this.log.info(`Executing Git command: ${createCommand}`);

            const createResult = await this.executeGitCommand(createCommand);

            if (createResult.exitCode !== 0) {
                this.log.error(`Failed to create branch: ${createResult.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to create branch: ${createResult.stderr}`);
            }

            this.log.info(`Successfully created branch: ${branch}`);
            return responseHandler.success({
                success: true,
                message: `Created and switched to new branch '${branch}'`
            });
        } catch (error) {
            this.log.error('Error creating branch', error);
            return responseHandler.failure(`Error creating branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}