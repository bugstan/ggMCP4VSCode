/**
 * 统一响应接口定义
 */
export interface Response {
    status: any | null;
    error: string | null;
}

/**
 * 工具处理程序类型定义
 */
export type ToolHandler = (args: any) => Promise<Response>;

/**
 * 常用工具参数类型定义
 */
export interface ToolParams {
    // 文件工具参数
    createNewFileWithText: { pathInProject: string, text: string };
    findFilesByNameSubstring: { nameSubstring: string };
    getFileTextByPath: { pathInProject: string };
    replaceFileTextByPath: { pathInProject: string, text: string };
    listFilesInFolder: { pathInProject: string };
    searchInFilesContent: { searchText: string };
    
    // 编辑器工具参数
    replaceSelectedText: { text: string };
    replaceCurrentFileText: { text: string };
    openFileInEditor: { filePath: string };
    
    // 调试工具参数
    toggleDebuggerBreakpoint: { filePathInProject: string, line: number };
    runConfiguration: { configName: string };
    
    // 终端工具参数
    executeTerminalCommand: { command: string };
    wait: { milliseconds: number };
    
    // Git工具参数
    findCommitByMessage: { text: string };
    
    // 操作工具参数
    executeActionById: { actionId: string };
    
    // 代码分析工具参数
    getSymbolsInFile: { pathInProject: string };
    findReferences: { pathInProject: string, line: number, character: number };
    refactorCodeAtLocation: { 
        pathInProject: string, 
        line: number, 
        character: number,
        refactorType: string,
        options: Record<string, any>
    };
}