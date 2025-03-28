import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { isPathWithinProject } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('CodeAnalysisHandlers');

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
 * Get all symbols from a file (functions, classes, variables, etc.)
 */
export async function getSymbolsInFile(params: { pathInProject: string }): Promise<Response> {
    try {
        const { pathInProject } = params;
        log.debug('Getting symbols in file', { path: pathInProject });
        
        // Get project root path
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            log.warn('Project directory not found');
            return createResponse(null, "project dir not found");
        }
        
        // Build complete file path
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        // Safety check: ensure path is within the project directory
        if (!isPathWithinProject(filePath, projectRoot)) {
            log.warn('Path is outside project directory', { path: filePath });
            return createResponse(null, "path is outside project directory");
        }
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // Ensure file exists
            await vscode.workspace.fs.stat(fileUri);
            
            // Open document, but don't show it in the editor
            const document = await vscode.workspace.openTextDocument(fileUri);
            
            // Get all symbols in the document
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider', 
                fileUri
            );
            
            if (!symbols || symbols.length === 0) {
                log.info('No symbols found in file', { path: filePath });
                return createResponse(JSON.stringify({ symbols: [] }));
            }
            
            // Convert symbols to a more usable format
            const formattedSymbols = formatSymbols(symbols, document);
            log.info(`Found ${formattedSymbols.length} symbols in file`, { path: filePath });
            
            return createResponse(JSON.stringify({ symbols: formattedSymbols }));
        } catch (err) {
            log.error('File not found or cannot be read', err, { path: filePath });
            return createResponse(null, `file not found or cannot be read: ${err}`);
        }
    } catch (error) {
        log.error('Error getting file symbols', error);
        return createResponse(null, `Error getting file symbols: ${formatError(error)}`);
    }
}

/**
 * Find all references to a symbol
 */
export async function findReferences(params: { 
    pathInProject: string, 
    line: number, 
    character: number 
}): Promise<Response> {
    try {
        const { pathInProject, line, character } = params;
        log.debug('Finding references', { path: pathInProject, line, character });
        
        // Get project root path
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            log.warn('Project directory not found');
            return createResponse(null, "project dir not found");
        }
        
        // Build complete file path
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        // Safety check: ensure path is within the project directory
        if (!isPathWithinProject(filePath, projectRoot)) {
            log.warn('Path is outside project directory', { path: filePath });
            return createResponse(null, "path is outside project directory");
        }
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // Ensure file exists
            await vscode.workspace.fs.stat(fileUri);
            
            // Open document, but don't show it in the editor - note we don't use the document variable, but need to ensure the file is loaded
            await vscode.workspace.openTextDocument(fileUri);
            
            // Create position object
            const position = new vscode.Position(line, character);
            
            // Get all references
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider', 
                fileUri, 
                position
            );
            
            if (!locations || locations.length === 0) {
                log.info('No references found', { path: filePath, line, character });
                return createResponse(JSON.stringify({ references: [] }));
            }
            
            // Convert locations to a more usable format
            const references = locations.map(location => {
                const uri = location.uri;
                const range = location.range;
                const relativePath = vscode.workspace.asRelativePath(uri.fsPath);
                
                return {
                    path: relativePath,
                    line: range.start.line,
                    character: range.start.character,
                    endLine: range.end.line,
                    endCharacter: range.end.character
                };
            });
            
            log.info(`Found ${references.length} references`, { path: filePath, line, character });
            return createResponse(JSON.stringify({ references }));
        } catch (err) {
            log.error('File not found or cannot be read', err, { path: filePath });
            return createResponse(null, `file not found or cannot be read: ${err}`);
        }
    } catch (error) {
        log.error('Error finding references', error);
        return createResponse(null, `Error finding references: ${formatError(error)}`);
    }
}

/**
 * Perform code refactoring at specific location
 */
