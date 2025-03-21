import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {escapeShellArg, executeGitCommand, getBranches, withGitRepository} from '../utils/gitUtils';
import {errorResponse, successResponse} from '../utils/response';
import {Logger} from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('GitAdvancedTools');

/**
 * Get file modification history tool
 */
export class GetFileHistoryTool extends AbstractMcpTool<ToolParams['getFileHistory']> {
    constructor() {
        super(
            'get_file_history',
            'Get the modification history of a specified file. Returns a list of commits with their hash, author, date, and message.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    maxCount: { type: 'number' }
                },
                required: ['pathInProject']
            }
        );
    }

    async handle(args: ToolParams['getFileHistory']): Promise<Response> {
        try {
            const { pathInProject, maxCount = 10 } = args;
            log.debug(`Getting file history for: ${pathInProject}, max count: ${maxCount}`);

            return withGitRepository(async () => {
                const command = `git log --max-count=${maxCount} --format="%H|%an|%ad|%s" --date=short -- "${escapeShellArg(pathInProject)}"`;
                const result = await executeGitCommand(command);

                if (!result || result.exitCode !== 0) {
                    log.error(`Failed to get file history: ${result?.stderr || 'Unknown error'}`);
                    throw new Error(result?.stderr || 'Failed to get file history');
                }

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

                log.info(`Found ${commits.length} history entries for file: ${pathInProject}`);
                return successResponse({
                    file: pathInProject,
                    commits: commits
                });
            });
        } catch (error) {
            log.error('Error getting file history', error);
            return errorResponse(`Error getting file history: ${error}`);
        }
    }
}

/**
 * Get file diff tool
 */
