// ============================================================================
// MCP Protocol Compliant Types
// See: https://modelcontextprotocol.io/docs/concepts/tools
// ============================================================================

/**
 * MCP Content item - represents a piece of content in a tool result
 * See: https://modelcontextprotocol.io/docs/concepts/tools#tool-result
 */
export interface McpContent {
    /** Content type: text, image, audio, resource_link, or resource */
    type: 'text' | 'image' | 'audio' | 'resource_link' | 'resource';
    /** Text content (for type: text) */
    text?: string;
    /** Base64-encoded data (for type: image, audio) */
    data?: string;
    /** MIME type (for type: image, audio) */
    mimeType?: string;
    /** Resource URI (for type: resource_link) */
    uri?: string;
    /** Resource name (for type: resource_link) */
    name?: string;
    /** Resource description (for type: resource_link) */
    description?: string;
    /** Embedded resource (for type: resource) */
    resource?: {
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
    };
    /** Content annotations */
    annotations?: {
        audience?: ('user' | 'assistant')[];
        priority?: number;
    };
}

/**
 * MCP Tool Result - the standard response format for tool calls
 * This is the main Response type used throughout the application
 * See: https://modelcontextprotocol.io/docs/concepts/tools#tool-result
 */
export interface Response {
    /** Array of content items */
    content: McpContent[];
    /** Whether this result represents an error */
    isError?: boolean;
    /** Structured content (optional, for outputSchema support) */
    structuredContent?: Record<string, unknown>;
}

/**
 * Alias for Response - for clarity when referring to MCP tool results
 */
export type McpToolResult = Response;

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
