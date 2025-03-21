import { AbstractMcpTool } from '../types/tool';
import * as codeAnalysisHandlers from '../handlers/codeAnalysisHandlers';

/**
 * 获取文件中的所有符号工具
 */
export class GetSymbolsInFileTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_symbols_in_file',
            '获取文件中定义的所有符号（函数、类、变量等）。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    async handle(args: { pathInProject: string }): Promise<import('../types').Response> {
        return await codeAnalysisHandlers.getSymbolsInFile(args);
    }
}

/**
 * 查找符号的所有引用工具
 */
export class FindReferencesTool extends AbstractMcpTool {
    constructor() {
        super(
            'find_references',
            '查找符号的所有引用位置。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    line: { type: 'number' },
                    character: { type: 'number' }
                },
                required: ['pathInProject', 'line', 'character']
            }
        );
    }

    async handle(args: { pathInProject: string, line: number, character: number }): Promise<import('../types').Response> {
        return await codeAnalysisHandlers.findReferences(args);
    }
}

/**
 * 在特定位置执行代码重构工具
 */
export class RefactorCodeAtLocationTool extends AbstractMcpTool {
    constructor() {
        super(
            'refactor_code_at_location',
            '在特定位置执行代码重构。支持重命名、提取函数、提取变量等操作。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    line: { type: 'number' },
                    character: { type: 'number' },
                    refactorType: { type: 'string' },
                    options: { 
                        type: 'object',
                        properties: {
                            newName: { type: 'string' }
                        }
                    }
                },
                required: ['pathInProject', 'line', 'character', 'refactorType']
            }
        );
    }

    async handle(args: { 
        pathInProject: string, 
        line: number, 
        character: number,
        refactorType: string,
        options: any
    }): Promise<import('../types').Response> {
        return await codeAnalysisHandlers.refactorCodeAtLocation(args);
    }
}