export class GetFileDiffTool extends AbstractMcpTool<ToolParams['getFileDiff']> {
    constructor() {
        super(
            'get_file_diff',
            'Get the diff information for a file. Can compare differences between two commits, between a specific commit and the working area, or between the staging area and working area.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    hash1: { type: 'string' },
                    hash2: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    async handle(args: ToolParams['getFileDiff']): Promise<Response> {
        try {
            const { pathInProject, hash1, hash2 } = args;
            log.debug(`Getting file diff for: ${pathInProject} between ${hash1 || 'working copy'} and ${hash2 || 'index'}`);

            return withGitRepository(async () => {
                let command: string;

                if (hash1 && hash2) {
                    command = `git diff ${escapeShellArg(hash1)} ${escapeShellArg(hash2)} -- "${escapeShellArg(pathInProject)}"`;
                } else if (hash1) {
                    command = `git diff ${escapeShellArg(hash1)} -- "${escapeShellArg(pathInProject)}"`;
                } else {
                    command = `git diff -- "${escapeShellArg(pathInProject)}"`;
                }

                log.debug(`Executing Git command: ${command}`);
                const result = await executeGitCommand(command);

                if (!result || result.exitCode !== 0) {
                    log.error(`Failed to get file diff: ${result?.stderr || 'Unknown error'}`);
                    throw new Error(result?.stderr || 'Failed to get file diff');
                }

                log.info(`Successfully retrieved diff for file: ${pathInProject}`);
                return successResponse({
                    file: pathInProject,
                    diff: result.stdout
                });
            });
        } catch (error) {
            log.error('Error getting file diff', error);
            return errorResponse(`Error getting file diff: ${error}`);
        }
    }
}

/**
 * Get branch info tool
 */
export class GetBranchInfoTool extends AbstractMcpTool<{}> {
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

    async handle(_args: {}): Promise<Response> {
        try {
            log.debug('Getting branch information');

            return withGitRepository(async (repository) => {
                // Get current branch from repository state
                const currentBranch = repository.state?.HEAD?.name || '';
                
                // Get all branches using the utility function
                const branches = await getBranches();
                
                if (!branches) {
                    log.error('Failed to get branch information');
                    throw new Error('Failed to get branch information');
                }
                
                // Format the branches for response
                const formattedBranches = branches.map(branch => ({
                    name: branch.name,
                    isCurrent: branch.current,
                    isRemote: branch.name.includes('/')
                }));
                
                log.info(`Found ${formattedBranches.length} branches, current branch: ${currentBranch}`);
                return successResponse({
                    currentBranch,
                    branches: formattedBranches
                });
            });
        } catch (error) {
            log.error('Error getting branch info', error);
            return errorResponse(`Error getting branch info: ${error}`);
        }
    }
}

/**
 * Get commit details tool
 */
export class GetCommitDetailsTool extends AbstractMcpTool<ToolParams['getCommitDetails']> {
    constructor() {
        super(
            'get_commit_details',
            'Get detailed information for a specific commit, including author, date, commit message, and list of changed files.',
            {
                type: 'object',
                properties: {
                    hash: { type: 'string' }
                },
                required: ['hash']
            }
        );
    }

    async handle(args: ToolParams['getCommitDetails']): Promise<Response> {
        try {
            const { hash } = args;
            log.debug(`Getting commit details for hash: ${hash}`);

            if (!hash) {
                log.warn('Empty commit hash provided');
                return errorResponse('Commit hash cannot be empty');
            }

            return withGitRepository(async () => {
                // Get commit details with name-status to capture file changes
                const detailCommand = `git show --name-status --format="%H%n%an%n%ae%n%ad%n%s%n%b" --date=iso ${escapeShellArg(hash)}`;
                log.debug(`Executing Git command: ${detailCommand}`);
                
                const detailResult = await executeGitCommand(detailCommand);

                if (!detailResult || detailResult.exitCode !== 0) {
                    log.error(`Failed to get commit details: ${detailResult?.stderr || 'Unknown error'}`);
                    throw new Error(detailResult?.stderr || 'Failed to get commit details');
                }

                const lines = detailResult.stdout.split('\n').filter(line => line.trim() !== '');

                // Ensure we have enough lines for parsing
                if (lines.length < 6) {
                    log.error('Insufficient commit details');
                    throw new Error('Insufficient commit details');
                }

                // Extract basic commit information
                const [commitHash, author, email, date, subject, ...bodyLines] = lines;

                // Separate body and changed files
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

                log.info(`Successfully retrieved details for commit: ${hash}`);
                return successResponse({
                    hash: commitHash,
                    author,
                    email,
                    date,
                    subject,
                    body,
                    changes
                });
            });
        } catch (error) {
            log.error('Error getting commit details', error);
            return errorResponse(`Error getting commit details: ${error}`);
        }
    }
}

/**
 * Commit changes tool
 */
export class CommitChangesTool extends AbstractMcpTool<ToolParams['commitChanges']> {
    constructor() {
        super(
            'commit_changes',
            'Commit current changes. If amend is set to true, modify the last commit. Automatically stages unstaged changes.',
            {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    amend: { type: 'boolean' }
                },
                required: ['message']
            }
        );
    }

    async handle(args: ToolParams['commitChanges']): Promise<Response> {
        try {
            const { message, amend = false } = args;
            log.debug(`Committing changes with message: "${message}", amend: ${amend}`);

            if (!message && !amend) {
                log.warn('Empty commit message provided');
                return errorResponse('Commit message cannot be empty');
            }

            return withGitRepository(async () => {
                // Check repository status
                const statusResult = await executeGitCommand('git status --porcelain');

                if (!statusResult || statusResult.exitCode !== 0) {
                    log.error(`Failed to check repository status: ${statusResult?.stderr || 'Unknown error'}`);
                    throw new Error(statusResult?.stderr || 'Failed to check repository status');
                }

                const hasUnstagedChanges = statusResult.stdout.split('\n')
                    .some(line => line.trim() !== '' && line.startsWith('??'));

                const hasChanges = statusResult.stdout.trim() !== '';

                // Stage changes if needed
                if (hasUnstagedChanges) {
                    log.debug('Staging untracked files');
                    const stageResult = await executeGitCommand('git add .');
                    if (!stageResult || stageResult.exitCode !== 0) {
                        log.error(`Failed to stage changes: ${stageResult?.stderr || 'Unknown error'}`);
                        throw new Error(stageResult?.stderr || 'Failed to stage changes');
                    }
                }

                // Validate commit
                if (!hasChanges && !amend) {
                    log.warn('No changes to commit');
                    throw new Error('No changes to commit');
                }

                // Prepare commit command
                const escapedMessage = escapeShellArg(message || '');
                const commitCommand = amend
                    ? `git commit --amend -m "${escapedMessage}"`
                    : `git commit -m "${escapedMessage}"`;

                log.debug(`Executing Git command: ${commitCommand}`);
                
                // Execute commit
                const commitResult = await executeGitCommand(commitCommand);

                if (!commitResult || commitResult.exitCode !== 0) {
                    log.error(`Failed to commit changes: ${commitResult?.stderr || 'Unknown error'}`);
                    throw new Error(commitResult?.stderr || 'Failed to commit changes');
                }

                log.info(`Successfully ${amend ? 'amended' : 'committed'} changes`);
                return successResponse({
                    success: true,
                    message: amend ? 'Modified previous commit' : 'Successfully committed changes'
                });
            });
        } catch (error) {
            log.error('Error committing changes', error);
            return errorResponse(`Error committing changes: ${error}`);
        }
    }
}

/**
 * Pull changes tool
 */
export class PullChangesTool extends AbstractMcpTool<ToolParams['pullChanges']> {
    constructor() {
        super(
            'pull_changes',
            'Pull changes from the remote repository. Can specify remote repository name and branch name.',
            {
                type: 'object',
                properties: {
                    remote: { type: 'string' },
                    branch: { type: 'string' }
                }
            }
        );
    }

