import * as vscode from 'vscode';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';

/**
 * 列出可用操作
 */
export async function listAvailableActions(): Promise<Response> {
    try {
        // 获取所有命令
        const commands = await vscode.commands.getCommands(true);
        
        // 格式化结果
        const actions = commands.map((cmd: string) => ({
            id: cmd,
            text: cmd.replace(/\./g, ' ').replace(/([A-Z])/g, ' $1').trim()
        }));
        
        return successResponse(JSON.stringify(actions));
    } catch (error) {
        return errorResponse(`列出操作时出错: ${formatError(error)}`);
    }
}

/**
 * 通过ID执行操作
 */
export async function executeActionById(params: { actionId: string }): Promise<Response> {
    try {
        const { actionId } = params;
        
        if (!actionId) {
            return errorResponse('操作ID不能为空');
        }
        
        // 检查命令是否存在
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(actionId)) {
            return errorResponse('action not found');
        }
        
        // 执行命令
        await vscode.commands.executeCommand(actionId);
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`执行操作时出错: ${formatError(error)}`);
    }
}

/**
 * 获取进度指示器
 * 注意：VSCode API 没有直接提供访问进度指示器的方法
 * 这是一个信息性实现，返回运行中的操作信息
 */
export async function getProgressIndicators(): Promise<Response> {
    try {
        // VSCode API 没有直接提供访问进度指示器的方法
        // 无法直接获取活动通知列表，因为该 API 在此版本中不可用
        
        // 返回一个空数组和说明信息
        const result = {
            indicators: [],
            note: "VSCode API 在当前版本中没有提供访问进度指示器或活动通知的方法"
        };
        
        return successResponse(JSON.stringify(result));
    } catch (error) {
        return errorResponse(`获取进度指示器时出错: ${formatError(error)}`);
    }
}