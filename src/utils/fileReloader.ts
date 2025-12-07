import * as vscode from 'vscode';
import * as path from 'path';
import { getProjectRoot } from './pathUtils';
import { Logger } from './logger';
import { FileCache } from '../server/cache';
import { Defaults } from '../config/defaults';

// Create module-specific logger
const log = Logger.forModule('FileReloader');

/**
 * File reloader utility class
 * Used to reload files in the editor after they are modified
 */
export class FileReloader {
    /**
     * Check if file has unsaved changes
     * @param filePath File path
     * @returns true if file has unsaved changes, false otherwise
     */
    public static hasUnsavedChanges(filePath: string): boolean {
        try {
            const uri = this.getFileUri(filePath);
            if (!uri) return false;

            // Find open document
            const document = vscode.workspace.textDocuments.find(
                (doc) => doc.uri.fsPath === uri.fsPath
            );

            // Check if document has unsaved changes
            return document ? document.isDirty : false;
        } catch (error) {
            log.error('Error checking file change status:', error);
            return false;
        }
    }

    /**
     * Reload specified file
     * @param filePath File path (can be absolute or relative to project)
     * @returns Whether reload was successful
     */
    public static async reloadFile(filePath: string): Promise<boolean> {
        const startTime = performance.now();

        try {
            // Get configuration, check if auto reload is enabled
            const config = vscode.workspace.getConfiguration('ggMCP');
            const autoReload = config.get<boolean>('autoReloadModifiedFiles', true);

            if (!autoReload) {
                return false;
            }

            // Get file URI
            const uri = this.getFileUri(filePath);
            if (!uri) return false;

            // Optimization: Check if file is open in editor
            const editors = vscode.window.visibleTextEditors.filter(
                (editor) => editor.document.uri.fsPath === uri.fsPath
            );

            if (editors.length === 0) {
                // If file is not open in editor, just invalidate cache
                FileCache.invalidate(uri.fsPath);
                return true;
            }

            // Check file size, use different strategy for large files
            try {
                const fileStat = await vscode.workspace.fs.stat(uri);
                const fileSizeKB = fileStat.size / 1024;

                // For large files (over threshold) use command reload instead of content replacement
                if (fileStat.size > Defaults.Limits.largeFileSize) {
                    log.info(
                        `Using command-based reload for large file (${fileSizeKB.toFixed(2)}KB): ${uri.fsPath}`
                    );

                    // Invalidate cache
                    FileCache.invalidate(uri.fsPath);

                    // Use command reload for large files
                    try {
                        await vscode.commands.executeCommand('workbench.action.files.revert');
                        const reloadTime = performance.now() - startTime;
                        log.info(
                            `Large file reloaded via command in ${reloadTime.toFixed(2)}ms: ${uri.fsPath}`
                        );
                        return true;
                    } catch (cmdError) {
                        log.warn(
                            `Failed to reload large file via command: ${uri.fsPath}`,
                            cmdError
                        );
                        // Try standard method after failure
                    }
                }
            } catch (statError) {
                // File stat retrieval failed, continue with standard reload method
                log.error(`Failed to get file stat, using standard reload: ${uri.fsPath}`);
            }

            // Standard reload method: Use WorkspaceEdit
            const success = await this.refreshEditorsContent(uri, editors, startTime);

            const totalTime = performance.now() - startTime;
            log.info(
                `File reload ${success ? 'succeeded' : 'failed'} in ${totalTime.toFixed(2)}ms: ${uri.fsPath}`
            );

            return success;
        } catch (error) {
            const errorTime = performance.now() - startTime;
            log.error(`Error reloading file (${errorTime.toFixed(2)}ms):`, error);
            return false;
        }
    }

    /**
     * Reload multiple files
     * @param filePaths Array of file paths
     * @returns Number of successfully reloaded files
     */
    public static async reloadFiles(filePaths: string[]): Promise<number> {
        const startTime = performance.now();
        log.info(`Attempting to reload ${filePaths.length} files`);

        // Optimization: Use Promise.all for parallel processing of multiple files
        // Process files in batches to avoid performance issues from processing too many files simultaneously
        const batchSize = 5; // Number of files to process per batch
        let successCount = 0;

        // Process files in batches
        for (let i = 0; i < filePaths.length; i += batchSize) {
            const batch = filePaths.slice(i, i + batchSize);
            const reloadPromises = batch.map((filePath) => this.reloadFile(filePath));
            const results = await Promise.all(reloadPromises);

            successCount += results.filter((success) => success).length;
        }

        const totalTime = performance.now() - startTime;
        log.info(
            `Successfully reloaded ${successCount}/${filePaths.length} files in ${totalTime.toFixed(2)}ms`
        );
        return successCount;
    }