    async handle(args: ToolParams['pullChanges']): Promise<Response> {
        try {
            const { remote = 'origin', branch } = args;
            log.debug(`Pulling changes from remote: ${remote}${branch ? `, branch: ${branch}` : ''}`);

            return withGitRepository(async () => {
                // Build pull command
                const pullCommand = branch
                    ? `git pull ${escapeShellArg(remote)} ${escapeShellArg(branch)}`
                    : `git pull ${escapeShellArg(remote)}`;

                log.debug(`Executing Git command: ${pullCommand}`);
                
                // Execute pull
                const pullResult = await executeGitCommand(pullCommand);

                if (!pullResult || pullResult.exitCode !== 0) {
                    log.error(`Failed to pull changes: ${pullResult?.stderr || 'Unknown error'}`);
                    throw new Error(pullResult?.stderr || 'Failed to pull changes');
                }

                log.info('Successfully pulled changes');
                return successResponse({
                    success: true,
                    message: pullResult.stdout || 'Successfully pulled changes'
                });
            });
        } catch (error) {
            log.error('Error pulling changes', error);
            return errorResponse(`Error pulling changes: ${error}`);
        }
    }
}

/**
 * Switch branch tool
 */
export class SwitchBranchTool extends AbstractMcpTool<ToolParams['switchBranch']> {
    constructor() {
        super(
            'switch_branch',
            'Switch to the specified branch. Returns an error if the branch does not exist.',
            {
                type: 'object',
                properties: {
                    branch: { type: 'string' }
                },
                required: ['branch']
            }
        );
    }

    async handle(args: ToolParams['switchBranch']): Promise<Response> {
        try {
            const { branch } = args;
            log.debug(`Switching to branch: ${branch}`);

            if (!branch) {
                log.warn('Empty branch name provided');
                return errorResponse('Branch name cannot be empty');
            }

            return withGitRepository(async () => {
                const checkoutCommand = `git checkout ${escapeShellArg(branch)}`;
                log.debug(`Executing Git command: ${checkoutCommand}`);
                
                const checkoutResult = await executeGitCommand(checkoutCommand);

                if (!checkoutResult || checkoutResult.exitCode !== 0) {
                    log.error(`Failed to switch branch: ${checkoutResult?.stderr || 'Unknown error'}`);
                    throw new Error(checkoutResult?.stderr || 'Failed to switch branch');
                }

                log.info(`Successfully switched to branch: ${branch}`);
                return successResponse({
                    success: true,
                    message: `Switched to branch '${branch}'`
                });
            });
        } catch (error) {
            log.error('Error switching branch', error);
            return errorResponse(`Error switching branch: ${error}`);
        }
    }
}

/**
 * Create branch tool
 */
export class CreateBranchTool extends AbstractMcpTool<ToolParams['createBranch']> {
    constructor() {
        super(
            'create_branch',
            'Create a new branch and switch to it. Can specify a starting point (commit hash or branch name).',
            {
                type: 'object',
                properties: {
                    branch: { type: 'string' },
                    startPoint: { type: 'string' }
                },
                required: ['branch']
            }
        );
    }

    async handle(args: ToolParams['createBranch']): Promise<Response> {
        try {
            const { branch, startPoint } = args;
            log.debug(`Creating branch: ${branch}${startPoint ? ` from ${startPoint}` : ''}`);

            if (!branch) {
                log.warn('Empty branch name provided');
                return errorResponse('Branch name cannot be empty');
            }

            return withGitRepository(async () => {
                // Build create branch command
                const createCommand = startPoint
                    ? `git checkout -b ${escapeShellArg(branch)} ${escapeShellArg(startPoint)}`
                    : `git checkout -b ${escapeShellArg(branch)}`;

                log.debug(`Executing Git command: ${createCommand}`);
                
                const createResult = await executeGitCommand(createCommand);

                if (!createResult || createResult.exitCode !== 0) {
                    log.error(`Failed to create branch: ${createResult?.stderr || 'Unknown error'}`);
                    throw new Error(createResult?.stderr || 'Failed to create branch');
                }

                log.info(`Successfully created branch: ${branch}`);
                return successResponse({
                    success: true,
                    message: `Created and switched to new branch '${branch}'`
                });
            });
        } catch (error) {
            log.error('Error creating branch', error);
            return errorResponse(`Error creating branch: ${error}`);
        }
    }
}