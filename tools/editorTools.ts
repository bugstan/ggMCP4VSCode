import * as vscode from 'vscode';
import { AbstractMcpTool, JsonSchemaObject } from '../types/tool';
import { Response, ToolParams } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { normalizePath } from '../utils/pathUtils';

// 确保可选链和空值合并的使用
const emptySchema: JsonSchemaObject = {
    type: 'object', 
    properties: {}
};

/**
 * 获取当前在编辑器中打开的文件的文本内容
 */
export class GetOpenInEditorFileTextTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_open_in_editor_file_text',
            '获取当前在编辑器中打开的文件的完整文本内容。返回空字符串如果没有文件打开。',
            emptySchema
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return successResponse('');
            }
            
            const document = editor.document;
            const text = document.getText();
            
            return successResponse(text);
        } catch (error) {
            return errorResponse(`获取文件内容时出错: ${formatError(error)}`);
        }
    }
}

/**
 * 获取当前在编辑器中打开的文件的路径
 */
export class GetOpenInEditorFilePathTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_open_in_editor_file_path',
            '获取当前在编辑器中打开的文件的绝对路径。返回空字符串如果没有文件打开。',
            emptySchema
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return successResponse('');
            }
            
            const filePath = editor.document.uri.fsPath;
            
            return successResponse(filePath);
        } catch (error) {
            return errorResponse(`获取文件路径时出错: ${formatError(error)}`);
        }
    }
}

/**
 * 替换选择的文本
 */
export class ReplaceSelectedTextTool extends AbstractMcpTool<ToolParams['replaceSelectedText']> {
    constructor() {
        super(
            'replace_selected_text',
            '替换当前在编辑器中选择的文本。如果没有选择文本或没有打开编辑器，则返回错误。',
            {
                type: 'object',
                properties: {
                    text: { type: 'string' }
                },
                required: ['text']
            }
        );
    }

    async handle(args: ToolParams['replaceSelectedText']): Promise<Response> {
        try {
            const { text } = args;
            const editor = vscode.window.activeTextEditor;
            
            if (!editor) {
                return errorResponse('no active editor');
            }
            
            // 检查是否有选定的文本
            if (editor.selections.every((selection: vscode.Selection) => selection.isEmpty)) {
                return errorResponse('no text selected');
            }
            
            // 替换所有选定的文本
            await editor.edit(editBuilder => {
                editor.selections.forEach((selection: vscode.Selection) => {
                    editBuilder.replace(selection, text);
                });
            });
            
            return successResponse('ok');
        } catch (error) {
            return errorResponse(`替换选定文本时出错: ${formatError(error)}`);
        }
    }
}

/**
 * 替换当前文件的全部内容
 */
export class ReplaceCurrentFileTextTool extends AbstractMcpTool<ToolParams['replaceCurrentFileText']> {
    constructor() {
        super(
            'replace_current_file_text',
            '替换当前在编辑器中打开的文件的全部内容。如果没有打开文件，则返回错误。',
            {
                type: 'object',
                properties: {
                    text: { type: 'string' }
                },
                required: ['text']
            }
        );
    }

    async handle(args: ToolParams['replaceCurrentFileText']): Promise<Response> {
        try {
            const { text } = args;
            const editor = vscode.window.activeTextEditor;
            
            if (!editor) {
                return errorResponse('no file open');
            }
            
            // 创建一个选择，包含文件的全部内容
            const document = editor.document;
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
            );
            
            // 替换全部内容
            await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, text);
            });
            
            return successResponse('ok');
        } catch (error) {
            return errorResponse(`替换文件内容时出错: ${formatError(error)}`);
        }
    }
}

/**
 * 在编辑器中打开文件
 */
export class OpenFileInEditorTool extends AbstractMcpTool<ToolParams['openFileInEditor']> {
    constructor() {
        super(
            'open_file_in_editor',
            '在编辑器中打开指定文件。如果文件不存在或无法打开，则返回错误。',
            {
                type: 'object',
                properties: {
                    filePath: { type: 'string' }
                },
                required: ['filePath']
            }
        );
    }

    async handle(args: ToolParams['openFileInEditor']): Promise<Response> {
        try {
            const { filePath } = args;
            const normalizedPath = normalizePath(filePath);
            
            try {
                const fileUri = vscode.Uri.file(normalizedPath);
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);
                
                return successResponse('file is opened');
            } catch (err) {
                return errorResponse('file doesn\'t exist or can\'t be opened');
            }
        } catch (error) {
            return errorResponse(`打开文件时出错: ${formatError(error)}`);
        }
    }
}