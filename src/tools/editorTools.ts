import * as vscode from 'vscode';
import { AbstractMcpTool, JsonSchemaObject } from '../types/tool';
import { Response, ToolParams } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { normalizePath } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('EditorTools');

// Ensure optional chaining and nullish coalescing usage
const emptySchema: JsonSchemaObject = {
    type: 'object', 
    properties: {}
};

/**
 * Get the text content of the file currently open in the editor
 */
export class GetOpenInEditorFileTextTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_open_in_editor_file_text',
            'Retrieve the complete text content of the file currently open in the editor. Returns an empty string if no file is open.',
            emptySchema
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                log.debug('No active editor found');
                return successResponse('');
            }
            
            const document = editor.document;
            const text = document.getText();
            
            log.debug(`Retrieved file content, size: ${text.length} characters`);
            return successResponse(text);
        } catch (error) {
            log.error('Error getting file content', error);
            return errorResponse(`Error getting file content: ${formatError(error)}`);
        }
    }
}

/**
 * Get the path of the file currently open in the editor
 */
export class GetOpenInEditorFilePathTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_open_in_editor_file_path',
            'Get the absolute path of the file currently open in the editor. Returns an empty string if no file is open.',
            emptySchema
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                log.debug('No active editor found');
                return successResponse('');
            }
            
            const filePath = editor.document.uri.fsPath;
            log.debug(`Retrieved file path: ${filePath}`);
            
            return successResponse(filePath);
        } catch (error) {
            log.error('Error getting file path', error);
            return errorResponse(`Error getting file path: ${formatError(error)}`);
        }
    }
}

/**
 * Replace selected text
 */
export class ReplaceSelectedTextTool extends AbstractMcpTool<ToolParams['replaceSelectedText']> {
    constructor() {
        super(
            'replace_selected_text',
            'Replace the text currently selected in the editor. Returns an error if no text is selected or no editor is open.',
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
                log.warn('No active editor found');
                return errorResponse('no active editor');
            }
            
            // Check if there is selected text
            if (editor.selections.every((selection: vscode.Selection) => selection.isEmpty)) {
                log.warn('No text selected');
                return errorResponse('no text selected');
            }
            
            // Replace all selected text
            await editor.edit(editBuilder => {
                editor.selections.forEach((selection: vscode.Selection) => {
                    editBuilder.replace(selection, text);
                });
            });
            
            log.info('Selected text replaced successfully');
            return successResponse('ok');
        } catch (error) {
            log.error('Error replacing selected text', error);
            return errorResponse(`Error replacing selected text: ${formatError(error)}`);
        }
    }
}

/**
 * Replace current file's entire content
 */
export class ReplaceCurrentFileTextTool extends AbstractMcpTool<ToolParams['replaceCurrentFileText']> {
    constructor() {
        super(
            'replace_current_file_text',
            'Replace the entire content of the file currently open in the editor. Returns an error if no file is open.',
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
                log.warn('No file open');
                return errorResponse('no file open');
            }
            
            // Create a selection covering the entire file content
            const document = editor.document;
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
            );
            
            // Replace entire content
            await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, text);
            });
            
            log.info('File content replaced successfully');
            return successResponse('ok');
        } catch (error) {
            log.error('Error replacing file content', error);
            return errorResponse(`Error replacing file content: ${formatError(error)}`);
        }
    }
}

/**
 * Open file in editor
 */
export class OpenFileInEditorTool extends AbstractMcpTool<ToolParams['openFileInEditor']> {
    constructor() {
        super(
            'open_file_in_editor',
            'Open the specified file in the editor. Returns an error if the file does not exist or cannot be opened.',
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
            log.debug(`Attempting to open file: ${normalizedPath}`);
            
            try {
                const fileUri = vscode.Uri.file(normalizedPath);
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);
                
                log.info(`File opened successfully: ${normalizedPath}`);
                return successResponse('file is opened');
            } catch (err) {
                log.warn(`File doesn't exist or can't be opened: ${normalizedPath}`, err);
                return errorResponse('file doesn\'t exist or can\'t be opened');
            }
        } catch (error) {
            log.error('Error opening file', error);
            return errorResponse(`Error opening file: ${formatError(error)}`);
        }
    }
}