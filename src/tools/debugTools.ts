import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {errorResponse, formatError, successResponse} from '../utils/response';
import {toAbsolutePathSafe} from '../utils/pathUtils';

// Declaration for Breakpoint type
/**
 * Set or remove debug breakpoint
 */
export class ToggleDebuggerBreakpointTool extends AbstractMcpTool<ToolParams['toggleDebuggerBreakpoint']> {
    constructor() {
        super(
            'toggle_debugger_breakpoint',
            'Toggle a debugger breakpoint at the specified line in a project file. Returns an error if the project directory cannot be determined.',
            {
                type: 'object',
                properties: {
                    filePathInProject: {type: 'string'},
                    line: {type: 'number'}
                },
                required: ['filePathInProject', 'line']
            }
        );
    }

    async handle(args: ToolParams['toggleDebuggerBreakpoint']): Promise<Response> {
        try {
            const {filePathInProject, line} = args;

            // Convert project relative path to absolute path
            const absolutePath = toAbsolutePathSafe(filePathInProject);
            if (!absolutePath) {
                return errorResponse('Project directory not found or path is invalid');
            }

            // Convert path to URI
            const fileUri = vscode.Uri.file(absolutePath);

            // Create breakpoint location
            const position = new vscode.Position(line - 1, 0); // VSCode line numbers start at 0, while user input starts at 1

            // Check if there is a breakpoint at the same location
            const existingBreakpoints = vscode.debug.breakpoints.filter(bp => {
                if (bp instanceof vscode.SourceBreakpoint) {
                    const bpLocation = bp.location;
                    return bpLocation.uri.fsPath === fileUri.fsPath &&
                        bpLocation.range.start.line === position.line;
                }
                return false;
            });

            // Toggle breakpoint (remove if exists, add if not)
            if (existingBreakpoints.length > 0) {
                // Remove existing breakpoint
                vscode.debug.removeBreakpoints(existingBreakpoints);
                return successResponse('Breakpoint removed');
            } else {
                // Add new breakpoint
                const breakpoint = new vscode.SourceBreakpoint(
                    new vscode.Location(fileUri, position),
                    true // Enable breakpoint
                );
                vscode.debug.addBreakpoints([breakpoint]);

                // Open file and show breakpoint location
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    await vscode.window.showTextDocument(document);
                    // Scroll to breakpoint location
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.revealRange(
                            new vscode.Range(position, position),
                            vscode.TextEditorRevealType.InCenter
                        );
                    }
                } catch (e) {
                    // Failed to open file, but breakpoint is set, so still return success
                    console.warn('Failed to open file, but breakpoint is set:', e);
                }

                return successResponse('Breakpoint added');
            }
        } catch (error) {
            console.error('Toggle breakpoint error:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * Get all breakpoint information
 */
export class GetDebuggerBreakpointsTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_debugger_breakpoints',
            'Get information about all line breakpoints set in the project. Returns a JSON-formatted list containing breakpoint paths and line numbers.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        try {
            // Get all breakpoints
            // Filter and transform breakpoint information
            const breakpointInfo = vscode.debug.breakpoints
                .filter(bp => bp instanceof vscode.SourceBreakpoint)
                .map(bp => {
                    const sourceBp = bp as vscode.SourceBreakpoint;
                    const location = sourceBp.location;
                    return {
                        path: location.uri.fsPath,
                        line: location.range.start.line + 1 // Convert to 1-based line number
                    };
                });

            return successResponse(breakpointInfo);
        } catch (error) {
            console.error('Get breakpoints error:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * Get run configurations list
 */
export class GetRunConfigurationsTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_run_configurations',
            'Get a list of available run configurations in the current project. Returns a JSON-formatted list of run configuration names.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        try {
            // Get launch configurations
            const launchConfigs = vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];

            // Extract configuration names
            const configNames = launchConfigs.map(config => config.name).filter(Boolean);

            return successResponse(configNames);
        } catch (error) {
            console.error('Get run configurations error:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * Run specified configuration
 */
export class RunConfigurationTool extends AbstractMcpTool<ToolParams['runConfiguration']> {
    constructor() {
        super(
            'run_configuration',
            'Run a specific run configuration in the current project. Returns an error if the run configuration is not found or execution fails.',
            {
                type: 'object',
                properties: {
                    configName: {type: 'string'}
                },
                required: ['configName']
            }
        );
    }

    async handle(args: ToolParams['runConfiguration']): Promise<Response> {
        try {
            const {configName} = args;

            // Get all launch configurations
            const launchConfigs = vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];

            // Find configuration with specified name
            const targetConfig = launchConfigs.find(config => config.name === configName);
            if (!targetConfig) {
                return errorResponse(`Could not find run configuration named "${configName}"`);
            }

            // Execute launch debug session
            const success = await vscode.debug.startDebugging(
                undefined, // Use current workspace
                targetConfig
            );

            if (success) {
                return successResponse('Run configuration started');
            } else {
                return errorResponse('Failed to start run configuration');
            }
        } catch (error) {
            console.error('Run configuration error:', error);
            return errorResponse(formatError(error));
        }
    }
}