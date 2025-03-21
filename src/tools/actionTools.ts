import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {successResponse, errorResponse, formatError} from '../utils/response';

/**
 * List available actions
 */
export class ListAvailableActionsTool extends AbstractMcpTool<Record<string, never>> {
    constructor() {
        super(
            'list_available_actions',
            'List all available actions in the IDE editor. Returns an array of action information.',
            {type: 'object', properties: {}}
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // Note: VS Code API doesn't have a method to directly get all available actions
            // Here we return a set of most commonly used commands
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

            return successResponse(commonCommands);
        } catch (error) {
            return errorResponse(`Error listing actions: ${formatError(error)}`);
        }
    }
}

/**
 * Execute action by ID
 */
export class ExecuteActionByIdTool extends AbstractMcpTool<ToolParams['executeActionById']> {
    constructor() {
        super(
            'execute_action_by_id',
            'Execute an action in the IDE editor by its ID. Returns an error if the action with the specified ID is not found.',
            {
                type: 'object',
                properties: {
                    actionId: {type: 'string'}
                },
                required: ['actionId']
            }
        );
    }

    async handle(args: ToolParams['executeActionById']): Promise<Response> {
        try {
            const {actionId} = args;

            // Execute command
            try {
                await vscode.commands.executeCommand(actionId);
                return successResponse('ok');
            } catch (err) {
                return errorResponse('action not found');
            }
        } catch (error) {
            return errorResponse(`Error executing action: ${formatError(error)}`);
        }
    }
}

/**
 * Get progress indicators
 */
export class GetProgressIndicatorsTool extends AbstractMcpTool<Record<string, never>> {
    constructor() {
        super(
            'get_progress_indicators',
            'Get the status of all running progress indicators in the IDE editor. Returns an array of progress information.',
            {type: 'object', properties: {}}
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // Note: VS Code API doesn't provide direct access to progress indicators
            // Return an empty array
            return successResponse([]);
        } catch (error) {
            return errorResponse(`Error getting progress indicators: ${formatError(error)}`);
        }
    }
}