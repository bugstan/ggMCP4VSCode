import * as vscode from 'vscode';
import * as path from 'path';
import { getProjectRoot } from './project';

/**
 * 文件重新加载工具类
 * 用于在远程修改文件后重新加载已打开的文件
 */
export class FileReloader {
    /**
     * 检查文件是否有未保存的更改
     * @param filePath 文件路径
     * @returns 如果文件有未保存的更改返回true，否则返回false
     */
    public static hasUnsavedChanges(filePath: string): boolean {
        try {
            // 确保文件路径是绝对路径
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                const rootPath = getProjectRoot();
                if (rootPath) {
                    absolutePath = path.join(rootPath, filePath);
                } else {
                    return false;
                }
            }
            
            // 创建文件URI
            const uri = vscode.Uri.file(absolutePath);
            
            // 查找已打开的文档
            const document = vscode.workspace.textDocuments.find(
                doc => doc.uri.fsPath === uri.fsPath
            );
            
            // 检查文档是否有未保存的更改
            return document ? document.isDirty : false;
        } catch (error) {
            console.error('检查文件更改状态时出错:', error);
            return false;
        }
    }

    /**
     * 重新加载指定文件
     * @param filePath 文件路径（可以是绝对路径或项目相对路径）
     * @returns 是否成功重新加载
     */
    public static async reloadFile(filePath: string): Promise<boolean> {
        try {
            // 获取配置，检查是否启用自动重新加载
            const config = vscode.workspace.getConfiguration('ggMCP');
            const autoReload = config.get<boolean>('autoReloadModifiedFiles', true);
            
            if (!autoReload) {
                // 如果禁用了自动重新加载，则不做任何操作，让VS Code默认机制处理
                return false;
            }
            
            // 确保文件路径是绝对路径
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                const rootPath = getProjectRoot();
                if (rootPath) {
                    absolutePath = path.join(rootPath, filePath);
                } else {
                    return false;
                }
            }
            
            // 创建文件URI
            const uri = vscode.Uri.file(absolutePath);
            
            // 查找已打开的编辑器
            const editors = vscode.window.visibleTextEditors.filter(
                editor => editor.document.uri.fsPath === uri.fsPath
            );
            
            if (editors.length > 0) {
                // 文件已经打开在某个编辑器中
                for (const editor of editors) {
                    // 获取当前滚动位置和选择范围，以便重新加载后恢复
                    const selection = editor.selection;
                    const visibleRanges = editor.visibleRanges;
                    
                    try {
                        // 尝试关闭并重新打开文档来确保从磁盘重新加载内容
                        // 这比使用WorkspaceEdit更可靠，因为它会强制从磁盘重新读取
                        
                        // 保存编辑器视图信息
                        const viewColumn = editor.viewColumn;
                        
                        // 关闭文档
                        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                        
                        // 重新打开文档
                        const document = await vscode.workspace.openTextDocument(uri);
                        const newEditor = await vscode.window.showTextDocument(document, {
                            viewColumn: viewColumn,
                            preserveFocus: true,
                            preview: false
                        });
                        
                        // 恢复选择范围和滚动位置
                        if (newEditor) {
                            newEditor.selection = selection;
                            if (visibleRanges.length > 0) {
                                const firstRange = visibleRanges[0];
                                if (firstRange) {
                                    newEditor.revealRange(firstRange);
                                }
                            }
                        }
                        
                        return true;
                    } catch (err) {
                        console.error('关闭并重新打开文档失败，尝试使用编辑操作', err);
                        
                        // 如果关闭重新打开失败，回退到编辑方式
                        try {
                            // 使用WorkspaceEdit方式重新加载文档内容
                            const content = await vscode.workspace.fs.readFile(uri);
                            const text = new TextDecoder().decode(content);
                            
                            // 使用编辑操作替换整个文档内容
                            const edit = new vscode.WorkspaceEdit();
                            const fullRange = new vscode.Range(
                                0, 0, 
                                editor.document.lineCount, 
                                editor.document.lineAt(editor.document.lineCount - 1).range.end.character
                            );
                            edit.replace(uri, fullRange, text);
                            await vscode.workspace.applyEdit(edit);
                            
                            // 恢复选择范围和滚动位置
                            editor.selection = selection;
                            if (visibleRanges.length > 0) {
                                const firstRange = visibleRanges[0];
                                if (firstRange) {
                                    editor.revealRange(firstRange);
                                }
                            }
                            
                            return true;
                        } catch (editErr) {
                            console.error('使用编辑操作重新加载文件失败', editErr);
                            return false;
                        }
                    }
                }
                return true;
            } else {
                // 文件没有在编辑器中打开，不需要处理
                return false;
            }
        } catch (error) {
            console.error('重新加载文件时出错:', error);
            return false;
        }
    }
    
    /**
     * 重新加载多个文件
     * @param filePaths 文件路径数组
     * @returns 成功重新加载的文件数量
     */
    public static async reloadFiles(filePaths: string[]): Promise<number> {
        let successCount = 0;
        
        for (const filePath of filePaths) {
            const success = await FileReloader.reloadFile(filePath);
            if (success) {
                successCount++;
            }
        }
        
        return successCount;
    }
}