export async function refactorCodeAtLocation(params: { 
    pathInProject: string, 
    line: number, 
    character: number,
    refactorType: string,
    options: any
}): Promise<Response> {
    try {
        const { pathInProject, line, character, refactorType, options } = params;
        log.debug('Refactoring code', { path: pathInProject, line, character, type: refactorType });
        
        // Get project root path
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            log.warn('Project directory not found');
            return createResponse(null, "project dir not found");
        }
        
        // Build complete file path
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        // Safety check: ensure path is within the project directory
        if (!isPathWithinProject(filePath, projectRoot)) {
            log.warn('Path is outside project directory', { path: filePath });
            return createResponse(null, "path is outside project directory");
        }
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // Ensure file exists
            await vscode.workspace.fs.stat(fileUri);
            
            // Open document and show it in the editor
            const document = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Set cursor position
            const position = new vscode.Position(line, character);
            editor.selection = new vscode.Selection(position, position);
            
            // Get available refactoring actions
            const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                fileUri,
                new vscode.Range(position, position),
                vscode.CodeActionKind.Refactor
            );
            
            if (!actions || actions.length === 0) {
                log.warn('No refactoring actions available', { path: filePath, line, character });
                return createResponse(null, "no refactoring actions available at this location");
            }
            
            // Find matching refactoring action
            let matchedAction: vscode.CodeAction | undefined;
            
            switch (refactorType.toLowerCase()) {
                case 'rename':
                    // Renaming a symbol is a special case, using a dedicated API
                    if (!options.newName) {
                        log.warn('newName is required for rename refactoring');
                        return createResponse(null, "newName is required for rename refactoring");
                    }
                    
                    // Use RenameProvider to get edits
                    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                        'vscode.executeDocumentRenameProvider',
                        fileUri,
                        position,
                        options.newName
                    );
                    
                    if (!workspaceEdit) {
                        log.error('Failed to generate rename edits');
                        return createResponse(null, "Failed to generate rename edits");
                    }
                    
                    // Apply edits directly, without relying on UI commands
                    const success = await vscode.workspace.applyEdit(workspaceEdit);
                    
                    if (!success) {
                        log.error('Failed to apply rename edits');
                        return createResponse(null, "Failed to apply rename edits");
                    }
                    
                    log.info('Successfully renamed symbol', { newName: options.newName });
                    return createResponse(JSON.stringify({ 
                        success: true, 
                        message: `Successfully renamed to ${options.newName}`
                    }));
                    
                case 'extract_function':
                case 'extractfunction':
                case 'extract-function':
                    matchedAction = actions.find(action => 
                        action.title.toLowerCase().includes('extract') && 
                        action.title.toLowerCase().includes('function')
                    );
                    break;
                    
                case 'extract_variable':
                case 'extractvariable':
                case 'extract-variable':
                    matchedAction = actions.find(action => 
                        action.title.toLowerCase().includes('extract') && 
                        action.title.toLowerCase().includes('variable')
                    );
                    break;
                    
                default:
                    // Try to match by title
                    matchedAction = actions.find(action => 
                        action.title.toLowerCase().includes(refactorType.toLowerCase())
                    );
            }
            
            if (!matchedAction) {
                // Return available refactoring types as part of the error message
                const availableRefactorings = actions.map(action => action.title).join(', ');
                log.warn('Refactoring type not available', { type: refactorType, available: availableRefactorings });
                return createResponse(null, `refactoring type '${refactorType}' not available at this location. Available types: ${availableRefactorings}`);
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
            
            log.info('Refactoring applied successfully', { type: matchedAction.title });
            return createResponse(JSON.stringify({ 
                success: true, 
                message: `Successfully applied '${matchedAction.title}' refactoring` 
            }));
        } catch (err) {
            log.error('File not found or refactoring failed', err, { path: filePath });
            return createResponse(null, `file not found or refactoring failed: ${err}`);
        }
    } catch (error) {
        log.error('Error refactoring code', error);
        return createResponse(null, `Error refactoring code: ${formatError(error)}`);
    }
}

/**
 * Recursively format symbol tree
 */
function formatSymbols(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument): SymbolInfo[] {
    return symbols.map(symbol => {
        const range = symbol.range;
        const selectionRange = symbol.selectionRange;
        
        // Get symbol text
        const text = document.getText(selectionRange);
        
        const result: SymbolInfo = {
            name: symbol.name,
            kind: translateSymbolKind(symbol.kind),
            range: {
                startLine: range.start.line,
                startCharacter: range.start.character,
                endLine: range.end.line,
                endCharacter: range.end.character
            },
            selectionRange: {
                startLine: selectionRange.start.line,
                startCharacter: selectionRange.start.character,
                endLine: selectionRange.end.line,
                endCharacter: selectionRange.end.character
            },
            text,
            detail: symbol.detail
        };
        
        // Recursively process child symbols
        if (symbol.children && symbol.children.length > 0) {
            result.children = formatSymbols(symbol.children, document);
        }
        
        return result;
    });
}

/**
 * Convert VSCode symbol kind to readable string
 */
function translateSymbolKind(kind: vscode.SymbolKind): string {
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
        [vscode.SymbolKind.TypeParameter]: 'TypeParameter'
    };
    
    return kindMap[kind] || 'Unknown';
}