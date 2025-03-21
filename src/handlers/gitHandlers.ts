import {Response} from '../types';
import {errorResponse, formatError, successResponse} from '../utils/response';
import {
    escapeShellArg,
    executeGitCommand,
    getBranches,
    getChangeStatusDescription,
    withGitRepository
} from '../utils/gitUtils';
import {Logger} from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('GitHandlers');

// ==========================================
// Basic Git Operations
// ==========================================

/**
 * Get project version control status
 */
export async function getProjectVcsStatus(): Promise<Response> {
    log.debug('Processing getProjectVcsStatus request');
    return withGitRepository(async (repository) => {
        try {
            // Get working tree changes, compatible with different API versions
            let changes = [];
            try {
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
                let filePath;

                // Try different property names to get the path
                if (change.uri && change.uri.path) {
                    filePath = change.uri.path;
                } else if (change.resourceUri && change.resourceUri.path) {
                    filePath = change.resourceUri.path;
                } else if (change.path) {
                    filePath = change.path;
                } else {
                    filePath = '';
                }

                // Get project-relative path
                const repoRoot = repository.rootUri ? repository.rootUri.fsPath : '';
                if (filePath && repoRoot && filePath.startsWith(repoRoot)) {
                    filePath = filePath.replace(repoRoot, '');
                }

                // Normalize path, ensure it starts with /
                if (filePath && !filePath.startsWith('/')) {
                    filePath = '/' + filePath;
                }

                return {
                    path: filePath,
                    type: getChangeStatusDescription(change.status || change.type || 'UNKNOWN')
                };
            });

            log.info(`Found ${result.length} changed files`);
            return successResponse(JSON.stringify(result));
        } catch (error) {
            log.error('Error getting version control status:', error);
            return errorResponse(`Error getting version control status: ${formatError(error)}`);
        }
    });
}

/**
 * Find commit by message
 */
export async function findCommitByMessage(params: { text: string }): Promise<Response> {
    const {text} = params;
    log.debug(`Processing findCommitByMessage request with text: ${text}`);

    if (!text) {
        log.warn('Empty search text provided');
        return errorResponse('Search text cannot be empty');
    }

    return withGitRepository(async () => {
        // Escape search text to prevent command injection
        const escapedText = escapeShellArg(text);

        // Execute git log command to search for commits
        const command = `git log --grep="${escapedText}" --format="%H" -n 10`;
        log.debug(`Executing Git command: ${command}`);

        const result = await executeGitCommand(command);

        if (!result || result.exitCode !== 0) {
            const errorMsg = result && result.stderr ? result.stderr : 'Unknown error';
            log.error(`Failed to find commits: ${errorMsg}`);
            throw new Error(`Failed to find commits: ${errorMsg}`);
        }

        // Parse commit hashes
        const commits = result.stdout
            .split('\n')
            .filter((line: string) => line.trim() !== '');

        log.info(`Found ${commits.length} matching commits`);
        return successResponse(JSON.stringify(commits));
    });
}

// ==========================================
// Advanced Git Operations
// ==========================================

/**
 * Retrieve file modification history
 * @param params.pathInProject Path to the file
 * @param params.maxCount Maximum number of commits to retrieve
 * @returns File modification history
 */
export async function getFileHistory(params: { pathInProject: string, maxCount?: number }): Promise<Response> {
    const {pathInProject, maxCount = 10} = params;
    log.debug(`Processing getFileHistory request for file: ${pathInProject}`);

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
}

/**
 * Retrieve file differences between commits or current state
 * @param params.pathInProject Path to the file
 * @param params.hash1 First commit hash (optional)
 * @param params.hash2 Second commit hash (optional)
 * @returns File differences
 */
export async function getFileDiff(params: {
    pathInProject: string,
    hash1?: string,
    hash2?: string
}): Promise<Response> {
    const {pathInProject, hash1, hash2} = params;
    log.debug(`Processing getFileDiff request for file: ${pathInProject}`);

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
            log.error(`Failed to get file differences: ${result?.stderr || 'Unknown error'}`);
            throw new Error(result?.stderr || 'Failed to get file differences');
        }

        log.info(`Successfully retrieved diff for file: ${pathInProject}`);
        return successResponse({
            file: pathInProject,
            diff: result.stdout
        });
    });
}

/**
 * Retrieve current branch information
 * @returns Branch details including current branch and all branches
 */
export async function getBranchInfo(): Promise<Response> {
    log.debug('Processing getBranchInfo request');
    
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
}

/**
 * Retrieve specific commit details
 * @param params.hash Commit hash
 * @returns Detailed commit information
 */
export async function getCommitDetails(params: { hash: string }): Promise<Response> {
    const {hash} = params;
    log.debug(`Processing getCommitDetails request for hash: ${hash}`);

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
                return match
                    ? {
                        status: getChangeStatusDescription(match[1] || ''),
                        path: match[2] || ''
                    }
                    : null;
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
}

/**
 * Commit changes to the repository
 * @param params.message Commit message
 * @param params.amend Flag to amend the previous commit
 * @returns Commit operation result
 */
export async function commitChanges(params: { message: string, amend?: boolean }): Promise<Response> {
    const {message, amend = false} = params;
    log.debug(`Processing commitChanges request with message: "${message}", amend: ${amend}`);

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
}

/**
 * Pull changes from remote repository
 * @param params.remote Remote repository name (default: 'origin')
 * @param params.branch Branch name (optional)
 * @returns Pull operation result
 */
export async function pullChanges(params: { remote?: string, branch?: string }): Promise<Response> {
    const {remote = 'origin', branch} = params;
    log.debug(`Processing pullChanges request from remote: ${remote}${branch ? `, branch: ${branch}` : ''}`);

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
}

/**
 * Switch to a specific branch
 * @param params.branch Branch name to switch to
 * @returns Branch switch operation result
 */
export async function switchBranch(params: { branch: string }): Promise<Response> {
    const {branch} = params;
    log.debug(`Processing switchBranch request to branch: ${branch}`);

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
}

/**
 * Create a new branch
 * @param params.branch New branch name
 * @param params.startPoint Starting point for the new branch (optional)
 * @returns Branch creation operation result
 */
export async function createBranch(params: { branch: string, startPoint?: string }): Promise<Response> {
    const {branch, startPoint} = params;
    log.debug(`Processing createBranch request for branch: ${branch}${startPoint ? ` from ${startPoint}` : ''}`);

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
}