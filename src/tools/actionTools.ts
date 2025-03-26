import * as vscode from 'vscode';
import { AbstractTool } from '../types/absTool';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';

/**
 * List available actions tool
 * Inherits from AbstractTool base class to utilize common tool functionality
 */
export class ListAvailableActionsTool extends AbstractTool<Record<string, never>> {
    constructor() {
        super(
            'list_available_actions',
            'Lists all available actions in VSCode IDE editor.\nReturns a JSON array of objects containing action information:\n- id: The action ID\n- text: The action presentation text\nUse this tool to discover available actions for execution with execute_action_by_id.',
            {type: 'object', properties: {}}
        );
    }

    /**
     * Core logic for listing available actions (implementing base class abstract method)
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        try {
            // Note: VS Code API does not provide a method to directly get all available actions
            // Returns a set of the most common commands
            const commonCommands = [
                {id: 'workbench.action.files.save', text: 'Save File'},
                {id: 'workbench.action.files.saveAll', text: 'Save All Files'},
                {id: 'editor.action.formatDocument', text: 'Format Document'},
                {id: 'workbench.action.openSettings', text: 'Open Settings'},
                {id: 'workbench.action.tasks.build', text: 'Run Build Task'},
                {id: 'workbench.action.tasks.test', text: 'Run Test Task'},
                {id: 'workbench.action.debug.start', text: 'Start Debugging'},
                {id: 'editor.action.revealDefinition', text: 'Go to Definition'},
                {id: 'editor.action.goToReferences', text: 'Find All References'},
                {id: 'workbench.action.terminal.toggleTerminal', text: 'Toggle Terminal'}
            ];
            
            return responseHandler.success(commonCommands);
        } catch (error) {
            this.log.error('Error listing actions', error);
            return responseHandler.failure(`Error listing actions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Execute action by ID tool
 * Inherits from AbstractTool base class to utilize common tool functionality
 */
export class ExecuteActionByIdTool extends AbstractTool<ToolParams['executeActionById']> {
    constructor() {
        super(
            'execute_action_by_id',
            'Executes an action by its ID in VSCode IDE editor.\nRequires an actionId parameter containing the ID of the action to execute.\nReturns one of two possible responses:\n- "ok" if the action was successfully executed\n- "action not found" if the action with the specified ID was not found\nNote: This tool doesn\'t wait for the action to complete.',
            {
                type: 'object',
                properties: {
                    actionId: {type: 'string'}
                },
                required: ['actionId']
            }
        );
    }

    /**
     * Argument validation
     */
    protected validateArgs(args: ToolParams['executeActionById']): void {
        super.validateArgs(args);
        
        if (!args.actionId || args.actionId.trim() === '') {
            throw new Error('Action ID cannot be empty');
        }
    }

    /**
     * Core logic for executing action by ID (implementing base class abstract method)
     */
    protected async executeCore(args: ToolParams['executeActionById']): Promise<Response> {
        try {
            const {actionId} = args;

            // Execute command
            try {
                await vscode.commands.executeCommand(actionId);
                return responseHandler.success('ok');
            } catch (err) {
                this.log.warn(`Action not found: ${actionId}`, err);
                return responseHandler.failure('action not found');
            }
        } catch (error) {
            this.log.error('Error executing action', error);
            throw error; // Allow base class error handling to capture and format this error
        }
    }
}

/**
 * Get progress indicators tool
 * Inherits from AbstractTool base class to utilize common tool functionality
 */
export class GetProgressIndicatorsTool extends AbstractTool<Record<string, never>> {
    constructor() {
        super(
            'get_progress_indicators',
            'Retrieves the status of all running progress indicators in VSCode IDE editor.\nReturns a JSON array of objects containing progress information:\n- text: The progress text/description\n- fraction: The progress ratio (0.0 to 1.0)\n- indeterminate: Whether the progress is indeterminate\nReturns an empty array if no progress indicators are running.',
            {type: 'object', properties: {}}
        );
    }

    /**
     * Core logic for getting progress indicators (implementing base class abstract method)
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        try {
            // Note: VS Code API does not provide direct access to progress indicators
            // Returns an empty array
            return responseHandler.success([]);
        } catch (error) {
            this.log.error('Error getting progress indicators', error);
            throw error; // Allow base class error handling to capture and format this error
        }
    }
}