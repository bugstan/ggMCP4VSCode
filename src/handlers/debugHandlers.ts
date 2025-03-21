import * as vscode from 'vscode';
import {Response} from '../types';
import {errorResponse, formatError, successResponse} from '../utils/response';
import {analyzePath} from '../utils/pathUtils';
import {Logger} from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('DebugHandlers');

// Breakpoint types
type VSCodeBreakpoint = vscode.Breakpoint;
type VSCodeSourceBreakpoint = vscode.SourceBreakpoint;

/**
 * Toggle debugger breakpoint
 */
export async function toggleDebuggerBreakpoint(
    params: { filePathInProject: string, line: number }
): Promise<Response> {
    try {
        const {filePathInProject, line} = params;
        log.debug('Toggling breakpoint', {file: filePathInProject, line});

        // Use improved path analysis
        const pathInfo = analyzePath(filePathInProject);

        if (!pathInfo.isSafe || !pathInfo.absolute) {
            log.warn('Invalid file path for breakpoint', {path: filePathInProject});
            return errorResponse("can't find project dir or path is invalid");
        }

        // Create a breakpoint location
        const uri = vscode.Uri.file(pathInfo.absolute);
        const position = new vscode.Position(line - 1, 0); // Line numbers start at 0, but parameters start at 1
        const location = new vscode.Location(uri, position);

        // Get all existing breakpoints
        // Check if there is already a matching breakpoint
        const allBreakpoints: readonly VSCodeBreakpoint[] = vscode.debug.breakpoints;
        const existingBreakpoints = allBreakpoints.filter((bp): bp is VSCodeSourceBreakpoint => {
            if (bp instanceof vscode.SourceBreakpoint) {
                const bpPos = bp.location.range.start;
                return bp.location.uri.fsPath === uri.fsPath &&
                    bpPos.line === position.line;
            }
            return false;
        });

        if (existingBreakpoints.length > 0) {
            // Remove existing breakpoints
            log.debug('Removing existing breakpoint', {file: pathInfo.normalized, line});
            await vscode.debug.removeBreakpoints(existingBreakpoints);
        } else {
            // Add new breakpoint
            log.debug('Adding new breakpoint', {file: pathInfo.normalized, line});
            const breakpoint = new vscode.SourceBreakpoint(
                location,
                true,  // enabled
                undefined,  // condition
                undefined,  // hit condition
                undefined   // log message
            );
            await vscode.debug.addBreakpoints([breakpoint]);
        }

        // Open the file and navigate to the breakpoint location
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );

        log.info('Breakpoint toggled successfully', {file: pathInfo.normalized, line});
        return successResponse('ok');
    } catch (error) {
        log.error('Error toggling breakpoint', error);
        return errorResponse(`Error toggling breakpoint: ${formatError(error)}`);
    }
}

/**
 * Get all debugger breakpoints
 */
export async function getDebuggerBreakpoints(): Promise<Response> {
    try {
        log.debug('Getting all breakpoints');

        // Get all breakpoints
        const allBreakpoints: readonly VSCodeBreakpoint[] = vscode.debug.breakpoints;

        // Format results
        const result = allBreakpoints
            .filter((bp): bp is VSCodeSourceBreakpoint => bp instanceof vscode.SourceBreakpoint)
            .map(bp => {
                return {
                    path: bp.location.uri.fsPath,
                    line: bp.location.range.start.line + 1 // Convert to 1-based line number
                };
            });

        log.info(`Found ${result.length} breakpoints`);
        return successResponse(JSON.stringify(result));
    } catch (error) {
        log.error('Error getting breakpoints', error);
        return errorResponse(`Error getting breakpoints: ${formatError(error)}`);
    }
}

/**
 * Run configuration
 */
export async function runConfiguration(params: { configName: string }): Promise<Response> {
    try {
        const {configName} = params;
        log.debug('Running configuration', {configName});

        // Get all launch configurations
        const launchConfigs = vscode.workspace
            .getConfiguration('launch')
            .get<any[]>('configurations') || [];

        // Find the specified configuration
        const config = launchConfigs.find((c) => c.name === configName);

        if (!config) {
            log.warn('Configuration not found', {configName});
            return errorResponse(`Could not find run configuration named "${configName}"`);
        }

        // Start debugging session
        log.debug('Starting debugging session', {config: config.name, type: config.type});
        await vscode.debug.startDebugging(undefined, config);

        log.info('Debug session started', {configName});
        return successResponse('ok');
    } catch (error) {
        log.error('Error running configuration', error, {configName: params.configName});
        return errorResponse(`error ${formatError(error)}`);
    }
}

/**
 * Get run configurations
 */
export async function getRunConfigurations(): Promise<Response> {
    try {
        log.debug('Getting run configurations');

        // Get all launch configurations
        const launchConfigs = vscode.workspace
            .getConfiguration('launch')
            .get<any[]>('configurations') || [];

        // Extract configuration names
        const configNames = launchConfigs.map((c) => c.name);

        log.info(`Found ${configNames.length} run configurations`);
        return successResponse(JSON.stringify(configNames));
    } catch (error) {
        log.error('Error getting run configurations', error);
        return errorResponse(`Error getting run configurations: ${formatError(error)}`);
    }
}