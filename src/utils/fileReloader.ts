import * as vscode from 'vscode';
import * as path from 'path';
import { getProjectRoot } from './project';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('FileReloader');

/**
 * File reloader utility class
 * Used to reload open files after they have been modified remotely
 */
export class FileReloader {
    /**
     * Check if file has unsaved changes
     * @param filePath file path
     * @returns true if file has unsaved changes, false otherwise
     */
    public static hasUnsavedChanges(filePath: string): boolean {
        try {
            // Ensure file path is absolute
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                const rootPath = getProjectRoot();
                if (rootPath) {
                    absolutePath = path.join(rootPath, filePath);
                } else {
                    log.debug(`Could not determine project root for relative path: ${filePath}`);
                    return false;
                }
            }
            
            // Create file URI
            const uri = vscode.Uri.file(absolutePath);
            
            // Find open document
            const document = vscode.workspace.textDocuments.find(
                doc => doc.uri.fsPath === uri.fsPath
            );
            
            // Check if document has unsaved changes
            const isDirty = document ? document.isDirty : false;
            log.debug(`File ${absolutePath} has unsaved changes: ${isDirty}`);
            return isDirty;
        } catch (error) {
            log.error('Error checking file change status:', error);
            return false;
        }
    }

    /**
     * Reload specified file
     * @param filePath file path (can be absolute or relative to project)
     * @returns whether reload was successful
     */
    public static async reloadFile(filePath: string): Promise<boolean> {
        try {
            // Get configuration, check if auto reload is enabled
            const config = vscode.workspace.getConfiguration('ggMCP');
            const autoReload = config.get<boolean>('autoReloadModifiedFiles', true);
            
            if (!autoReload) {
                // If auto reload is disabled, don't do anything, let VS Code default mechanism handle it
                log.debug(`Auto reload is disabled for file: ${filePath}`);
                return false;
            }
            
            // Ensure file path is absolute
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                const rootPath = getProjectRoot();
                if (rootPath) {
                    absolutePath = path.join(rootPath, filePath);
                } else {
                    log.warn(`Could not determine project root for relative path: ${filePath}`);
                    return false;
                }
            }
            
            // Create file URI
            const uri = vscode.Uri.file(absolutePath);
            
            // Find open editors
            const editors = vscode.window.visibleTextEditors.filter(
                editor => editor.document.uri.fsPath === uri.fsPath
            );
            
            if (editors.length > 0) {
                log.info(`Reloading file that is open in editor: ${absolutePath}`);
                // File is already open in an editor
                for (const editor of editors) {
                    // Get current scroll position and selection, to restore after reload
                    const selection = editor.selection;
                    const visibleRanges = editor.visibleRanges;
                    
                    try {
                        // Try closing and reopening document to ensure content is reloaded from disk
                        // This is more reliable than using WorkspaceEdit because it forces rereading from disk
                        
                        // Save editor view information
                        const viewColumn = editor.viewColumn;
                        
                        log.debug(`Closing and reopening document: ${absolutePath}`);
                        
                        // Close document
                        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                        
                        // Reopen document
                        const document = await vscode.workspace.openTextDocument(uri);
                        const newEditor = await vscode.window.showTextDocument(document, {
                            viewColumn: viewColumn,
                            preserveFocus: true,
                            preview: false
                        });
                        
                        // Restore selection and scroll position
                        if (newEditor) {
                            newEditor.selection = selection;
                            if (visibleRanges.length > 0) {
                                const firstRange = visibleRanges[0];
                                if (firstRange) {
                                    newEditor.revealRange(firstRange);
                                }
                            }
                            log.debug(`Successfully reloaded file: ${absolutePath}`);
                        }
                        
                        return true;
                    } catch (err) {
                        log.warn('Failed to close and reopen document, trying edit operation', err);
                        
                        // If close and reopen fails, fall back to edit method
                        try {
                            log.debug(`Using edit operation to reload: ${absolutePath}`);
                            
                            // Use WorkspaceEdit to reload document content
                            const content = await vscode.workspace.fs.readFile(uri);
                            const text = new TextDecoder().decode(content);
                            
                            // Use edit operation to replace entire document content
                            const edit = new vscode.WorkspaceEdit();
                            const fullRange = new vscode.Range(
                                0, 0, 
                                editor.document.lineCount, 
                                editor.document.lineAt(editor.document.lineCount - 1).range.end.character
                            );
                            edit.replace(uri, fullRange, text);
                            await vscode.workspace.applyEdit(edit);
                            
                            // Restore selection and scroll position
                            editor.selection = selection;
                            if (visibleRanges.length > 0) {
                                const firstRange = visibleRanges[0];
                                if (firstRange) {
                                    editor.revealRange(firstRange);
                                }
                            }
                            
                            log.debug(`Successfully reloaded file using edit operation: ${absolutePath}`);
                            return true;
                        } catch (editErr) {
                            log.error('Failed to reload file using edit operation', editErr);
                            return false;
                        }
                    }
                }
                return true;
            } else {
                // File is not open in an editor, no need to handle
                log.debug(`File not open in editor, no need to reload: ${absolutePath}`);
                return false;
            }
        } catch (error) {
            log.error('Error reloading file:', error);
            return false;
        }
    }
    
    /**
     * Reload multiple files
     * @param filePaths array of file paths
     * @returns number of successfully reloaded files
     */
    public static async reloadFiles(filePaths: string[]): Promise<number> {
        log.info(`Attempting to reload ${filePaths.length} files`);
        let successCount = 0;
        
        for (const filePath of filePaths) {
            const success = await FileReloader.reloadFile(filePath);
            if (success) {
                successCount++;
            }
        }
        
        log.info(`Successfully reloaded ${successCount}/${filePaths.length} files`);
        return successCount;
    }
}