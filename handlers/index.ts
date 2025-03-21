import { Response } from '../types';
import * as editorHandlers from './editorHandlers';
import * as fileHandlers from './fileHandlers';
import * as debugHandlers from './debugHandlers';
import * as terminalHandlers from './terminalHandlers';
import * as gitHandlers from './gitHandlers';
import * as gitAdvancedHandlers from './gitAdvancedHandlers';
import * as actionHandlers from './actionHandlers';
import * as projectHandlers from './projectHandlers';
import * as codeAnalysisHandlers from './codeAnalysisHandlers';

/**
 * 工具处理程序类型定义
 */
export type ToolHandler = (args: any) => Promise<Response>;

/**
 * 所有工具处理程序的映射表
 */
export const toolHandlers: Record<string, ToolHandler> = {
    // 编辑器处理程序
    get_open_in_editor_file_text: editorHandlers.getOpenInEditorFileText,
    get_open_in_editor_file_path: editorHandlers.getOpenInEditorFilePath,
    get_selected_in_editor_text: editorHandlers.getSelectedInEditorText,
    replace_selected_text: editorHandlers.replaceSelectedText,
    replace_current_file_text: editorHandlers.replaceCurrentFileText,
    get_all_open_file_texts: editorHandlers.getAllOpenFileTexts,
    get_all_open_file_paths: editorHandlers.getAllOpenFilePaths,
    open_file_in_editor: editorHandlers.openFileInEditor,

    // 文件处理程序
    create_new_file_with_text: fileHandlers.createNewFileWithText,
    find_files_by_name_substring: fileHandlers.findFilesByNameSubstring,
    get_file_text_by_path: fileHandlers.getFileTextByPath,
    replace_file_text_by_path: fileHandlers.replaceFileTextByPath,
    list_files_in_folder: fileHandlers.listFilesInFolder,
    search_in_files_content: fileHandlers.searchInFilesContent,

    // 调试处理程序
    toggle_debugger_breakpoint: debugHandlers.toggleDebuggerBreakpoint,
    get_debugger_breakpoints: debugHandlers.getDebuggerBreakpoints,
    run_configuration: debugHandlers.runConfiguration,
    get_run_configurations: debugHandlers.getRunConfigurations,

    // 终端处理程序
    get_terminal_text: terminalHandlers.getTerminalText,
    execute_terminal_command: terminalHandlers.executeTerminalCommand,
    wait: terminalHandlers.wait,

    // Git处理程序
    get_project_vcs_status: gitHandlers.getProjectVcsStatus,
    find_commit_by_message: gitHandlers.findCommitByMessage,

    // Git高级处理程序
    get_file_history: gitAdvancedHandlers.getFileHistory,
    get_file_diff: gitAdvancedHandlers.getFileDiff,
    get_branch_info: gitAdvancedHandlers.getBranchInfo,
    get_commit_details: gitAdvancedHandlers.getCommitDetails,
    commit_changes: gitAdvancedHandlers.commitChanges,
    pull_changes: gitAdvancedHandlers.pullChanges,
    switch_branch: gitAdvancedHandlers.switchBranch,
    create_branch: gitAdvancedHandlers.createBranch,

    // 操作处理程序
    list_available_actions: actionHandlers.listAvailableActions,
    execute_action_by_id: actionHandlers.executeActionById,
    get_progress_indicators: actionHandlers.getProgressIndicators,

    // 项目处理程序
    get_project_modules: projectHandlers.getProjectModules,
    get_project_dependencies: projectHandlers.getProjectDependencies,
    
    // 代码分析处理程序
    get_symbols_in_file: codeAnalysisHandlers.getSymbolsInFile,
    find_references: codeAnalysisHandlers.findReferences,
    refactor_code_at_location: codeAnalysisHandlers.refactorCodeAtLocation
};