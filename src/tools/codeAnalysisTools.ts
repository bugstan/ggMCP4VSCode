import { AbstractMcpTool } from '../types/tool';
import * as codeAnalysisHandlers from '../handlers/codeAnalysisHandlers';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('CodeAnalysisTools');

/**
 * Get symbols in file tool
 */
export class GetSymbolsInFileTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_symbols_in_file',
            'Get all symbols defined in the file (functions, classes, variables, etc.).',
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
        log.debug(`Delegating get_symbols_in_file request to handler`, { path: args.pathInProject });
        return await codeAnalysisHandlers.getSymbolsInFile(args);
    }
}

/**
 * Find references tool
 */
export class FindReferencesTool extends AbstractMcpTool {
    constructor() {
        super(
            'find_references',
            'Find all reference locations of a symbol.',
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
        log.debug(`Delegating find_references request to handler`, { 
            path: args.pathInProject, 
            line: args.line, 
            character: args.character 
        });
        return await codeAnalysisHandlers.findReferences(args);
    }
}

/**
 * Refactor code at location tool
 */
export class RefactorCodeAtLocationTool extends AbstractMcpTool {
    constructor() {
        super(
            'refactor_code_at_location',
            'Perform code refactoring at a specific location. Supports rename, extract function, extract variable, and other operations.',
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
        log.debug(`Delegating refactor_code_at_location request to handler`, { 
            path: args.pathInProject, 
            line: args.line, 
            character: args.character,
            type: args.refactorType
        });
        return await codeAnalysisHandlers.refactorCodeAtLocation(args);
    }
}