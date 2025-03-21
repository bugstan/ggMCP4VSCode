import * as vscode from 'vscode';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';

/**
 * 获取终端文本
 * 注意：VSCode API 目前没有直接提供访问终端内容的方法
 * 这是一个有限的实现，返回终端基本信息
 */
export async function getTerminalText(): Promise<Response> {
    try {
        // 获取活动终端
        const terminal = vscode.window.activeTerminal;
        
        if (!terminal) {
            return successResponse(''); // 没有打开的终端，返回空字符串
        }
        
        // 构建基本信息响应
        const terminalInfo = {
            name: terminal.name,
            processId: 'unknown', // processId 需要异步获取
            type: terminal.creationOptions ? String(terminal.creationOptions.name || 'unknown') : 'unknown'
        };
        
        // 尝试获取进程ID（如果API支持）
        try {
            if (terminal.processId) {
                const processId = await terminal.processId;
                if (processId) {
                    terminalInfo.processId = String(processId);
                }
            }
        } catch (err) {
            // 忽略错误，保持默认值
        }
        
        return successResponse(JSON.stringify(terminalInfo));
    } catch (error) {
        return errorResponse(`获取终端信息时出错: ${formatError(error)}`);
    }
}

/**
 * 执行终端命令
 */
export async function executeTerminalCommand(params: { command: string }): Promise<Response> {
    try {
        const { command } = params;
        
        if (!command) {
            return errorResponse('无效的命令');
        }
        
        // 获取活动终端，如果没有则创建新的
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
            terminal = vscode.window.createTerminal('MCP Terminal');
        }
        
        // 显示终端并执行命令
        terminal.show();
        
        // 使用 sendText 方法发送命令到终端
        // 第二个参数设为 true 可以自动添加换行符
        terminal.sendText(command, true);
        
        // 由于无法直接捕获终端输出（VSCode API限制），使用超时返回
        // 稍微等待一下，给命令一些执行时间
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return successResponse(JSON.stringify({
            command: command,
            output: "命令已执行，但无法捕获输出（VSCode API限制）",
            message: `命令 "${command}" 已发送到终端执行`
        }));
    } catch (error) {
        return errorResponse(`执行终端命令时出错: ${formatError(error)}`);
    }
}

/**
 * 等待指定毫秒数
 */
export async function wait(params: { milliseconds: number }): Promise<Response> {
    try {
        // 确保毫秒数是一个有效的数字
        let milliseconds = params.milliseconds;
        if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds <= 0) {
            milliseconds = 5000; // 默认值
        }
        
        // 限制最大等待时间（例如1分钟）
        const maxWaitTime = 60000;
        if (milliseconds > maxWaitTime) {
            milliseconds = maxWaitTime;
        }
        
        // 创建Promise等待指定时间
        await new Promise((resolve) => setTimeout(resolve, milliseconds));
        
        return successResponse('ok');
    } catch (error) {
        return errorResponse(`等待时出错: ${formatError(error)}`);
    }
}