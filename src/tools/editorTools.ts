import * as vscode from 'vscode';
import {AbstractEditorTools} from '../types/absEditorTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';
import {toAbsolutePathSafe, isAbsolutePath} from '../utils/pathUtils';

/**
 * Get current open file content tool
 * Inherits from AbstractEditorTools base class to utilize common editor operation functionality
 */
export class GetOpenInEditorFileTextTool extends AbstractEditorTools {
    constructor() {
        super(
            'get_open_in_editor_file_text',
            'Retrieves the complete text content of the currently active file in the VSCode IDE editor.\nUse this tool to access and analyze the file\'s contents for tasks such as code review, content inspection, or text processing.\nReturns empty string if no file is currently open.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * This tool can run without an active editor
     * If no active editor, simply return an empty string
     */
    protected requiresActiveEditor(): boolean {
        return false;
    }

    /**
     * Execute file content retrieval operation (implementing base class abstract method)
     */
    protected async execute(editor: vscode.TextEditor | undefined, _args: any): Promise<Response> {
        try {
            if (!editor) {
                return responseHandler.success('');
            }

            const document = editor.document;
            const text = document.getText();

            return responseHandler.success(text);
        } catch (error) {
            this.log.error('Error getting file content', error);
            return responseHandler.failure(`Error getting file content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get current open file path tool
 * Inherits from AbstractEditorTools base class to utilize common editor operation functionality
 */
export class GetOpenInEditorFilePathTool extends AbstractEditorTools {
    constructor() {
        super(
            'get_open_in_editor_file_path',
            'Retrieves the absolute path of the currently active file in the VSCode IDE editor.\nUse this tool to get the file location for tasks requiring file path information.\nReturns an empty string if no file is currently open.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * This tool can run without an active editor
     * If no active editor, simply return an empty string
     */
    protected requiresActiveEditor(): boolean {
        return false;
    }

    /**
     * Execute file path retrieval operation (implementing base class abstract method)
     */
    protected async execute(editor: vscode.TextEditor | undefined, _args: any): Promise<Response> {
        try {
            if (!editor) {
                return responseHandler.success('');
            }

            const filePath = editor.document.uri.fsPath;

            return responseHandler.success(filePath);
        } catch (error) {
            this.log.error('Error getting file path', error);
            return responseHandler.failure(`Error getting file path: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Replace selected text tool
 * Inherits from AbstractEditorTools base class to utilize common editor operation functionality
 */
export class ReplaceSelectedTextTool extends AbstractEditorTools<ToolParams['replaceSelectedText']> {
    constructor() {
        super(
            'replace_selected_text',
            'Replaces the currently selected text in the active editor with specified new text.\nUse this tool to modify code or content by replacing the user\'s text selection.\nRequires a text parameter containing the replacement content.\nReturns one of three possible responses:\n    - "ok" if the text was successfully replaced\n    - "no text selected" if no text is selected or no editor is open\n    - "unknown error" if the operation fails',
            {
                type: 'object',
                properties: {
                    text: {type: 'string'}
                },
                required: ['text']
            }
        );
    }

    /**
     * Execute replace selected text operation (implementing base class abstract method)
     */
    protected async execute(editor: vscode.TextEditor | undefined, args: ToolParams['replaceSelectedText']): Promise<Response> {
        try {
            const {text} = args;

            if (!editor) {
                // This part should not be executed, as the base class executeCore checks if the editor exists
                return responseHandler.failure('no active editor');
            }

            // Check if there is a selection
            if (!this.hasSelection(editor)) {
                return responseHandler.failure('no text selected');
            }

            // Use base class applyEdit method to replace selected content
            const success = await this.applyEdit(editor, editBuilder => {
                editor.selections.forEach(selection => {
                    editBuilder.replace(selection, text);
                });
            });

            if (success) {
                return responseHandler.success('ok');
            } else {
                return responseHandler.failure('Failed to apply edit');
            }
        } catch (error) {
            this.log.error('Error replacing selected text', error);
            return responseHandler.failure(`Error replacing selected text: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Replace current file content tool
 * Inherits from AbstractEditorTools base class to utilize common editor operation functionality
 */
export class ReplaceCurrentFileTextTool extends AbstractEditorTools<ToolParams['replaceCurrentFileText']> {
    constructor() {
        super(
            'replace_current_file_text',
            'Replaces the entire content of the currently active file in the VSCode IDE with specified new text.\nUse this tool when you need to completely overwrite the current file\'s content.\nRequires a text parameter containing the new content.\nReturns one of three possible responses:\n- "ok" if the file content was successfully replaced\n- "no file open" if no editor is active\n- "unknown error" if the operation fails',
            {
                type: 'object',
                properties: {
                    text: {type: 'string'}
                },
                required: ['text']
            }
        );
    }

    /**
     * Execute replace file content operation (implementing base class abstract method)
     */
    protected async execute(editor: vscode.TextEditor | undefined, args: ToolParams['replaceCurrentFileText']): Promise<Response> {
        try {
            const {text} = args;

            if (!editor) {
                // This part should not be executed, as the base class executeCore checks if the editor exists
                return responseHandler.failure('no file open');
            }

            // Use base class getDocumentFullRange method to get full document range
            const fullRange = this.getDocumentFullRange(editor.document);

            // Use base class applyEdit method to replace entire file content
            const success = await this.applyEdit(editor, editBuilder => {
                editBuilder.replace(fullRange, text);
            });

            if (success) {
                return responseHandler.success('ok');
            } else {
                return responseHandler.failure('Failed to replace file content');
            }
        } catch (error) {
            this.log.error('Error replacing file content', error);
            return responseHandler.failure(`Error replacing file content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Open file in editor tool
 * Inherits from AbstractEditorTools base class to utilize common editor operation functionality
 */
export class OpenFileInEditorTool extends AbstractEditorTools<ToolParams['openFileInEditor']> {
    constructor() {
        super(
            'open_file_in_editor',
            'Opens the specified file in the VSCode IDE editor.\nRequires a filePath parameter containing the path to the file to open.\nRequires two parameters:\n    - filePath: The path of file to open can be absolute or relative to the project root.\n    - text: The content to write into the new file\nReturns one of two possible responses:\n    - "file is opened" if the file was successfully created and populated\n    - "file doesn\'t exist or can\'t be opened" otherwise',
            {
                type: 'object',
                properties: {
                    filePath: {type: 'string'}
                },
                required: ['filePath']
            }
        );
    }

    /**
     * This tool doesn't require an active editor to run
     */
    protected requiresActiveEditor(): boolean {
        return false;
    }

    /**
     * Execute open file operation (implementing base class abstract method)
     */
    protected async execute(_editor: vscode.TextEditor | undefined, args: ToolParams['openFileInEditor']): Promise<Response> {
        try {
            const {filePath} = args;

            const absolutePath = isAbsolutePath(filePath)
                ? filePath
                : toAbsolutePathSafe(filePath);

            if (!absolutePath) {
                return responseHandler.failure(`Cannot resolve path: ${filePath}`);
            }

            try {
                const fileUri = vscode.Uri.file(absolutePath);
                const document = await vscode.workspace.openTextDocument(fileUri);

                // Use base class showDocument method to open file
                await this.showDocument(document);

                return responseHandler.success('file is opened');
            } catch (err) {
                return responseHandler.failure(`file ${absolutePath} doesn't exist or can't be opened`);
            }
        } catch (error) {
            this.log.error('Error opening file', error);
            return responseHandler.failure(`Error opening file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
