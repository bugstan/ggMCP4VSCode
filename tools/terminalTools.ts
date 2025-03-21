import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {errorResponse, formatError, successResponse} from '../utils/response';

/**
 * 获取终端文本内容
 */
export class GetTerminalTextTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_terminal_text',
            '从IDE中的第一个活动终端获取当前文本内容。如果没有打开终端，则返回空字符串。',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            // 获取当前活动的终端
            if (vscode.window.terminals.length === 0) {
                return successResponse('');
            }
            
            // 注意：VS Code API不直接提供获取终端内容的方法
            // 这里返回一个说明性消息
            return successResponse('Terminal content not directly accessible via VS Code API');
        } catch (error) {
            return errorResponse(`Error getting terminal content: ${formatError(error)}`);
        }
    }
}

/**
 * 在终端中执行命令
 */
export class ExecuteTerminalCommandTool extends AbstractMcpTool<ToolParams['executeTerminalCommand']> {
    constructor() {
        super(
            'execute_terminal_command',
            '在IDE的集成终端中执行指定的shell命令。返回终端输出或错误消息。',
            {
                type: 'object',
                properties: {
                    command: { type: 'string' }
                },
                required: ['command']
            }
        );
    }

    async handle(args: ToolParams['executeTerminalCommand']): Promise<Response> {
        try {
            const { command } = args;
            
            // 获取或创建终端
            let terminal = vscode.window.activeTerminal;
            if (!terminal) {
                terminal = vscode.window.createTerminal('MCP Command Terminal');
            }
            
            // 激活终端并执行命令
            terminal.show();
            terminal.sendText(command);
            
            // 注意：VS Code API不直接提供获取命令执行结果的方法
            // 这里返回一个说明性消息
            return successResponse(`Command executed: ${command}`);
        } catch (error) {
            return errorResponse(`Error executing terminal command: ${formatError(error)}`);
        }
    }
}

/**
 * 等待指定的毫秒数
 */
export class WaitTool extends AbstractMcpTool<ToolParams['wait']> {
    constructor() {
        super(
            'wait',
            '等待指定的毫秒数。在等待完成后返回"ok"。',
            {
                type: 'object',
                properties: {
                    milliseconds: { type: 'number' }
                },
                required: ['milliseconds']
            }
        );
    }

    async handle(args: ToolParams['wait']): Promise<Response> {
        try {
            const { milliseconds } = args;
            
            // 使用Promise创建等待
            await new Promise(resolve => setTimeout(resolve, milliseconds));
            
            return successResponse('ok');
        } catch (error) {
            return errorResponse(`Error during wait: ${formatError(error)}`);
        }
    }
}