/**
 * Git Types
 *
 * Type definitions for Git-related operations.
 * These types provide better type safety for Git repository interactions.
 */

import * as vscode from 'vscode';

/**
 * Git extension API types
 * Based on VSCode Git extension API
 */

/**
 * Git repository reference
 * Represents a Git repository in the workspace
 */
export interface GitRepository {
    /** Root path of the repository */
    readonly rootUri: vscode.Uri;

    /** Input box for commit messages */
    readonly inputBox: {
        value: string;
    };

    /** Current HEAD state */
    readonly state: GitRepositoryState;

    /** Show output channel */
    show(): void;

    /** Get configuration */
    getConfig(key: string): Promise<string>;

    /** Get object details */
    getObjectDetails(treeish: string, treePath: string): Promise<{ mode: string; object: string; size: number }>;

    /** Detect object type */
    detectObjectType(object: string): Promise<{ mimetype: string; encoding?: string }>;

    /** Buffer content */
    buffer(ref: string, filePath: string): Promise<Buffer>;

    /** Get commit count */
    getCommit(ref: string): Promise<GitCommit>;

    /** Clean working tree */
    clean(paths: string[]): Promise<void>;

    /** Apply changes */
    apply(patch: string, reverse?: boolean): Promise<void>;

    /** Diff operations */
    diff(cached?: boolean): Promise<string>;
    diffWithHEAD(path: string): Promise<string>;
    diffWith(ref: string, path: string): Promise<string>;
    diffIndexWithHEAD(path: string): Promise<string>;
    diffIndexWith(ref: string, path: string): Promise<string>;
    diffBlobs(object1: string, object2: string): Promise<string>;
    diffBetween(ref1: string, ref2: string, path: string): Promise<string>;

    /** Hash object */
    hashObject(data: string): Promise<string>;

    /** Get short hash */
    getShort(ref: string): Promise<string>;

    /** Status operations */
    status(): Promise<void>;

    /** Checkout */
    checkout(treeish: string): Promise<void>;

    /** Add files */
    add(paths: string[]): Promise<void>;

    /** Revert changes */
    revert(paths: string[]): Promise<void>;

    /** Commit */
    commit(message: string, opts?: { all?: boolean; amend?: boolean; signoff?: boolean; signCommit?: boolean; empty?: boolean }): Promise<void>;

    /** Branch operations */
    branch(name: string, checkout: boolean, ref?: string): Promise<void>;
    deleteBranch(name: string, force?: boolean): Promise<void>;
    renameBranch(name: string): Promise<void>;
    getBranch(name: string): Promise<GitBranch>;
    getBranches(query: { pattern?: string; count?: number; contains?: string }): Promise<GitRef[]>;
    setBranchUpstream(name: string, upstream: string): Promise<void>;

    /** Merge */
    merge(ref: string): Promise<void>;

    /** Tag operations */
    tag(name: string, upstream: string): Promise<void>;
    deleteTag(name: string): Promise<void>;

    /** Remote operations */
    fetch(remote?: string, ref?: string, depth?: number): Promise<void>;
    pull(unshallow?: boolean): Promise<void>;
    push(remoteName?: string, branchName?: string, setUpstream?: boolean, force?: boolean): Promise<void>;

    /** Blame */
    blame(path: string): Promise<string>;

    /** Log */
    log(options?: { maxEntries?: number; path?: string }): Promise<GitCommit[]>;

    /** Get remotes */
    getRemotes(): Promise<GitRemote[]>;
}

/**
 * Git repository state
 */
export interface GitRepositoryState {
    readonly HEAD: GitBranch | undefined;
    readonly refs: GitRef[];
    readonly remotes: GitRemote[];
    readonly submodules: GitSubmodule[];
    readonly rebaseCommit: GitCommit | undefined;
    readonly mergeChanges: GitChange[];
    readonly indexChanges: GitChange[];
    readonly workingTreeChanges: GitChange[];
    readonly onDidChange: vscode.Event<void>;
}

/**
 * Git branch
 */
export interface GitBranch {
    readonly name: string;
    readonly commit?: string;
    readonly upstream?: {
        readonly name: string;
        readonly commit?: string;
    };
    readonly type: GitBranchType;
}

/**
 * Git branch type
 */
export enum GitBranchType {
    Local = 0,
    Remote = 1,
}

/**
 * Git ref
 */
export interface GitRef {
    readonly name: string;
    readonly commit?: string;
    readonly type: GitRefType;
}

/**
 * Git ref type
 */
export enum GitRefType {
    Head = 0,
    RemoteHead = 1,
    Tag = 2,
}

/**
 * Git remote
 */
export interface GitRemote {
    readonly name: string;
    readonly fetchUrl?: string;
    readonly pushUrl?: string;
    readonly isReadOnly: boolean;
}

/**
 * Git submodule
 */
export interface GitSubmodule {
    readonly name: string;
    readonly path: string;
    readonly url: string;
}

/**
 * Git commit
 */
export interface GitCommit {
    readonly hash: string;
    readonly message: string;
    readonly parents: string[];
    readonly authorDate?: Date;
    readonly authorName?: string;
    readonly authorEmail?: string;
    readonly commitDate?: Date;
}

/**
 * Git change
 */
export interface GitChange {
    readonly uri: vscode.Uri;
    readonly originalUri: vscode.Uri;
    readonly renameUri: vscode.Uri | undefined;
    readonly status: GitStatus;
}

/**
 * Git status
 */
export enum GitStatus {
    INDEX_MODIFIED = 0,
    INDEX_ADDED = 1,
    INDEX_DELETED = 2,
    INDEX_RENAMED = 3,
    INDEX_COPIED = 4,
    MODIFIED = 5,
    DELETED = 6,
    UNTRACKED = 7,
    IGNORED = 8,
    INTENT_TO_ADD = 9,
    ADDED_BY_US = 10,
    ADDED_BY_THEM = 11,
    DELETED_BY_US = 12,
    DELETED_BY_THEM = 13,
    BOTH_ADDED = 14,
    BOTH_DELETED = 15,
    BOTH_MODIFIED = 16,
}

/**
 * Git extension API
 */
export interface GitExtension {
    readonly enabled: boolean;
    readonly onDidChangeEnablement: vscode.Event<boolean>;

    /**
     * Get the Git extension API
     * @param version API version (1)
     */
    getAPI(version: 1): GitAPI;
}

/**
 * Git API
 */
export interface GitAPI {
    readonly repositories: GitRepository[];
    readonly onDidOpenRepository: vscode.Event<GitRepository>;
    readonly onDidCloseRepository: vscode.Event<GitRepository>;
}
