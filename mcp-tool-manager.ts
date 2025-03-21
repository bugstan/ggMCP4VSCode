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

/**
 * MCP工具管理器
 * 负责管理和提供所有可用的工具
 */
export class McpToolManager {
    private static instance: McpToolManager;
    private tools: Map<string, AbstractMcpTool> = new Map();

    private constructor() {
        this.registerBuiltInTools();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): McpToolManager {
        if (!McpToolManager.instance) {
            McpToolManager.instance = new McpToolManager();
        }
        return McpToolManager.instance;
    }

    /**
     * 获取所有注册的工具
     */
    public getAllTools(): AbstractMcpTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * 根据名称获取工具
     */
    public getToolByName(name: string): AbstractMcpTool | undefined {
        return this.tools.get(name);
    }

    /**
     * 注册工具
     */
    public registerTool(tool: AbstractMcpTool): void {
        this.tools.set(tool.name, tool);
    }

    /**
     * 注册内置工具
     */
    private registerBuiltInTools(): void {
        const builtInTools = [
            // 编辑器工具
            new GetOpenInEditorFileTextTool(),
            new GetOpenInEditorFilePathTool(),
            new ReplaceSelectedTextTool(),
            new ReplaceCurrentFileTextTool(),
            new OpenFileInEditorTool(),

            // 文件工具
            new CreateNewFileWithTextTool(),
            new FindFilesByNameSubstringTool(),
            new GetFileTextByPathTool(),
            new ReplaceFileTextByPathTool(),
            new ListFilesInFolderTool(),
            new SearchInFilesContentTool(),

            // 调试工具
            new ToggleDebuggerBreakpointTool(),
            new GetDebuggerBreakpointsTool(),
            new RunConfigurationTool(),
            new GetRunConfigurationsTool(),

            // 终端工具
            new GetTerminalTextTool(),
            new ExecuteTerminalCommandTool(),
            new WaitTool(),

            // Git工具
            new GetProjectVcsStatusTool(),
            new FindCommitByMessageTool(),

            // 操作工具
            new ListAvailableActionsTool(),
            new ExecuteActionByIdTool(),
            new GetProgressIndicatorsTool(),

            // 项目工具
            new GetProjectModulesTool(),
            new GetProjectDependenciesTool(),
            
            // 代码分析工具（新增）
            new GetSymbolsInFileTool(),
            new FindReferencesTool(),
            new RefactorCodeAtLocationTool()
        ];

        builtInTools.forEach(tool => this.registerTool(tool));
    }
}