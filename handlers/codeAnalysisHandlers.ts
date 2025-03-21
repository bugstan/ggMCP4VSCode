import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';

/**
 * 获取文件中的所有符号（函数、类、变量等）
 */
export async function getSymbolsInFile(params: { pathInProject: string }): Promise<Response> {
    try {
        const { pathInProject } = params;
        
        // 获取项目根路径
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            return errorResponse("project dir not found");
        }
        
        // 构建完整文件路径
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // 确保文件存在
            await vscode.workspace.fs.stat(fileUri);
            
            // 打开文档，但不显示在编辑器中
            const document = await vscode.workspace.openTextDocument(fileUri);
            
            // 获取文档中的所有符号
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider', 
                fileUri
            );
            
            if (!symbols || symbols.length === 0) {
                return successResponse(JSON.stringify({ symbols: [] }));
            }
            
            // 转换符号为更易用的格式
            const formattedSymbols = formatSymbols(symbols, document);
            
            return successResponse(JSON.stringify({ symbols: formattedSymbols }));
        } catch (err) {
            return errorResponse(`file not found or cannot be read: ${err}`);
        }
    } catch (error) {
        return errorResponse(`获取文件符号时出错: ${formatError(error)}`);
    }
}

/**
 * 查找符号的所有引用
 */
export async function findReferences(params: { 
    pathInProject: string, 
    line: number, 
    character: number 
}): Promise<Response> {
    try {
        const { pathInProject, line, character } = params;
        
        // 获取项目根路径
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            return errorResponse("project dir not found");
        }
        
        // 构建完整文件路径
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // 确保文件存在
            await vscode.workspace.fs.stat(fileUri);
            
            // 打开文档，但不显示在编辑器中
            const document = await vscode.workspace.openTextDocument(fileUri);
            
            // 创建位置对象
            const position = new vscode.Position(line, character);
            
            // 获取所有引用
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider', 
                fileUri, 
                position
            );
            
            if (!locations || locations.length === 0) {
                return successResponse(JSON.stringify({ references: [] }));
            }
            
            // 转换位置为更易用的格式
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
            
            return successResponse(JSON.stringify({ references }));
        } catch (err) {
            return errorResponse(`file not found or cannot be read: ${err}`);
        }
    } catch (error) {
        return errorResponse(`查找引用时出错: ${formatError(error)}`);
    }
}

/**
 * 在特定位置执行代码重构
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
        
        // 获取项目根路径
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) {
            return errorResponse("project dir not found");
        }
        
        // 构建完整文件路径
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        const fileUri = vscode.Uri.file(filePath);
        
        try {
            // 确保文件存在
            await vscode.workspace.fs.stat(fileUri);
            
            // 打开文档并显示在编辑器中
            const document = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(document);
            
            // 设置光标位置
            const position = new vscode.Position(line, character);
            editor.selection = new vscode.Selection(position, position);
            
            // 获取可用的重构操作
            const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                'vscode.executeCodeActionProvider',
                fileUri,
                new vscode.Range(position, position),
                vscode.CodeActionKind.Refactor
            );
            
            if (!actions || actions.length === 0) {
                return errorResponse("no refactoring actions available at this location");
            }
            
            // 查找匹配的重构操作
            let matchedAction: vscode.CodeAction | undefined;
            
            switch (refactorType.toLowerCase()) {
                case 'rename':
                    // 重命名符号是一个特殊情况，使用专用API
                    if (!options.newName) {
                        return errorResponse("newName is required for rename refactoring");
                    }
                    
                    // 执行重命名
                    await vscode.commands.executeCommand(
                        'vscode.executeDocumentRenameProvider',
                        fileUri,
                        position,
                        options.newName
                    );
                    
                    // 应用编辑
                    await vscode.commands.executeCommand(
                        'workbench.action.acceptRenameInput'
                    );
                    
                    return successResponse(JSON.stringify({ 
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
                    // 尝试根据标题匹配
                    matchedAction = actions.find(action => 
                        action.title.toLowerCase().includes(refactorType.toLowerCase())
                    );
            }
            
            if (!matchedAction) {
                // 返回可用的重构类型作为错误信息的一部分
                const availableRefactorings = actions.map(action => action.title).join(', ');
                return errorResponse(`refactoring type '${refactorType}' not available at this location. Available types: ${availableRefactorings}`);
            }
            
            // 执行重构操作
            if (matchedAction.edit) {
                await vscode.workspace.applyEdit(matchedAction.edit);
            }
            
            if (matchedAction.command) {
                await vscode.commands.executeCommand(
                    matchedAction.command.command,
                    ...(matchedAction.command.arguments || [])
                );
            }
            
            return successResponse(JSON.stringify({ 
                success: true, 
                message: `Successfully applied '${matchedAction.title}' refactoring` 
            }));
        } catch (err) {
            return errorResponse(`file not found or refactoring failed: ${err}`);
        }
    } catch (error) {
        return errorResponse(`重构代码时出错: ${formatError(error)}`);
    }
}

/**
 * 递归格式化符号树
 */
function formatSymbols(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument): any[] {
    return symbols.map(symbol => {
        const range = symbol.range;
        const selectionRange = symbol.selectionRange;
        
        // 获取符号的文本
        const text = document.getText(selectionRange);
        
        const result = {
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
        
        // 递归处理子符号
        if (symbol.children && symbol.children.length > 0) {
            result['children'] = formatSymbols(symbol.children, document);
        }
        
        return result;
    });
}

/**
 * 将VSCode符号类型转换为可读字符串
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