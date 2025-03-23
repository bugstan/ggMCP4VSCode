import * as vscode from 'vscode';
import {Response} from '../types';
import {createResponse, formatError} from '../utils/response';
import {FileReloader} from '../utils/fileReloader';
import {analyzePath} from '../utils/pathUtils';
import {Logger} from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('EditorHandlers');

/**
 * Get the text content of the currently open file in the editor
 */
export async function getOpenInEditorFileText(): Promise<Response> {
    try {
        log.debug('Getting text of currently open file');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            log.info('No active editor found');
            return createResponse(''); // No open file, return empty string
        }
        
        const document = editor.document;
        const fileSize = document.getText().length;
        log.info('Retrieved open file text', { path: document.uri.fsPath, size: fileSize });
        
        return createResponse(document.getText());
    } catch (error) {
        log.error('Error getting file text', error);
        return createResponse(null, `Error getting file text: ${formatError(error)}`);
    }
}

/**
 * Get the path of the currently open file in the editor
 */
export async function getOpenInEditorFilePath(): Promise<Response> {
    try {
        log.debug('Getting path of currently open file');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            log.info('No active editor found');
            return createResponse(''); // No open file, return empty string
        }
        
        const document = editor.document;
        log.info('Retrieved open file path', { path: document.uri.fsPath });
        
        return createResponse(document.uri.fsPath);
    } catch (error) {
        log.error('Error getting file path', error);
        return createResponse(null, `Error getting file path: ${formatError(error)}`);
    }
}

/**
 * Get the currently selected text in the editor
 */
export async function getSelectedInEditorText(): Promise<Response> {
    try {
        log.debug('Getting selected text');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            log.info('No active editor found');
            return createResponse(''); // No open editor, return empty string
        }
        
        // Get text from all selection ranges
        const selectedText = editor.selections
            .map((selection: vscode.Selection) => editor.document.getText(selection))
            .join('\n');
        
        const totalSelections = editor.selections.length;
        const totalSelectedChars = selectedText.length;
        log.info('Retrieved selected text', { 
            selectionCount: totalSelections, 
            charCount: totalSelectedChars,
            file: editor.document.uri.fsPath
        });
            
        return createResponse(selectedText);
    } catch (error) {
        log.error('Error getting selected text', error);
        return createResponse(null, `Error getting selected text: ${formatError(error)}`);
    }
}

/**
 * Replace the currently selected text in the editor
 */
export async function replaceSelectedText(params: { text: string }): Promise<Response> {
    try {
        const { text } = params;
        log.debug('Replacing selected text', { textLength: text.length });
        
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            log.warn('No active editor found');
            return createResponse(null, 'no text selected');
        }
        
        // Check if there is selected text
        if (editor.selections.every((selection: vscode.Selection) => selection.isEmpty)) {
            log.warn('No text selected in editor');
            return createResponse(null, 'no text selected');
        }
        
        // Check if the document has unsaved changes
        if (editor.document.isDirty) {
            log.warn('Document has unsaved changes', { file: editor.document.uri.fsPath });
            // Can choose to auto-save or return an error
            // Here we choose to return an error, requiring the user to explicitly save changes
            return createResponse(null, 'Document has unsaved changes, please save document first');
        }
        
        // Replace all selected text
        await editor.edit(editBuilder => {
            editor.selections.forEach((selection: vscode.Selection) => {
                editBuilder.replace(selection, text);
            });
        });
        
        // Can choose to auto-save the document
        await editor.document.save();
        
        log.info('Selected text replaced successfully', { 
            file: editor.document.uri.fsPath, 
            selectionCount: editor.selections.length 
        });
        
        return createResponse('ok');
    } catch (error) {
        log.error('Error replacing selected text', error);
        return createResponse(null, `Error replacing selected text: ${formatError(error)}`);
    }
}

/**
 * Replace the entire content of the current file
 */
