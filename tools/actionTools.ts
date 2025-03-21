import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {successResponse, errorResponse, formatError} from '../utils/response';

/**
 * 列出可用操作
 */
export class ListAvailableActionsTool extends AbstractMcpTool<Record<string, never>> {
    constructor() {
        super(
            'list_available_actions',
            '列出IDE编辑器中可用的所有操作。返回操作信息数组。',
            {type: 'object', properties: {}}
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // 注意：VS Code API没有直接获取所有可用操作的方法
            // 这里返回最常用的一组命令
            const commonCommands = [
                {id: 'workbench.action.files.save', text: 'Save File'},
                {id: 'workbench.action.files.saveAll', text: 'Save All Files'},
                {id: 'editor.action.formatDocument', text: 'Format Document'},
                {id: 'workbench.action.openSettings', text: 'Open Settings'},
                {id: 'workbench.action.tasks.build', text: 'Run Build Task'},
                {id: 'workbench.action.tasks.test', text: 'Run Test Task'},
                {id: 'workbench.action.debug.start', text: 'Start Debugging'},
                {id: 'editor.action.revealDefinition', text: 'Go to Definition'},
                {id: 'editor.action.goToReferences', text: 'Find All References'},
                {id: 'workbench.action.terminal.toggleTerminal', text: 'Toggle Terminal'}
            ];

            return successResponse(commonCommands);
        } catch (error) {
            return errorResponse(`Error listing actions: ${formatError(error)}`);
        }
    }
}

/**
 * 通过ID执行操作
 */
export class ExecuteActionByIdTool extends AbstractMcpTool<ToolParams['executeActionById']> {
    constructor() {
        super(
            'execute_action_by_id',
            '在IDE编辑器中通过ID执行操作。如果找不到指定ID的操作，则返回错误。',
            {
                type: 'object',
                properties: {
                    actionId: {type: 'string'}
                },
                required: ['actionId']
            }
        );
    }

    async handle(args: ToolParams['executeActionById']): Promise<Response> {
        try {
            const {actionId} = args;

            // 执行命令
            try {
                await vscode.commands.executeCommand(actionId);
                return successResponse('ok');
            } catch (err) {
                return errorResponse('action not found');
            }
        } catch (error) {
            return errorResponse(`Error executing action: ${formatError(error)}`);
        }
    }
}

/**
 * 获取进度指示器
 */
export class GetProgressIndicatorsTool extends AbstractMcpTool<Record<string, never>> {
    constructor() {
        super(
            'get_progress_indicators',
            '获取IDE编辑器中所有正在运行的进度指示器的状态。返回进度信息数组。',
            {type: 'object', properties: {}}
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // 注意：VS Code API没有提供直接访问进度指示器的方法
            // 返回一个空数组
            return successResponse([]);
        } catch (error) {
            return errorResponse(`Error getting progress indicators: ${formatError(error)}`);
        }
    }
}