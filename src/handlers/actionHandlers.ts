import * as vscode from 'vscode';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';

/**
 * List available actions
 */
export async function listAvailableActions(): Promise<Response> {
    try {
        // Get all commands
        const commands = await vscode.commands.getCommands(true);
        
        // Format results
        const actions = commands.map((cmd: string) => ({
            id: cmd,
            text: cmd.replace(/\./g, ' ').replace(/([A-Z])/g, ' $1').trim()
        }));
        
        return successResponse(JSON.stringify(actions));
    } catch (error) {
        return errorResponse(`Error listing actions: ${formatError(error)}`);
    }
}

/**
 * Execute action by ID
 */
export async function executeActionById(params: { actionId: string }): Promise<Response> {
    try {
        const { actionId } = params;
        
        if (!actionId) {
            return errorResponse('Action ID cannot be empty');
        }
        
        // Check if command exists
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(actionId)) {
            return errorResponse('action not found');
        }
        
        // Execute command
        await vscode.commands.executeCommand(actionId);
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`Error executing action: ${formatError(error)}`);
    }
}

/**
 * Get progress indicators
 * Note: VSCode API does not provide direct access to progress indicators
 * This is an informational implementation, returning information about running operations
 */
export async function getProgressIndicators(): Promise<Response> {
    try {
        // VSCode API does not provide direct access to progress indicators
        // Cannot directly get the list of active notifications because this API is not available in this version
        
        // Return an empty array and an explanatory note
        const result = {
            indicators: [],
            note: "VSCode API in the current version does not provide access to progress indicators or active notifications"
        };
        
        return successResponse(JSON.stringify(result));
    } catch (error) {
        return errorResponse(`Error getting progress indicators: ${formatError(error)}`);
    }
}