/**
 * JSON Schema object definition
 */
export interface JsonSchemaObject {
    type: string;
    properties: Record<string, any>;
    required?: string[];
}

/**
 * Tool annotations for describing tool behavior
 * See: https://modelcontextprotocol.io/docs/concepts/tools#tool
 */
export interface McpToolAnnotations {
    /** Indicates the tool may have side effects (destructive operations) */
    destructive?: boolean;
    /** Indicates the tool is read-only and has no side effects */
    readOnly?: boolean;
    /** Indicates the tool may take a long time to complete */
    longRunning?: boolean;
    /** Custom annotations */
    [key: string]: unknown;
}

/**
 * Tool interface definition
 * Follows MCP Specification: https://modelcontextprotocol.io/docs/concepts/tools#tool
 */
export interface McpTool<Args = Record<string, any>> {
    /** Unique identifier for the tool */
    name: string;
    /** Human-readable description of functionality */
    description: string;
    /** JSON Schema defining expected input parameters */
    inputSchema: JsonSchemaObject;
    /** Optional human-readable name for display purposes */
    title?: string;
    /** Optional properties describing tool behavior */
    annotations?: McpToolAnnotations;

    handle(args: Args): Promise<import('./index').Response>;
}

/**
 * No arguments object
 */
export const NoArgs: Record<string, never> = {};
