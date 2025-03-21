import { AbstractMcpTool } from './types/tool';
import { 
    GetOpenInEditorFileTextTool,
    GetOpenInEditorFilePathTool,
    ReplaceSelectedTextTool,
    ReplaceCurrentFileTextTool,
    OpenFileInEditorTool
} from './tools/editorTools';
import {
    CreateNewFileWithTextTool,
    FindFilesByNameSubstringTool,
    GetFileTextByPathTool,
    ReplaceFileTextByPathTool,
    ListFilesInFolderTool,
    SearchInFilesContentTool
} from './tools/fileTools';
import {
    ToggleDebuggerBreakpointTool,
    GetDebuggerBreakpointsTool,
    RunConfigurationTool,
    GetRunConfigurationsTool
} from './tools/debugTools';
import {
    GetTerminalTextTool,
    ExecuteTerminalCommandTool,
    WaitTool
} from './tools/terminalTools';
import {
    GetProjectVcsStatusTool,
    FindCommitByMessageTool
} from './tools/gitTools';
import {
    GetFileHistoryTool,
    GetFileDiffTool,
    GetBranchInfoTool,
    GetCommitDetailsTool,
    CommitChangesTool,
    PullChangesTool,
    SwitchBranchTool,
    CreateBranchTool
} from './tools/gitAdvancedTools';
import {
    ListAvailableActionsTool,
    ExecuteActionByIdTool,
    GetProgressIndicatorsTool
} from './tools/actionTools';
import {
    GetProjectModulesTool,
    GetProjectDependenciesTool
} from './tools/projectTools';
import {
    GetSymbolsInFileTool,
    FindReferencesTool,
    RefactorCodeAtLocationTool
} from './tools/codeAnalysisTools';
import { Logger } from './utils/logger';

// Create module-specific logger
const log = Logger.forModule('ToolManager');

/**
 * MCP Tool Manager
 * Responsible for managing and providing all available tools
 */
export class McpToolManager {
    private static instance: McpToolManager;
    private tools: Map<string, AbstractMcpTool> = new Map();

    private constructor() {
        this.registerBuiltInTools();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): McpToolManager {
        if (!McpToolManager.instance) {
            McpToolManager.instance = new McpToolManager();
        }
        return McpToolManager.instance;
    }

    /**
     * Get all registered tools
     */
    public getAllTools(): AbstractMcpTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool by name
     */
    public getToolByName(name: string): AbstractMcpTool | undefined {
        const tool = this.tools.get(name);
        if (!tool) {
            log.warn(`Tool not found: ${name}`);
        }
        return tool;
    }

    /**
     * Register a tool
     */
    public registerTool(tool: AbstractMcpTool): void {
        this.tools.set(tool.name, tool);
        log.debug(`Registered tool: ${tool.name}`);
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
            new ReplaceFileTextByPathTool(),
            new ListFilesInFolderTool(),
            new SearchInFilesContentTool(),

            // Debug tools
            new ToggleDebuggerBreakpointTool(),
            new GetDebuggerBreakpointsTool(),
            new RunConfigurationTool(),
            new GetRunConfigurationsTool(),

            // Terminal tools
            new GetTerminalTextTool(),
            new ExecuteTerminalCommandTool(),
            new WaitTool(),

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
            new RefactorCodeAtLocationTool()
        ];

        builtInTools.forEach(tool => this.registerTool(tool));
        log.info(`Registered ${builtInTools.length} built-in tools`);
    }
}