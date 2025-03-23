import { Response } from '../types';
import * as editorHandlers from './editorHandlers';
import * as fileHandlers from './fileHandlers';
import * as debugHandlers from './debugHandlers';
import * as terminalHandlers from './terminalHandlers';
import * as gitHandlers from './gitHandlers';
import * as actionHandlers from './actionHandlers';
import * as projectHandlers from './projectHandlers';
import * as codeAnalysisHandlers from './codeAnalysisHandlers';
// import { Logger } from '../utils/logger';

// Create module-specific logger
// const log = Logger.forModule('Handlers');

/**
 * Tool handler type definition
 */
export type ToolHandler = (args: any) => Promise<Response>;

/**
 * Mapping table for all tool handlers
 */
export const toolHandlers: Record<string, ToolHandler> = {
    // Editor handlers
    get_open_in_editor_file_text: editorHandlers.getOpenInEditorFileText,
    get_open_in_editor_file_path: editorHandlers.getOpenInEditorFilePath,
    get_selected_in_editor_text: editorHandlers.getSelectedInEditorText,
    replace_selected_text: editorHandlers.replaceSelectedText,
    replace_current_file_text: editorHandlers.replaceCurrentFileText,
    get_all_open_file_texts: editorHandlers.getAllOpenFileTexts,
    get_all_open_file_paths: editorHandlers.getAllOpenFilePaths,
    open_file_in_editor: editorHandlers.openFileInEditor,

    // File handlers
    create_new_file_with_text: fileHandlers.createNewFileWithText,
    find_files_by_name_substring: fileHandlers.findFilesByNameSubstring,
    get_file_text_by_path: fileHandlers.getFileTextByPath,
    replace_file_text_by_path: fileHandlers.replaceFileTextByPath,
    list_files_in_folder: fileHandlers.listFilesInFolder,
    search_in_files_content: fileHandlers.searchInFilesContent,

    // Debug handlers
    toggle_debugger_breakpoint: debugHandlers.toggleDebuggerBreakpoint,
    get_debugger_breakpoints: debugHandlers.getDebuggerBreakpoints,
    run_configuration: debugHandlers.runConfiguration,
    get_run_configurations: debugHandlers.getRunConfigurations,

    // Terminal handlers
    get_terminal_text: terminalHandlers.getTerminalText,
    execute_terminal_command: terminalHandlers.executeTerminalCommand,
    execute_command_with_output: terminalHandlers.executeCommandWithOutput,
    get_command_output: terminalHandlers.getCommandOutput,
    wait: terminalHandlers.wait,

    // Git handlers (basic and advanced operations)
    get_project_vcs_status: gitHandlers.getProjectVcsStatus,
    find_commit_by_message: gitHandlers.findCommitByMessage,
    get_file_history: gitHandlers.getFileHistory,
    get_file_diff: gitHandlers.getFileDiff,
    get_branch_info: gitHandlers.getBranchInfo,
    get_commit_details: gitHandlers.getCommitDetails,
    commit_changes: gitHandlers.commitChanges,
    pull_changes: gitHandlers.pullChanges,
    switch_branch: gitHandlers.switchBranch,
    create_branch: gitHandlers.createBranch,

    // Action handlers
    list_available_actions: actionHandlers.listAvailableActions,
    execute_action_by_id: actionHandlers.executeActionById,
    get_progress_indicators: actionHandlers.getProgressIndicators,

    // Project handlers
    get_project_modules: projectHandlers.getProjectModules,
    get_project_dependencies: projectHandlers.getProjectDependencies,
    
    // Code analysis handlers
    get_symbols_in_file: codeAnalysisHandlers.getSymbolsInFile,
    find_references: codeAnalysisHandlers.findReferences,
    refactor_code_at_location: codeAnalysisHandlers.refactorCodeAtLocation
};