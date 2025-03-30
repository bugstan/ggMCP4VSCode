import { AbsGitTools } from '../types/absGitTools';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';

/**
 * Get file modification history tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetFileHistoryTool extends AbsGitTools<ToolParams['getFileHistory']> {
    constructor() {
        super(
            'get_file_history',
            'Get the modification history of a specified file. Returns a list of commits with their hash, author, date, and message.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    maxCount: { type: 'number' },
                },
                required: ['pathInProject'],
            }
        );
    }

    /**
     * Execute Git get file history operation (implementing base class abstract method)
     */
    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['getFileHistory']
    ): Promise<Response> {
        try {
            const { pathInProject, maxCount = 10 } = args;

            // Prepare and validate path
            const { path: relativePath, isSafe } = await this.preparePath(pathInProject);
            if (!isSafe) {
                return responseHandler.failure('Path is outside project directory');
            }

            // Check if file exists in Git repository
            const checkCommand = `git ls-files --error-unmatch "${relativePath}"`;
            const checkResult = await this.executeGitCommand(checkCommand);
            if (checkResult.exitCode !== 0) {
                return responseHandler.failure(`File is not tracked by Git: ${relativePath}`);
            }

            const command = `git log --max-count=${maxCount} --format="%H|%an|%ad|%s" --date=short -- "${relativePath}"`;
            const result = await this.executeGitCommand(command);

            if (result.exitCode !== 0 || !result.stdout) {
                this.log.error(`Failed to get file history: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to get file history: ${result.stderr}`);
            }

            return this.parseCommandOutput(result.stdout, 'Failed to parse git log output');
        } catch (error) {
            this.log.error('Error getting file history', error);
            return responseHandler.failure(
                `Error getting file history: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Get file diff tool
 * Inherits from AbstractGitTools base class to utilize common git operation functionality
 */
export class GetFileDiffTool extends AbsGitTools<ToolParams['getFileDiff']> {
    constructor() {
        super(
            'get_file_diff',
            'Get the diff between two versions of a file. If no hashes are provided, returns the diff between the current version and the previous version.',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    hash1: { type: 'string', optional: true },
                    hash2: { type: 'string', optional: true },
                },
                required: ['pathInProject'],
            }
        );
    }

    /**
     * Execute git operation (implementing base class abstract method)
     */
    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['getFileDiff']
    ): Promise<Response> {
        try {
            const { pathInProject, hash1, hash2 } = args;

            // Prepare and validate path
            const {
                path: relativePath,
                absolutePath,
                isSafe,
            } = await this.preparePath(pathInProject);
            if (!absolutePath || !isSafe) {
                return responseHandler.failure('Path is outside project directory or invalid');
            }

            // Build git command
            let command = 'git diff';

            // Add hash arguments if provided
            if (hash1 && hash2) {
                command += ` ${hash1} ${hash2}`;
            } else if (hash1) {
                command += ` ${hash1}`;
            } else {
                // If no hashes provided, compare with HEAD~1
                command += ' HEAD~1 HEAD';
            }

            // Add file path
            command += ` -- "${relativePath}"`;

            // Execute command
            const result = await this.executeGitCommand(command);
            return responseHandler.success(result);
        } catch (err) {
            this.log.error(`Error getting file diff`, err);
            return responseHandler.failure(err instanceof Error ? err.message : String(err));
        }
    }
}

/**
 * Get branch information tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetBranchInfoTool extends AbsGitTools {
    constructor() {
        super(
            'get_branch_info',
            'Get current branch information and a list of all available branches. Includes local and remote branches.',
            {
                type: 'object',
                properties: {},
            }
        );
    }

    /**
     * Execute Git get branch info operation (implementing base class abstract method)
     */
    protected async executeGitOperation(_repository: any, _args: any): Promise<Response> {
        try {
            const command =
                'git branch -a --format="%(refname:short)|%(upstream:short)|%(objectname:short)"';
            const result = await this.executeGitCommand(command);

            if (result.exitCode !== 0 || !result.stdout) {
                this.log.error('Failed to get branch information');
                return responseHandler.failure('Failed to get branch information');
            }

            return this.parseCommandOutput(result.stdout, 'Failed to get branch information');
        } catch (error) {
            this.log.error('Error getting branch info', error);
            return responseHandler.failure(
                `Error getting branch info: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Get commit details tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class GetCommitDetailsTool extends AbsGitTools<ToolParams['getCommitDetails']> {
    constructor() {
        super(
            'get_commit_details',
            'Get detailed information for a specific commit, including author, date, commit message, and list of changed files.',
            {
                type: 'object',
                properties: {
                    hash: { type: 'string' },
                },
                required: ['hash'],
            }
        );
    }

    /**
     * Execute Git get commit details operation (implementing base class abstract method)
     */
    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['getCommitDetails']
    ): Promise<Response> {
        try {
            const { hash } = args;

            if (!hash) {
                this.log.warn('Empty commit hash provided');
                return responseHandler.failure('Commit hash cannot be empty');
            }

            // Validate commit hash
            const validateCommand = `git rev-parse --verify ${hash}`;
            const validateResult = await this.executeGitCommand(validateCommand);
            if (validateResult.exitCode !== 0) {
                return responseHandler.failure(`Invalid commit hash: ${hash}`);
            }

            const command = `git show --format="%H|%an|%ae|%ad|%s|%b" --name-status --date=iso ${hash}`;

            const result = await this.executeGitCommand(command);

            if (result.exitCode !== 0 || !result.stdout) {
                this.log.error(`Failed to get commit details: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to get commit details: ${result.stderr}`);
            }

            return this.parseCommandOutput(result.stdout, 'Failed to get commit details');
        } catch (error) {
            this.log.error('Error getting commit details', error);
            return responseHandler.failure(
                `Error getting commit details: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Commit changes tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class CommitChangesTool extends AbsGitTools<ToolParams['commitChanges']> {
    constructor() {
        super(
            'commit_changes',
            'Commit current changes. If amend is set to true, modify the last commit. Automatically stages unstaged changes.',
            {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    amend: { type: 'boolean' },
                },
                required: ['message'],
            }
        );
    }

    /**
     * Execute Git commit changes operation (implementing base class abstract method)
     */
    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['commitChanges']
    ): Promise<Response> {
        try {
            const { message, amend = false } = args;

            if (!message && !amend) {
                this.log.warn('Empty commit message provided');
                return responseHandler.failure('Commit message cannot be empty');
            }

            // Check repository status
            const statusResult = await this.executeGitCommand('git status --porcelain');

            if (statusResult.exitCode !== 0) {
                this.log.error(
                    `Failed to check repository status: ${statusResult.stderr || 'Unknown error'}`
                );
                return responseHandler.failure(
                    `Failed to check repository status: ${statusResult.stderr}`
                );
            }

            const hasUnstagedChanges = statusResult.stdout
                .split('\n')
                .some((line) => line.trim() !== '' && line.startsWith('??'));

            const hasChanges = statusResult.stdout.trim() !== '';

            // Stage changes if needed
            if (hasUnstagedChanges) {
                const stageResult = await this.executeGitCommand('git add .');
                if (stageResult.exitCode !== 0) {
                    this.log.error(
                        `Failed to stage changes: ${stageResult.stderr || 'Unknown error'}`
                    );
                    return responseHandler.failure(
                        `Failed to stage changes: ${stageResult.stderr}`
                    );
                }
            }

            // Validate commit
            if (!hasChanges && !amend) {
                this.log.warn('No changes to commit');
                return responseHandler.failure('No changes to commit');
            }

            // Prepare commit command
            const commitCommand = amend
                ? `git commit --amend -m "${message}"`
                : `git commit -m "${message}"`;

            // Execute commit
            const commitResult = await this.executeGitCommand(commitCommand);

            if (commitResult.exitCode !== 0) {
                if (commitResult.stderr?.includes('nothing to commit')) {
                    return responseHandler.failure('No changes to commit');
                }
                if (commitResult.stderr?.includes('no changes added to commit')) {
                    return responseHandler.failure('No changes staged for commit');
                }
                this.log.error(
                    `Failed to commit changes: ${commitResult.stderr || 'Unknown error'}`
                );
                return responseHandler.failure(`Failed to commit changes: ${commitResult.stderr}`);
            }

            return responseHandler.success(
                commitResult.stdout ||
                    (amend ? 'Modified previous commit' : 'Successfully committed changes')
            );
        } catch (error) {
            this.log.error('Error committing changes', error);
            return responseHandler.failure(
                `Error committing changes: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Pull changes tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class PullChangesTool extends AbsGitTools<ToolParams['pullChanges']> {
    constructor() {
        super(
            'pull_changes',
            'Pull changes from the remote repository. Can specify remote repository name and branch name.',
            {
                type: 'object',
                properties: {
                    remote: { type: 'string' },
                    branch: { type: 'string' },
                },
            }
        );
    }

    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['pullChanges']
    ): Promise<Response> {
        try {
            const { remote = 'origin', branch } = args;

            // Check if remote exists
            const remoteCheckCommand = `git remote get-url ${remote}`;
            const remoteCheckResult = await this.executeGitCommand(remoteCheckCommand);

            if (remoteCheckResult.exitCode !== 0) {
                return responseHandler.failure(`Remote '${remote}' does not exist`);
            }

            // Get current branch if no branch specified
            let targetBranch = branch;
            if (!targetBranch) {
                const currentBranchCommand = 'git rev-parse --abbrev-ref HEAD';
                const currentBranchResult = await this.executeGitCommand(currentBranchCommand);
                if (currentBranchResult.exitCode === 0 && currentBranchResult.stdout) {
                    targetBranch = currentBranchResult.stdout.trim();
                }
            }

            // Check if branch exists remotely
            if (targetBranch) {
                const branchCheckCommand = `git ls-remote --heads ${remote} ${targetBranch}`;
                const branchCheckResult = await this.executeGitCommand(branchCheckCommand);

                if (branchCheckResult.exitCode !== 0 || !branchCheckResult.stdout) {
                    return responseHandler.failure(
                        `Branch '${targetBranch}' does not exist in remote '${remote}'`
                    );
                }
            }

            // Check for uncommitted changes
            const statusCommand = 'git status --porcelain';
            const statusResult = await this.executeGitCommand(statusCommand);

            if (statusResult.exitCode === 0 && statusResult.stdout.trim() !== '') {
                return responseHandler.failure(
                    'Cannot pull changes: You have uncommitted changes. Please commit or stash them first.'
                );
            }

            // Prepare pull command
            const pullCommand = targetBranch
                ? `git pull ${remote} ${targetBranch}`
                : `git pull ${remote}`;

            const result = await this.executeGitCommand(pullCommand);

            if (result.exitCode !== 0) {
                if (result.stderr?.includes('CONFLICT')) {
                    return responseHandler.failure(
                        'Pull failed due to merge conflicts. Please resolve conflicts manually.'
                    );
                }
                if (result.stderr?.includes("fatal: couldn't find remote ref")) {
                    return responseHandler.failure(
                        `Remote branch '${targetBranch}' not found in remote '${remote}'`
                    );
                }
                this.log.error(`Failed to pull changes: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to pull changes: ${result.stderr}`);
            }

            return responseHandler.success(result.stdout || 'Successfully pulled changes');
        } catch (error) {
            this.log.error('Error pulling changes', error);
            return responseHandler.failure(
                `Error pulling changes: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Switch branch tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class SwitchBranchTool extends AbsGitTools<ToolParams['switchBranch']> {
    constructor() {
        super(
            'switch_branch',
            'Switch to the specified branch. Returns an error if the branch does not exist.',
            {
                type: 'object',
                properties: {
                    branch: { type: 'string' },
                },
                required: ['branch'],
            }
        );
    }

    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['switchBranch']
    ): Promise<Response> {
        try {
            const { branch } = args;

            if (!branch) {
                this.log.warn('Empty branch name provided');
                return responseHandler.failure('Branch name cannot be empty');
            }

            // Check for uncommitted changes
            const statusCommand = 'git status --porcelain';
            const statusResult = await this.executeGitCommand(statusCommand);

            if (statusResult.exitCode === 0 && statusResult.stdout.trim() !== '') {
                return responseHandler.failure(
                    'Cannot switch branch: You have uncommitted changes. Please commit or stash them first.'
                );
            }

            // Check if branch exists
            const branchCheckCommand = `git show-ref --verify --quiet refs/heads/${branch}`;
            const branchCheckResult = await this.executeGitCommand(branchCheckCommand);

            if (branchCheckResult.exitCode !== 0) {
                return responseHandler.failure(`Branch '${branch}' does not exist`);
            }

            const checkoutCommand = `git checkout ${branch}`;
            this.log.info(`Executing Git command: ${checkoutCommand}`);

            const result = await this.executeGitCommand(checkoutCommand);

            if (result.exitCode !== 0) {
                if (result.stderr?.includes('already exists')) {
                    return responseHandler.failure(`Branch '${branch}' already exists`);
                }
                if (result.stderr?.includes('not a valid object name')) {
                    return responseHandler.failure(`Invalid branch name: ${branch}`);
                }
                this.log.error(`Failed to switch branch: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to switch branch: ${result.stderr}`);
            }

            return responseHandler.success(result.stdout || `Switched to branch '${branch}'`);
        } catch (error) {
            this.log.error('Error switching branch', error);
            return responseHandler.failure(
                `Error switching branch: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Create branch tool
 * Inherits from AbstractGitTools base class to utilize common Git operation functionality
 */
export class CreateBranchTool extends AbsGitTools<ToolParams['createBranch']> {
    constructor() {
        super(
            'create_branch',
            'Create a new branch and switch to it. Can specify a starting point (commit hash or branch name).',
            {
                type: 'object',
                properties: {
                    branch: { type: 'string' },
                    startPoint: { type: 'string' },
                },
                required: ['branch'],
            }
        );
    }

    protected async executeGitOperation(
        _repository: any,
        args: ToolParams['createBranch']
    ): Promise<Response> {
        try {
            const { branch, startPoint } = args;
            this.log.info(`Creating branch: ${branch}${startPoint ? ` from ${startPoint}` : ''}`);

            if (!branch) {
                this.log.warn('Empty branch name provided');
                return responseHandler.failure('Branch name cannot be empty');
            }

            // Validate branch name
            if (!/^[a-zA-Z0-9\-_/\.]+$/.test(branch)) {
                return responseHandler.failure(
                    'Invalid branch name. Branch names can only contain letters, numbers, hyphens, underscores, forward slashes, and dots.'
                );
            }

            // Create branch command
            const createCommand = startPoint
                ? `git checkout -b ${branch} ${startPoint}`
                : `git checkout -b ${branch}`;

            this.log.info(`Executing Git command: ${createCommand}`);

            const result = await this.executeGitCommand(createCommand);

            if (result.exitCode !== 0) {
                if (result.stderr?.includes('already exists')) {
                    return responseHandler.failure(`Branch '${branch}' already exists`);
                }
                if (result.stderr?.includes('not a valid object name')) {
                    return responseHandler.failure(`Invalid start point: ${startPoint}`);
                }
                this.log.error(`Failed to create branch: ${result.stderr || 'Unknown error'}`);
                return responseHandler.failure(`Failed to create branch: ${result.stderr}`);
            }

            return responseHandler.success(
                result.stdout || `Created and switched to new branch '${branch}'`
            );
        } catch (error) {
            this.log.error('Error creating branch', error);
            return responseHandler.failure(
                `Error creating branch: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
