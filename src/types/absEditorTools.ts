import * as vscode from 'vscode';
import { Response } from './index';
import { AbsTools } from './absTools';
import { responseHandler } from '../server/responseHandler';

/**
 * Base class for editor operation tools
 * Provides editor inspection and common editor operations
 */
export abstract class AbsEditorTools<T = any> extends AbsTools<T> {
    /**
     * Core implementation of editor operation logic
     */
    protected async executeCore(args: T): Promise<Response> {
        // Get active editor
        const editor = vscode.window.activeTextEditor;

        // Check if editor needs to be active
        if (this.requiresActiveEditor() && !editor) {
            this.log.warn('No active editor found');
            return responseHandler.failure('no active editor');
        }

        // Execute specific editor operation
        return await this.execute(editor, args);
    }

    /**
     * Whether active editor is required, defaults to true
     */
    protected requiresActiveEditor(): boolean {
        return true;
    }

    /**
     * Execute specific editor operation, to be implemented by subclasses
     */
    protected abstract execute(editor: vscode.TextEditor | undefined, args: T): Promise<Response>;

    /**
     * Apply edit and ensure success
     */
    protected async applyEdit(
        editor: vscode.TextEditor,
        callback: (editBuilder: vscode.TextEditorEdit) => void
    ): Promise<boolean> {
        try {
            const success = await editor.edit(callback);
            if (!success) {
                this.log.warn('Edit operation failed');
            }
            return success;
        } catch (error) {
            this.log.error('Error applying edit', error);
            return false;
        }
    }

    /**
     * Get full range (covers entire document)
     */
    protected getDocumentFullRange(document: vscode.TextDocument): vscode.Range {
        return new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(
                document.lineCount - 1,
                document.lineAt(document.lineCount - 1).text.length
            )
        );
    }

    /**
     * Activate document and show in editor
     */
    protected async showDocument(document: vscode.TextDocument): Promise<vscode.TextEditor> {
        return vscode.window.showTextDocument(document);
    }

    /**
     * Get selection, returns null if no selection
     */
    protected getSelection(editor: vscode.TextEditor): vscode.Selection | null {
        if (editor.selection.isEmpty) {
            return null;
        }
        return editor.selection;
    }

    /**
     * Check if there is selected content
     */
    protected hasSelection(editor: vscode.TextEditor): boolean {
        return !editor.selection.isEmpty;
    }

    /**
     * Get selected text content
     */
    protected getSelectedText(editor: vscode.TextEditor): string {
        return editor.document.getText(editor.selection);
    }
}
