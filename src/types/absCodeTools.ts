import * as vscode from 'vscode';
import { Response } from './index';
import { AbstractTool } from './absTool';
import { responseHandler } from '../server/responseHandler';
import { toAbsolutePathSafe } from '../utils/pathUtils';

/**
 * Base class for code analysis tools
 * Provides symbol analysis and code manipulation functionality
 */
export abstract class AbstractCodeTools<T = any> extends AbstractTool<T> {
    /**
     * Core implementation of code analysis logic
     */
    protected async executeCore(args: T): Promise<Response> {
        // Prepare document and position
        const { document, position } = await this.prepareDocumentAndPosition(args);
        if (!document) {
            return responseHandler.failure('Cannot access file or position');
        }
        
        // Execute specific code analysis operation
        return await this.executeCodeAnalysis(document, position, args);
    }
    
    /**
     * Prepare document and position
     */
    protected async prepareDocumentAndPosition(args: T): Promise<{
        document: vscode.TextDocument | null,
        position: vscode.Position | null
    }> {
        try {
            // Extract file path from arguments
            const filePath = this.extractFilePathFromArgs(args);
            if (!filePath) {
                return { document: null, position: null };
            }
            
            // Get absolute path
            const absolutePath = toAbsolutePathSafe(filePath);
            if (!absolutePath) {
                return { document: null, position: null };
            }
            
            // Open document
            const fileUri = vscode.Uri.file(absolutePath);
            const document = await vscode.workspace.openTextDocument(fileUri);
            
            // Get position (if applicable)
            const position = this.extractPositionFromArgs(args, document);
            
            return { document, position };
        } catch (error) {
            this.log.error('Error preparing document and position', error);
            return { document: null, position: null };
        }
    }
    
    /**
     * Extract file path from arguments, to be implemented by subclasses
     */
    protected abstract extractFilePathFromArgs(args: T): string;
    
    /**
     * Extract position from arguments
     */
    protected extractPositionFromArgs(args: T, document: vscode.TextDocument): vscode.Position | null {
        // Default implementation, can be overridden by subclasses
        const line = (args as any).line;
        const character = (args as any).character;
        
        if (typeof line === 'number' && typeof character === 'number') {
            // Ensure position is within document bounds
            const lineCount = document.lineCount;
            if (line >= 0 && line < lineCount) {
                const lineLength = document.lineAt(line).text.length;
                const char = Math.min(character, lineLength);
                return new vscode.Position(line, char);
            }
        }
        
        return null;
    }
    
    /**
     * Execute specific code analysis operation, to be implemented by subclasses
     */
    protected abstract executeCodeAnalysis(
        document: vscode.TextDocument,
        position: vscode.Position | null,
        args: T
    ): Promise<Response>;
    
    /**
     * Show document and set cursor position
     */
    protected async showDocumentAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.TextEditor> {
        const editor = await vscode.window.showTextDocument(document);
        if (position) {
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
            );
        }
        return editor;
    }
    
    /**
     * Execute language service command and handle result
     */
    protected async executeLanguageServiceCommand<T>(
        command: string, 
        ...args: any[]
    ): Promise<T | null> {
        try {
            return await vscode.commands.executeCommand<T>(command, ...args);
        } catch (error) {
            this.log.error(`Error executing language service command: ${command}`, error);
            return null;
        }
    }
}