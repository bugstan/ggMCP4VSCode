import { McpTool } from './types/toolInterfaces';
import {
    GetOpenInEditorFilePathTool,
    GetOpenInEditorFileTextTool,
    OpenFileInEditorTool,
    ReplaceCurrentFileTextTool,
    ReplaceSelectedTextTool,
} from './tools/editorTools';
import {
    AppendFileContentTool,
    CreateNewFileWithTextTool,
    GetFileTextByPathTool,
    ListFilesInFolderTool,
    ReplaceFileContentAtPositionTool,
    ReplaceSpecificTextTool,
    RewriteFileContentTool,
} from './tools/fileReadWriteTools';
import { FindFilesByNameSubstringTool, SearchInFilesContentTool } from './tools/fileSearchTools';
import {
    GetDebuggerBreakpointsTool,
    GetRunConfigurationsTool,
    RunConfigurationTool,
    ToggleDebuggerBreakpointTool,
} from './tools/debugTools';
import { ExecuteTerminalCommandTool, RunCommandOnBackgroundTool, WaitTool } from './tools/terminalTools';
import { ExecuteOSSpecificCommandTool, GetTerminalInfoTool } from './tools/terminalInfoTools';
import { FindCommitByMessageTool, GetProjectVcsStatusTool } from './tools/gitTools';
import {
    CommitChangesTool,
    CreateBranchTool,
    GetBranchInfoTool,
    GetCommitDetailsTool,
    GetFileDiffTool,
    GetFileHistoryTool,
    PullChangesTool,
    SwitchBranchTool,
} from './tools/gitAdvancedTools';
import { ExecuteActionByIdTool, GetProgressIndicatorsTool, ListAvailableActionsTool } from './tools/actionTools';
import { GetProjectDependenciesTool, GetProjectModulesTool } from './tools/projectTools';
import { FindReferencesTool, GetSymbolsInFileTool, RefactorCodeAtLocationTool } from './tools/codeAnalysisTools';
import { Logger } from './utils/logger';

// Create module-specific logger
const log = Logger.forModule('ToolManager');

/**
 * Tool Manager
 * Responsible for managing and providing all available tools
 */
export class ToolManager {
    private static instance: ToolManager;
    private tools: Map<string, McpTool> = new Map();

    private constructor() {
        this.registerBuiltInTools();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    /**
     * Get all registered tools
     */
    public getAllTools(): McpTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool by name
     */
    public getToolByName(name: string): McpTool | undefined {
        const tool = this.tools.get(name);
        if (!tool) {
            log.warn(`Tool not found: ${name}`);
        }
        return tool;
    }

    /**
     * Register a tool
     */
    public registerTool(tool: McpTool): void {
        this.tools.set(tool.name, tool);
        log.info(`Registered tool: ${tool.name}`);
    }

    /**
     * Register built-in tools
     */
    private registerBuiltInTools(): void {
        log.info('Registering built-in tools');

        const builtInTools = [
            // Editor tools
            new GetOpenInEditorFileTextTool(),
            new GetOpenInEditorFilePathTool(),
            new ReplaceSelectedTextTool(),
            new ReplaceCurrentFileTextTool(),
            new OpenFileInEditorTool(),

            // File tools
            new CreateNewFileWithTextTool(),
            new FindFilesByNameSubstringTool(),
            new GetFileTextByPathTool(),
            new RewriteFileContentTool(),
            new ListFilesInFolderTool(),
            new ReplaceFileContentAtPositionTool(),
            new ReplaceSpecificTextTool(),
            new SearchInFilesContentTool(),
            new AppendFileContentTool(),

            // Debug tools
            new ToggleDebuggerBreakpointTool(),
            new GetDebuggerBreakpointsTool(),
            new RunConfigurationTool(),
            new GetRunConfigurationsTool(),

            // Terminal tools
            new ExecuteTerminalCommandTool(),
            new RunCommandOnBackgroundTool(),
            new WaitTool(),

            // Terminal info tools
            new GetTerminalInfoTool(),
            new ExecuteOSSpecificCommandTool(),

            // Git basic tools
            new GetProjectVcsStatusTool(),
            new FindCommitByMessageTool(),

            // Git advanced tools
            new GetFileHistoryTool(),
            new GetFileDiffTool(),
            new GetBranchInfoTool(),
            new GetCommitDetailsTool(),
            new CommitChangesTool(),
            new PullChangesTool(),
            new SwitchBranchTool(),
            new CreateBranchTool(),

            // Action tools
            new ListAvailableActionsTool(),
            new ExecuteActionByIdTool(),
            new GetProgressIndicatorsTool(),

            // Project tools
            new GetProjectModulesTool(),
            new GetProjectDependenciesTool(),

            // Code analysis tools
            new GetSymbolsInFileTool(),
            new FindReferencesTool(),
            new RefactorCodeAtLocationTool(),
        ];

        builtInTools.forEach((tool) => this.registerTool(tool));
        log.info(`Registered ${builtInTools.length} built-in tools`);
    }
}
