import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 获取项目根目录
 * 如果有工作区则返回工作区根目录，否则返回当前文件所在目录
 * @returns 项目根目录路径或null
 */
export function getProjectRoot(): string | null {
    // 首先尝试获取工作区根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        // 确保安全访问
        const firstFolder = workspaceFolders[0];
        if (firstFolder) {
            return firstFolder.uri.fsPath;
        }
    }
    
    // 如果没有工作区，尝试使用当前打开文件的目录
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        return path.dirname(filePath);
    }
    
    // 没有工作区也没有打开的文件
    return null;
}

/**
 * 获取当前活动文件
 * @returns 活动文件路径或null
 */
export function getActiveFile(): string | null {
    const activeEditor = vscode.window.activeTextEditor;
    return activeEditor ? activeEditor.document.uri.fsPath : null;
}

/**
 * 获取当前工作目录
 * 优先返回工作区根目录，如果没有则返回当前文件所在目录
 * @returns 当前工作目录或null
 */
export function getCurrentDirectory(): string | null {
    // 首先尝试获取工作区根目录
    const workspaceRoot = getProjectRoot();
    if (workspaceRoot) {
        return workspaceRoot;
    }
    
    // 如果没有工作区，使用当前打开文件的目录
    const activeFile = getActiveFile();
    if (activeFile) {
        return path.dirname(activeFile);
    }
    
    return null;
}

/**
 * 生成UUID
 * @returns UUID字符串
 */
export function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}