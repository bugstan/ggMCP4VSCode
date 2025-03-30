/**
 * JSON Schema object definition
 */
export interface JsonSchemaObject {
    type: string;
    properties: Record<string, any>;
    required?: string[];
}

/**
 * Tool interface definition
 */
export interface McpTool<Args = Record<string, any>> {
    name: string;
    description: string;
    inputSchema: JsonSchemaObject;

    handle(args: Args): Promise<import('./index').Response>;
}

/**
 * No arguments object
 */
export const NoArgs: Record<string, never> = {};
