import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { FileReloader } from '../utils/fileReloader';

/**
 * 获取当前在编辑器中打开的文件的文本内容
 */
export async function getOpenInEditorFileText(): Promise<Response> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return successResponse(''); // 没有打开的文件，返回空字符串
        }
        
        const document = editor.document;
        return successResponse(document.getText());
    } catch (error) {
        return errorResponse(`获取文件文本时出错: ${formatError(error)}`);
    }
}

/**
 * 获取当前在编辑器中打开的文件的路径
 */
export async function getOpenInEditorFilePath(): Promise<Response> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return successResponse(''); // 没有打开的文件，返回空字符串
        }
        
        const document = editor.document;
        return successResponse(document.uri.fsPath);
    } catch (error) {
        return errorResponse(`获取文件路径时出错: ${formatError(error)}`);
    }
}

/**
 * 获取当前在编辑器中选择的文本
 */
export async function getSelectedInEditorText(): Promise<Response> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return successResponse(''); // 没有打开的编辑器，返回空字符串
        }
        
        // 获取所有选择区域的文本
        const selectedText = editor.selections
            .map((selection: vscode.Selection) => editor.document.getText(selection))
            .join('\n');
            
        return successResponse(selectedText);
    } catch (error) {
        return errorResponse(`获取选择的文本时出错: ${formatError(error)}`);
    }
}

/**
 * 替换当前在编辑器中选择的文本
 */
export async function replaceSelectedText(params: { text: string }): Promise<Response> {
    try {
        const { text } = params;
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return errorResponse('no text selected');
        }
        
        // 检查是否有选定的文本
        if (editor.selections.every((selection: vscode.Selection) => selection.isEmpty)) {
            return errorResponse('no text selected');
        }
        
        // 检查文档是否有未保存的更改
        if (editor.document.isDirty) {
            // 可以选择自动保存或返回错误
            // 这里选择返回错误，要求用户明确保存更改
            return errorResponse('文档有未保存的更改，请先保存文档');
        }
        
        // 替换所有选定的文本
        await editor.edit(editBuilder => {
            editor.selections.forEach((selection: vscode.Selection) => {
                editBuilder.replace(selection, text);
            });
        });
        
        // 可以选择自动保存文档
        await editor.document.save();
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`替换选定文本时出错: ${formatError(error)}`);
    }
}

/**
 * 替换当前文件的全部内容
 */
export async function replaceCurrentFileText(params: { text: string }): Promise<Response> {
    try {
        const { text } = params;
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return errorResponse('no file open');
        }
        
        // 检查文档是否有未保存的更改
        if (editor.document.isDirty) {
            // 可以选择自动保存或返回错误
            // 这里选择返回错误，要求用户明确保存更改
            return errorResponse('文档有未保存的更改，请先保存文档');
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
        
        // 保存文件
        await document.save();
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`替换文件内容时出错: ${formatError(error)}`);
    }
}

/**
 * 获取所有打开文件的文本
 */
export async function getAllOpenFileTexts(): Promise<Response> {
    try {
        // 获取所有打开的文本编辑器
        const editors = vscode.window.visibleTextEditors;
        
        if (editors.length === 0) {
            return successResponse(JSON.stringify([]));
        }
        
        // 提取文本内容
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const filesData = editors.map((editor: vscode.TextEditor) => {
            const document = editor.document;
            const relativePath = projectRoot 
                ? vscode.workspace.asRelativePath(document.uri.fsPath)
                : document.uri.fsPath;
            
            return {
                path: relativePath,
                text: document.getText()
            };
        });
        
        return successResponse(JSON.stringify(filesData));
    } catch (error) {
        return errorResponse(`获取打开文件文本时出错: ${formatError(error)}`);
    }
}

/**
 * 获取所有打开文件的路径
 */
export async function getAllOpenFilePaths(): Promise<Response> {
    try {
        // 获取所有打开的文本编辑器
        const editors = vscode.window.visibleTextEditors;

        console.log("当前打开的编辑器数量:", vscode.window.visibleTextEditors.length);
        vscode.window.visibleTextEditors.forEach(editor => {
            console.log("打开的文件:", editor.document.uri.fsPath);
        });
        
        if (editors.length === 0) {
            return successResponse('');
        }
        
        // 提取文件路径
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const paths = editors.map((editor: vscode.TextEditor) => {
            const document = editor.document;
            return projectRoot 
                ? vscode.workspace.asRelativePath(document.uri.fsPath)
                : document.uri.fsPath;
        });
        
        return successResponse(paths.join('\n'));
    } catch (error) {
        return errorResponse(`获取打开文件路径时出错: ${formatError(error)}`);
    }
}

/**
 * 在编辑器中打开文件
 */
export async function openFileInEditor(params: { filePath: string }): Promise<Response> {
    try {
        const { filePath } = params;
        let fileUri: vscode.Uri;
        
        // 检查路径是绝对路径还是项目相对路径
        if (path.isAbsolute(filePath)) {
            fileUri = vscode.Uri.file(filePath);
        } else {
            const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!projectRoot) {
                return errorResponse("can't find project dir");
            }
            const absolutePath = path.join(projectRoot, filePath);
            fileUri = vscode.Uri.file(absolutePath);
        }
        
        try {
            // 检查文件是否存在
            await vscode.workspace.fs.stat(fileUri);
            
            // 检查文件是否已打开，如果已打开则重新加载
            const openDocuments = vscode.workspace.textDocuments.filter(
                doc => doc.uri.fsPath === fileUri.fsPath
            );
            
            if (openDocuments.length > 0) {
                // 文件已经打开，重新加载以确保最新内容
                await FileReloader.reloadFile(fileUri.fsPath);
            }
            
            // 打开文件
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
            
            return successResponse('file is opened');
        } catch (err) {
            return errorResponse("file doesn't exist or can't be opened");
        }
    } catch (error) {
        return errorResponse(`打开文件时出错: ${formatError(error)}`);
    }
}