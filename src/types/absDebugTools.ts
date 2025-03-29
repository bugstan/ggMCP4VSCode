import * as vscode from 'vscode';
import { Response } from './index';
import { AbsTools } from './absTools';
import { toAbsolutePath } from '../utils/pathUtils';

/**
 * Base class for debugging tools
 * Provides debugging session and breakpoint management functionality
 */
export abstract class AbsDebugTools<T = any> extends AbsTools<T> {
    /**
     * Core implementation of debugging operation logic
     */
    protected async executeCore(args: T): Promise<Response> {
        // Execute specific debugging operation
        return await this.execute(args);
    }
    
    /**
     * Execute specific debugging operation, to be implemented by subclasses
     */
    protected abstract execute(args: T): Promise<Response>;
    
    /**
     * Create breakpoint location
     */
    protected async createBreakpointLocation(filePath: string, line: number): Promise<{
        uri: vscode.Uri,
        position: vscode.Position
    } | null> {
        try {
            // Get absolute path using new utility function
            const absolutePath = toAbsolutePath(filePath);
            if (!absolutePath) {
                return null;
            }
            
            // Create URI and position
            const uri = vscode.Uri.file(absolutePath);
            // VSCode line numbers start from 0, user input typically starts from 1
            const position = new vscode.Position(Math.max(0, line - 1), 0);
            
            return { uri, position };
        } catch (error) {
            this.log.error('Error creating breakpoint location', error);
            return null;
        }
    }
    
    /**
     * Get all breakpoints
     */
    protected getAllBreakpoints(): readonly vscode.Breakpoint[] {
        return vscode.debug.breakpoints;
    }
    
    /**
     * Get breakpoints at specific location
     */
    protected getBreakpointsAtLocation(uri: vscode.Uri, line: number): vscode.SourceBreakpoint[] {
        return this.getAllBreakpoints()
            .filter((bp): bp is vscode.SourceBreakpoint => bp instanceof vscode.SourceBreakpoint)
            .filter(bp => {
                const location = bp.location;
                return location.uri.fsPath === uri.fsPath &&
                    location.range.start.line === line;
            });
    }
    
    /**
     * Add breakpoint
     */
    protected addBreakpoint(uri: vscode.Uri, position: vscode.Position, enabled: boolean = true): vscode.SourceBreakpoint {
        const breakpoint = new vscode.SourceBreakpoint(
            new vscode.Location(uri, position),
            enabled
        );
        vscode.debug.addBreakpoints([breakpoint]);
        return breakpoint;
    }
    
    /**
     * Remove breakpoints
     */
    protected removeBreakpoints(breakpoints: vscode.Breakpoint[]): void {
        vscode.debug.removeBreakpoints(breakpoints);
    }
    
    /**
     * Get run configuration
     */
    protected getRunConfiguration(configName: string): any | null {
        try {
            const launchConfigs = vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];
            return launchConfigs.find(config => config.name === configName) || null;
        } catch (error) {
            this.log.error('Error getting run configuration', error);
            return null;
        }
    }
    
    /**
     * Get all run configurations
     */
    protected getAllRunConfigurations(): any[] {
        try {
            return vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];
        } catch (error) {
            this.log.error('Error getting run configurations', error);
            return [];
        }
    }
    
    /**
     * Start debugging session
     */
    protected async startDebugging(config: any): Promise<boolean> {
        try {
            return await vscode.debug.startDebugging(undefined, config);
        } catch (error) {
            this.log.error('Error starting debugging session', error);
            return false;
        }
    }
}