export async function replaceCurrentFileText(params: { text: string }): Promise<Response> {
    try {
        const { text } = params;
        log.debug('Replacing entire file content', { textLength: text.length });
        
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            log.warn('No active editor found');
            return createResponse(null, 'no file open');
        }
        
        // Check if the document has unsaved changes
        if (editor.document.isDirty) {
            log.warn('Document has unsaved changes', { file: editor.document.uri.fsPath });
            // Can choose to auto-save or return an error
            // Here we choose to return an error, requiring the user to explicitly save changes
            return createResponse(null, 'Document has unsaved changes, please save document first');
        }
        
        // Create a selection that covers the entire content of the file
        const document = editor.document;
        const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
        );
        
        // Replace the entire content
        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, text);
        });
        
        // Save the file
        await document.save();
        
        log.info('File content replaced successfully', { 
            file: document.uri.fsPath, 
            newSize: text.length 
        });
        
        return createResponse('ok');
    } catch (error) {
        log.error('Error replacing file content', error);
        return createResponse(null, `Error replacing file content: ${formatError(error)}`);
    }
}

/**
 * Get the text of all open files
 */
export async function getAllOpenFileTexts(): Promise<Response> {
    try {
        log.debug('Getting text of all open files');
        
        // Get all open text editors
        const editors = vscode.window.visibleTextEditors;
        
        if (editors.length === 0) {
            log.info('No open editors found');
            return createResponse(JSON.stringify([]));
        }
        
        // Extract text content
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
        
        log.info(`Retrieved text from ${filesData.length} open files`);
        return createResponse(JSON.stringify(filesData));
    } catch (error) {
        log.error('Error getting open file texts', error);
        return createResponse(null, `Error getting open file texts: ${formatError(error)}`);
    }
}

/**
 * Get the paths of all open files
 */
export async function getAllOpenFilePaths(): Promise<Response> {
    try {
        log.debug('Getting paths of all open files');
        
        // Get all open text editors
        const editors = vscode.window.visibleTextEditors;
        
        log.debug(`Found ${editors.length} open editors`);
        editors.forEach(editor => {
            log.debug("Open file", { path: editor.document.uri.fsPath });
        });
        
        if (editors.length === 0) {
            log.info('No open editors found');
            return createResponse('');
        }
        
        // Extract file paths
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const paths = editors.map((editor: vscode.TextEditor) => {
            const document = editor.document;
            return projectRoot 
                ? vscode.workspace.asRelativePath(document.uri.fsPath)
                : document.uri.fsPath;
        });
        
        log.info(`Retrieved paths for ${paths.length} open files`);
        return createResponse(paths.join('\n'));
    } catch (error) {
        log.error('Error getting open file paths', error);
        return createResponse(null, `Error getting open file paths: ${formatError(error)}`);
    }
}

/**
 * Open a file in the editor
 */
export async function openFileInEditor(params: { filePath: string }): Promise<Response> {
    try {
        const { filePath } = params;
        log.debug('Opening file in editor', { path: filePath });
        
        // Use improved path analysis
        const pathInfo = analyzePath(filePath);
        
        if (!pathInfo.isSafe || !pathInfo.absolute) {
            log.warn('Invalid file path', { path: filePath });
            return createResponse(null, "file path is invalid or can't find project dir");
        }
        
        const fileUri = vscode.Uri.file(pathInfo.absolute);
        
        try {
            // Check if the file exists
            await vscode.workspace.fs.stat(fileUri);
            
            // Check if the file is already open, if so, reload it
            const openDocuments = vscode.workspace.textDocuments.filter(
                doc => doc.uri.fsPath === fileUri.fsPath
            );
            
            if (openDocuments.length > 0) {
                // File is already open, reload to ensure latest content
                log.debug('File already open, reloading', { path: pathInfo.normalized });
                await FileReloader.reloadFile(pathInfo.absolute);
            }
            
            // Open the file
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
            
            log.info('File opened successfully', { path: pathInfo.normalized });
            return createResponse('file is opened');
        } catch (err) {
            log.error('File does not exist or cannot be opened', err, { path: pathInfo.normalized });
            return createResponse(null, "file doesn't exist or can't be opened");
        }
    } catch (error) {
        log.error('Error opening file', error);
        return createResponse(null, `Error opening file: ${formatError(error)}`);
    }
}