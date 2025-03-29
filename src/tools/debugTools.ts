import * as vscode from 'vscode';
import {AbsDebugTools} from '../types/absDebugTools';
import {Response, ToolParams} from '../types';
import {responseHandler} from '../server/responseHandler';

/**
 * Toggle debugger breakpoint tool
 * Inherits from AbstractDebugTools base class to utilize common debugging functionality
 */
export class ToggleDebuggerBreakpointTool extends AbsDebugTools<ToolParams['toggleDebuggerBreakpoint']> {
    constructor() {
        super(
            'toggle_debugger_breakpoint',
            'Toggles a debugger breakpoint at the specified line in a project file.\nRequires two parameters:\n- pathInProject: The relative path to the file within the project\n- line: The line number where to toggle the breakpoint. The line number is starts at 1 for the first line.\nReturns one of two possible responses:\n- "ok" if the breakpoint was successfully toggled\n- "can\'t find project dir" if the project directory cannot be determined\nNote: Automatically navigates to the breakpoint location in the editor',
            {
                type: 'object',
                properties: {
                    pathInProject: {type: 'string'},
                    line: {type: 'number'}
                },
                required: ['pathInProject', 'line']
            }
        );
    }

    /**
     * Execute debugging operation (implementing base class abstract method)
     */
    protected async execute(args: ToolParams['toggleDebuggerBreakpoint']): Promise<Response> {
        try {
            const {pathInProject, line} = args;

            // Use base class method to create breakpoint location
            const breakpointLocation = await this.createBreakpointLocation(pathInProject, line);
            if (!breakpointLocation) {
                return responseHandler.failure('Project directory not found or path is invalid');
            }

            // Get breakpoints at specified location
            const existingBreakpoints = this.getBreakpointsAtLocation(breakpointLocation.uri, breakpointLocation.position.line);

            // Toggle breakpoint (remove if exists, add if not)
            if (existingBreakpoints.length > 0) {
                // Remove existing breakpoints
                this.removeBreakpoints(existingBreakpoints);
                return responseHandler.success('Breakpoint removed');
            } else {
                // Add new breakpoint
                const breakpoint = this.addBreakpoint(breakpointLocation.uri, breakpointLocation.position);
                this.log.info('Breakpoint added:', breakpoint);

                // Open file and show breakpoint location
                try {
                    const document = await vscode.workspace.openTextDocument(breakpointLocation.uri);
                    const editor = await vscode.window.showTextDocument(document);

                    // Scroll to breakpoint location
                    editor.revealRange(
                        new vscode.Range(breakpointLocation.position, breakpointLocation.position),
                        vscode.TextEditorRevealType.InCenter
                    );
                } catch (e) {
                    // Failed to open file, but breakpoint is set, so still return success
                    this.log.warn('Failed to open file, but breakpoint is set:', e);
                }

                return responseHandler.success('Breakpoint added');
            }
        } catch (error) {
            this.log.error('Toggle breakpoint error:', error);
            return responseHandler.failure(`Toggle breakpoint error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get all breakpoint information tool
 * Inherits from AbstractDebugTools base class to utilize common debugging functionality
 */
export class GetDebuggerBreakpointsTool extends AbsDebugTools<{}> {
    constructor() {
        super(
            'get_debugger_breakpoints',
            'Retrieves a list of all line breakpoints currently set in the project.\nUse this tool to get information about existing debugger breakpoints.\nReturns a JSON-formatted list of breakpoints, where each entry contains:\n- path: The absolute file path where the breakpoint is set\n- line: The line number (1-based) where the breakpoint is located\nReturns an empty list ([]) if no breakpoints are set.\nNote: Only includes line breakpoints, not other breakpoint types (e.g., method breakpoints)',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * Execute debugging operation (implementing base class abstract method)
     */
    protected async execute(_args: {}): Promise<Response> {
        try {
            // Use base class method to get all breakpoints
            const allBreakpoints = this.getAllBreakpoints();

            // Filter and convert breakpoint information
            const breakpointInfo = allBreakpoints
                .filter(bp => bp instanceof vscode.SourceBreakpoint)
                .map(bp => {
                    const sourceBp = bp as vscode.SourceBreakpoint;
                    const location = sourceBp.location;
                    return {
                        pathInProject: this.getRelativePath(location.uri.fsPath),
                        line: location.range.start.line + 1 // Convert to 1-based line number
                    };
                });

            return responseHandler.success(breakpointInfo);
        } catch (error) {
            this.log.error('Get breakpoints error:', error);
            return responseHandler.failure(`Get breakpoints error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Get run configurations list tool
 * Inherits from AbstractDebugTools base class to utilize common debugging functionality
 */
export class GetRunConfigurationsTool extends AbsDebugTools<{}> {
    constructor() {
        super(
            'get_run_configurations',
            'Returns a list of run configurations for the current project. Use this tool to query the list of available run configurations in current project. Then you shall to call "run_configuration" tool if you find anything relevant. Returns JSON list of run configuration names. Empty list if no run configurations found.',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    /**
     * Execute debugging operation (implementing base class abstract method)
     */
    protected async execute(_args: {}): Promise<Response> {
        try {
            // Use base class method to get all run configurations
            const allConfigs = this.getAllRunConfigurations();

            // Extract configuration names
            const configNames = allConfigs.map(config => config.name).filter(Boolean);

            return responseHandler.success(configNames);
        } catch (error) {
            this.log.error('Get run configurations error:', error);
            return responseHandler.failure(`Get run configurations error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Run specific configuration tool
 * Inherits from AbstractDebugTools base class to utilize common debugging functionality
 */
export class RunConfigurationTool extends AbsDebugTools<ToolParams['runConfiguration']> {
    constructor() {
        super(
            'run_configuration',
            'Run a specific run configuration in the current project. Use this tool to run a run configuration that you have found from "get_run_configurations" tool. Returns one of two possible responses: - "ok" if the run configuration was successfully executed - "error <error message>" if the run configuration was not found or failed to execute',
            {
                type: 'object',
                properties: {
                    configName: {type: 'string'}
                },
                required: ['configName']
            }
        );
    }

    /**
     * Execute debugging operation (implementing base class abstract method)
     */
    protected async execute(args: ToolParams['runConfiguration']): Promise<Response> {
        try {
            const {configName} = args;

            // Use base class method to get specific run configuration
            const targetConfig = this.getRunConfiguration(configName);

            if (!targetConfig) {
                return responseHandler.failure(`Could not find run configuration named "${configName}"`);
            }

            // Use base class method to start debugging session
            const success = await this.startDebugging(targetConfig);

            if (success) {
                return responseHandler.success('Run configuration started');
            } else {
                return responseHandler.failure('Failed to start run configuration');
            }
        } catch (error) {
            this.log.error('Run configuration error:', error);
            return responseHandler.failure(`Run configuration error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
