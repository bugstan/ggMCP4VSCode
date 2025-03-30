import * as vscode from 'vscode';
import { Response } from '../types';
import { AbsCodeTools } from '../types/absCodeTools';
import { responseHandler } from '../server/responseHandler';

/**
 * Symbol information interface definition
 */
interface SymbolInfo {
    name: string;
    kind: string;
    range: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
    selectionRange: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
    text: string;
    detail: string;
    children?: SymbolInfo[];
}

/**
 * Get file symbols tool
 * Inherits from AbstractCodeTools base class to utilize common code analysis functionality
 */
export class GetSymbolsInFileTool extends AbsCodeTools {
    constructor() {
        super(
            'get_symbols_in_file',
            'Get all symbols defined in the file (functions, classes, variables, etc.).',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                },
                required: ['pathInProject'],
            }
        );
    }

    /**
     * Extract file path from arguments (implementing base class abstract method)
     */
    protected extractFilePathFromArgs(args: any): string {
        return args.pathInProject || '';
    }

    /**
     * Execute code analysis operation (implementing base class abstract method)
     */
    protected async executeCodeAnalysis(
        document: vscode.TextDocument,
        _position: vscode.Position | null,
        _args: any
    ): Promise<Response> {
        try {
            // Get all symbols in the file
            const symbols = await this.executeLanguageServiceCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (!symbols || symbols.length === 0) {
                return responseHandler.success(JSON.stringify({ symbols: [] }));
            }

            // Convert symbols to a more usable format
            const formattedSymbols = this.formatSymbols(symbols, document);

            return responseHandler.success(JSON.stringify({ symbols: formattedSymbols }));
        } catch (error) {
            this.log.error('Error getting file symbols', error);
            return responseHandler.failure(
                `Error getting file symbols: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Recursively format symbol tree
     */
    private formatSymbols(
        symbols: vscode.DocumentSymbol[],
        document: vscode.TextDocument
    ): SymbolInfo[] {
        return symbols.map((symbol) => {
            const range = symbol.range;
            const selectionRange = symbol.selectionRange;

            // Get symbol text
            const text = document.getText(selectionRange);

            const result: SymbolInfo = {
                name: symbol.name,
                kind: this.translateSymbolKind(symbol.kind),
                range: {
                    startLine: range.start.line,
                    startCharacter: range.start.character,
                    endLine: range.end.line,
                    endCharacter: range.end.character,
                },
                selectionRange: {
                    startLine: selectionRange.start.line,
                    startCharacter: selectionRange.start.character,
                    endLine: selectionRange.end.line,
                    endCharacter: selectionRange.end.character,
                },
                text,
                detail: symbol.detail,
            };

            // Recursively process child symbols
            if (symbol.children && symbol.children.length > 0) {
                result.children = this.formatSymbols(symbol.children, document);
            }

            return result;
        });
    }

    /**
     * Convert VSCode symbol kind to a readable string
     */
    private translateSymbolKind(kind: vscode.SymbolKind): string {
        const kindMap: Record<vscode.SymbolKind, string> = {
            [vscode.SymbolKind.File]: 'File',
            [vscode.SymbolKind.Module]: 'Module',
            [vscode.SymbolKind.Namespace]: 'Namespace',
            [vscode.SymbolKind.Package]: 'Package',
            [vscode.SymbolKind.Class]: 'Class',
            [vscode.SymbolKind.Method]: 'Method',
            [vscode.SymbolKind.Property]: 'Property',
            [vscode.SymbolKind.Field]: 'Field',
            [vscode.SymbolKind.Constructor]: 'Constructor',
            [vscode.SymbolKind.Enum]: 'Enum',
            [vscode.SymbolKind.Interface]: 'Interface',
            [vscode.SymbolKind.Function]: 'Function',
            [vscode.SymbolKind.Variable]: 'Variable',
            [vscode.SymbolKind.Constant]: 'Constant',
            [vscode.SymbolKind.String]: 'String',
            [vscode.SymbolKind.Number]: 'Number',
            [vscode.SymbolKind.Boolean]: 'Boolean',
            [vscode.SymbolKind.Array]: 'Array',
            [vscode.SymbolKind.Object]: 'Object',
            [vscode.SymbolKind.Key]: 'Key',
            [vscode.SymbolKind.Null]: 'Null',
            [vscode.SymbolKind.EnumMember]: 'EnumMember',
            [vscode.SymbolKind.Struct]: 'Struct',
            [vscode.SymbolKind.Event]: 'Event',
            [vscode.SymbolKind.Operator]: 'Operator',
            [vscode.SymbolKind.TypeParameter]: 'TypeParameter',
        };

        return kindMap[kind] || 'Unknown';
    }
}

/**
 * Find references tool
 * Inherits from AbstractCodeTools base class to utilize common code analysis functionality
 */
export class FindReferencesTool extends AbsCodeTools {
    constructor() {
        super('find_references', 'Find all reference locations of a symbol.', {
            type: 'object',
            properties: {
                pathInProject: { type: 'string' },
                line: { type: 'number' },
                character: { type: 'number' },
            },
            required: ['pathInProject', 'line', 'character'],
        });
    }

    /**
     * Extract file path from arguments (implementing base class abstract method)
     */
    protected extractFilePathFromArgs(args: any): string {
        return args.pathInProject || '';
    }

    /**
     * Execute code analysis operation (implementing base class abstract method)
     */
    protected async executeCodeAnalysis(
        document: vscode.TextDocument,
        position: vscode.Position | null,
        _args: any
    ): Promise<Response> {
        try {
            if (!position) {
                return responseHandler.failure('Invalid position');
            }

            // Get all references
            const locations = await this.executeLanguageServiceCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                document.uri,
                position
            );

            if (!locations || locations.length === 0) {
                return responseHandler.success(JSON.stringify({ references: [] }));
            }

            // Convert locations to a more usable format
            const references = locations.map((location) => {
                const uri = location.uri;
                const range = location.range;
                const relativePath = vscode.workspace.asRelativePath(uri.fsPath);

                return {
                    pathInProject: relativePath,
                    line: range.start.line,
                    character: range.start.character,
                    endLine: range.end.line,
                    endCharacter: range.end.character,
                };
            });

            return responseHandler.success(JSON.stringify({ references }));
        } catch (error) {
            this.log.error('Error finding references', error);
            return responseHandler.failure(
                `Error finding references: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

/**
 * Refactor code tool
 * Inherits from AbstractCodeTools base class to utilize common code analysis functionality
 */
export class RefactorCodeAtLocationTool extends AbsCodeTools {
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
                            newName: { type: 'string' },
                        },
                    },
                },
                required: ['pathInProject', 'line', 'character', 'refactorType'],
            }
        );
    }

    /**
     * Extract file path from arguments (implementing base class abstract method)
     */
    protected extractFilePathFromArgs(args: any): string {
        return args.pathInProject || '';
    }

    /**
     * Execute code analysis operation (implementing base class abstract method)
     */
    protected async executeCodeAnalysis(
        document: vscode.TextDocument,
        position: vscode.Position | null,
        args: any
    ): Promise<Response> {
        try {
            if (!position) {
                return responseHandler.failure('Invalid position');
            }

            // Show document and set cursor position
            const editor = await this.showDocumentAtPosition(document, position);
            this.log.info(`Found ${editor}`);

            // Get refactoring type and options
            const { refactorType, options } = args;

            // Get available refactoring actions
            const actions = await this.executeLanguageServiceCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                document.uri,
                new vscode.Range(position, position),
                vscode.CodeActionKind.Refactor
            );

            if (!actions || actions.length === 0) {
                return responseHandler.failure('no refactoring actions available at this location');
            }

            // Find matching refactoring action
            let matchedAction: vscode.CodeAction | undefined;

            switch (refactorType.toLowerCase()) {
                case 'rename':
                    // Renaming symbol is a special case, use dedicated API
                    if (!options || !options.newName) {
                        return responseHandler.failure(
                            'newName is required for rename refactoring'
                        );
                    }

                    // Use RenameProvider to get edits
                    const workspaceEdit =
                        await this.executeLanguageServiceCommand<vscode.WorkspaceEdit>(
                            'vscode.executeDocumentRenameProvider',
                            document.uri,
                            position,
                            options.newName
                        );

                    if (!workspaceEdit) {
                        return responseHandler.failure('Failed to generate rename edits');
                    }

                    // Apply edits directly, without UI command dependency
                    const success = await vscode.workspace.applyEdit(workspaceEdit);

                    if (!success) {
                        return responseHandler.failure('Failed to apply rename edits');
                    }

                    return responseHandler.success(
                        JSON.stringify({
                            success: true,
                            message: `Successfully renamed to ${options.newName}`,
                        })
                    );

                case 'extract_function':
                case 'extractfunction':
                case 'extract-function':
                    matchedAction = actions.find(
                        (action) =>
                            action.title.toLowerCase().includes('extract') &&
                            action.title.toLowerCase().includes('function')
                    );
                    break;

                case 'extract_variable':
                case 'extractvariable':
                case 'extract-variable':
                    matchedAction = actions.find(
                        (action) =>
                            action.title.toLowerCase().includes('extract') &&
                            action.title.toLowerCase().includes('variable')
                    );
                    break;

                default:
                    // Try to match by title
                    matchedAction = actions.find((action) =>
                        action.title.toLowerCase().includes(refactorType.toLowerCase())
                    );
            }

            if (!matchedAction) {
                // Return available refactoring types as part of the error message
                const availableRefactorings = actions.map((action) => action.title).join(', ');
                return responseHandler.failure(
                    `refactoring type '${refactorType}' not available at this location. Available types: ${availableRefactorings}`
                );
            }

            // Execute refactoring operation
            if (matchedAction.edit) {
                await vscode.workspace.applyEdit(matchedAction.edit);
            }

            if (matchedAction.command) {
                await vscode.commands.executeCommand(
                    matchedAction.command.command,
                    ...(matchedAction.command.arguments || [])
                );
            }

            return responseHandler.success(
                JSON.stringify({
                    success: true,
                    message: `Successfully applied '${matchedAction.title}' refactoring`,
                })
            );
        } catch (error) {
            this.log.error('Error refactoring code', error);
            return responseHandler.failure(
                `Error refactoring code: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
