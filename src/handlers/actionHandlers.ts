import * as vscode from 'vscode';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('ActionHandlers');

/**
 * List available actions
 */
export async function listAvailableActions(): Promise<Response> {
    try {
        log.debug('Listing available actions');
        
        // Get all commands
        const commands = await vscode.commands.getCommands(true);
        
        // Format results
        const actions = commands.map((cmd: string) => ({
            id: cmd,
            text: cmd.replace(/\./g, ' ').replace(/([A-Z])/g, ' $1').trim()
        }));
        
        log.info(`Found ${actions.length} available actions`);
        return createResponse(JSON.stringify(actions));
    } catch (error) {
        log.error('Error listing actions', error);
        return createResponse(null, `Error listing actions: ${formatError(error)}`);
    }
}

/**
 * Execute action by ID
 */
export async function executeActionById(params: { actionId: string }): Promise<Response> {
    try {
        const { actionId } = params;
        log.debug('Executing action by ID', { actionId });
        
        if (!actionId) {
            log.warn('Empty action ID provided');
            return createResponse(null, 'Action ID cannot be empty');
        }
        
        // Check if command exists
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(actionId)) {
            log.warn('Action not found', { actionId });
            return createResponse(null, 'action not found');
        }
        
        // Execute command
        log.debug('Executing command', { actionId });
        await vscode.commands.executeCommand(actionId);
        
        log.info('Action executed successfully', { actionId });
        return createResponse('ok');
    } catch (error) {
        log.error('Error executing action', error, { actionId: params.actionId });
        return createResponse(null, `Error executing action: ${formatError(error)}`);
    }
}

/**
 * Get progress indicators
 * Note: VSCode API does not provide direct access to progress indicators
 * This is an informational implementation, returning information about running operations
 */
export async function getProgressIndicators(): Promise<Response> {
    try {
        log.debug('Getting progress indicators');
        
        // VSCode API does not provide direct access to progress indicators
        // Cannot directly get the list of active notifications because this API is not available in this version
        
        // Return an empty array and an explanatory note
        const result = {
            indicators: [],
            note: "VSCode API in the current version does not provide access to progress indicators or active notifications"
        };
        
        log.info('Returning empty progress indicators list due to API limitations');
        return createResponse(JSON.stringify(result));
    } catch (error) {
        log.error('Error getting progress indicators', error);
        return createResponse(null, `Error getting progress indicators: ${formatError(error)}`);
    }
}