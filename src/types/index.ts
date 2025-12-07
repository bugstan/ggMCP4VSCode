/**
 * Unified response interface definition
 *
 * @template T - The type of the status data (defaults to string for MCP protocol compatibility)
 *
 * Note: The MCP protocol expects string responses, so most tools return stringified JSON.
 * Use Response<T> when you need type-safe internal responses.
 */
export interface Response<T = string | null> {
    /** Response data - typically a JSON string for MCP protocol or null on error */
    status: T;
    /** Error message if operation failed, null otherwise */
    error: string | null;
}

/**
 * Success response type - convenience type for successful responses
 */
export type SuccessResponse<T = string> = Response<T> & { error: null };

/**
 * Error response type - convenience type for error responses
 */
export type ErrorResponse = Response<null> & { error: string };

/**
 * Tool handler type definition
 */
export type ToolHandler = (args: any) => Promise<Response>;


/**
 * Common tool parameters type definitions
 */
export interface ToolParams {
    // File tool parameters
    createNewFileWithText: { pathInProject: string; text: string };
    findFilesByNameSubstring: { nameSubstring: string; caseSensitive?: boolean };
    getFileTextByPath: { pathInProject: string };
    rewriteFileContent: { pathInProject: string; text: string };
    replaceFileContentAtPosition: {
        pathInProject: string;
        startLine: number;
        endLine: number;
        content: string;
        offset?: number;
    };
    replaceSpecificText: {
        pathInProject: string;
        oldText: string;
        newText: string;
    };
    listFilesInFolder: { pathInProject: string };
    searchInFilesContent: { searchText: string; caseSensitive?: boolean };
    appendFileContent: {
        pathInProject: string;
        content: string;
    };

    // Project tool parameters
    getProjectModules: Record<string, never>;
    getProjectDependencies: Record<string, never>;

    // Editor tool parameters
    replaceSelectedText: { text: string };
    replaceCurrentFileText: { text: string };
    openFileInEditor: { pathInProject: string };

    // Debug tool parameters
    toggleDebuggerBreakpoint: { pathInProject: string; line: number };
    runConfiguration: { configName: string };

    // Terminal tool parameters
    executeTerminalCommand: { command: string };
    executeCommandWithOutput: { command: string };
    wait: { milliseconds: number };

    // Git basic tool parameters
    findCommitByMessage: { text: string };

    // Git advanced tool parameters
    getFileHistory: { pathInProject: string; maxCount?: number };
    getFileDiff: { pathInProject: string; hash1?: string; hash2?: string };
    getCommitDetails: { hash: string };
    commitChanges: { message: string; amend?: boolean };
    pullChanges: { remote?: string; branch?: string };
    switchBranch: { branch: string };
    createBranch: { branch: string; startPoint?: string };

    // Action tool parameters
    executeActionById: { actionId: string };

    // Code analysis tool parameters
    getSymbolsInFile: { pathInProject: string };
    findReferences: { pathInProject: string; line: number; character: number };
    refactorCodeAtLocation: {
        pathInProject: string;
        line: number;
        character: number;
        refactorType: string;
        options: Record<string, any>;
    };

    // New parameter
    runCommandOnBackground: {
        command: string;
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
    };
}