    /**
     * Get file URI
     * @param filePath File path
     * @returns File URI or null if path cannot be resolved
     */
    private static getFileUri(filePath: string): vscode.Uri | null {
        try {
            // Ensure file path is absolute
            let absolutePath = filePath;
            if (!path.isAbsolute(filePath)) {
                const rootPath = getProjectRoot();
                if (rootPath) {
                    absolutePath = path.join(rootPath, filePath);
                } else {
                    log.warn(`Could not determine project root for relative path: ${filePath}`);
                    return null;
                }
            }

            // Create file URI
            return vscode.Uri.file(absolutePath);
        } catch (error) {
            log.error(`Error resolving file path: ${filePath}`, error);
            return null;
        }
    }

    /**
     * Refresh editor content
     * @param uri File URI
     * @param editors List of editors
     * @param startTime Start time (for performance recording)
     * @returns Whether refresh was successful
     */
    private static async refreshEditorsContent(
        uri: vscode.Uri,
        editors: readonly vscode.TextEditor[],
        startTime: number
    ): Promise<boolean> {
        try {
            if (!editors || editors.length === 0) {
                log.info(`No editors found for file: ${uri.fsPath}`);
                return false;
            }

            // Ensure there is an editor and get the first one
            const firstEditor = editors[0];
            if (!firstEditor) {
                log.warn(`First editor is undefined for file: ${uri.fsPath}`);
                return false;
            }

            // Invalidate file cache
            FileCache.invalidate(uri.fsPath);

            // Get file content
            const readStartTime = performance.now();
            const content = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder().decode(content);
            const readTime = performance.now() - readStartTime;

            if (readTime > Defaults.Thresholds.slowParseMs) {
                log.debug(`File read took ${readTime.toFixed(2)}ms: ${uri.fsPath}`);
            }

            // Optimization: Check if file content has actually changed
            const currentDocument = firstEditor.document;
            const currentText = currentDocument.getText();

            if (text === currentText) {
                log.debug(`File content unchanged, skipping update: ${uri.fsPath}`);
                return true;
            }

            // Save editor view state
            const editorStates = editors.map((editor) => ({
                editor,
                selection: editor.selection,
                visibleRanges: editor.visibleRanges,
            }));

            // Use single WorkspaceEdit operation to replace content in all editors
            const editStartTime = performance.now();
            const edit = new vscode.WorkspaceEdit();

            // Create full range
            const fullRange = new vscode.Range(
                0,
                0,
                currentDocument.lineCount - 1,
                currentDocument.lineAt(currentDocument.lineCount - 1).range.end.character
            );

            edit.replace(uri, fullRange, text);

            // Apply edit
            const editSuccess = await vscode.workspace.applyEdit(edit);
            const editTime = performance.now() - editStartTime;

            if (editTime > Defaults.Thresholds.slowParseMs) {
                log.debug(`Edit application took ${editTime.toFixed(2)}ms: ${uri.fsPath}`);
            }

            if (editSuccess) {
                log.info(`Successfully updated content for file: ${uri.fsPath}`);

                // Restore view state for each editor
                for (const state of editorStates) {
                    // Add safety check for editor
                    if (state && state.editor) {
                        // Set selection area
                        if (state.selection) {
                            state.editor.selection = state.selection;
                        }

                        // Restore visible range
                        if (state.visibleRanges && state.visibleRanges.length > 0) {
                            const firstRange = state.visibleRanges[0];
                            if (firstRange) {
                                state.editor.revealRange(firstRange);
                            }
                        }
                    }
                }

                return true;
            } else {
                log.warn(`Failed to update content via edit for file: ${uri.fsPath}`);

                // Use command reload as fallback option
                try {
                    await vscode.commands.executeCommand('workbench.action.files.revert');
                    log.info(`Successfully reverted file using command: ${uri.fsPath}`);
                    return true;
                } catch (cmdError) {
                    log.warn(`Failed to revert file using command: ${uri.fsPath}`, cmdError);
                    return false;
                }
            }
        } catch (error) {
            const errorTime = performance.now() - startTime;
            log.error(
                `Error refreshing editors for file (${errorTime.toFixed(2)}ms): ${uri.fsPath}`,
                error
            );
            return false;
        }
    }
}
