/**
 * JSON Schema 对象定义
 */
export interface JsonSchemaObject {
    type: string;
    properties: Record<string, any>;
    required?: string[];
}

/**
 * 工具接口定义
 */
export interface McpTool<Args = Record<string, any>> {
    name: string;
    description: string;
    inputSchema: JsonSchemaObject;
    handle(args: Args): Promise<import('./index').Response>;
}

/**
 * 抽象工具基类
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
 * 无参数对象
 */
export const NoArgs: Record<string, never> = {};