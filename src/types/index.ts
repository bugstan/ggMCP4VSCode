/**
 * Unified response interface definition
 */
export interface Response {
    status: any | null;
    error: string | null;
}

/**
 * Tool handler type definition
 */
export type ToolHandler = (args: any) => Promise<Response>;

/**
 * Common tool parameters type definitions
 */
export interface ToolParams {
    // File tool parameters
    createNewFileWithText: { pathInProject: string, text: string };
    findFilesByNameSubstring: { nameSubstring: string };
    getFileTextByPath: { pathInProject: string };
    replaceFileTextByPath: { pathInProject: string, text: string };
    listFilesInFolder: { pathInProject: string };
    searchInFilesContent: { searchText: string };

    // Editor tool parameters
    replaceSelectedText: { text: string };
    replaceCurrentFileText: { text: string };
    openFileInEditor: { filePath: string };

    // Debug tool parameters
    toggleDebuggerBreakpoint: { filePathInProject: string, line: number };
    runConfiguration: { configName: string };

    // Terminal tool parameters
    executeTerminalCommand: { command: string };
    executeCommandWithOutput: { command: string };
    wait: { milliseconds: number };

    // Git basic tool parameters
    findCommitByMessage: { text: string };

    // Git advanced tool parameters
    getFileHistory: { pathInProject: string, maxCount?: number };
    getFileDiff: { pathInProject: string, hash1?: string, hash2?: string };
    getCommitDetails: { hash: string };
    commitChanges: { message: string, amend?: boolean };
    pullChanges: { remote?: string, branch?: string };
    switchBranch: { branch: string };
    createBranch: { branch: string, startPoint?: string };

    // Action tool parameters
    executeActionById: { actionId: string };

    // Code analysis tool parameters
    getSymbolsInFile: { pathInProject: string };
    findReferences: { pathInProject: string, line: number, character: number };
    refactorCodeAtLocation: {
        pathInProject: string,
        line: number,
        character: number,
        refactorType: string,
        options: Record<string, any>
    };

    // New parameter
    runCommandOnBackground: {
        command: string;
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
    };
}
