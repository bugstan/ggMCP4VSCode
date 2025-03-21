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
 * Abstract tool base class
 */
export abstract class AbstractMcpTool<Args = Record<string, any>> implements McpTool<Args> {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: JsonSchemaObject;

    constructor(name: string, description: string, inputSchema: JsonSchemaObject) {
        this.name = name;
        this.description = description;
        this.inputSchema = inputSchema;
    }

    abstract handle(args: Args): Promise<import('./index').Response>;
}

/**
 * No arguments object
 */
export const NoArgs: Record<string, never> = {};