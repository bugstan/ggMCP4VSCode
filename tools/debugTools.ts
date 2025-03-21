import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {errorResponse, formatError, successResponse} from '../utils/response';
import {toAbsolutePathSafe} from '../utils/pathUtils';

// 为Breakpoint类型添加声明
/**
 * 设置或移除调试断点
 */
export class ToggleDebuggerBreakpointTool extends AbstractMcpTool<ToolParams['toggleDebuggerBreakpoint']> {
    constructor() {
        super(
            'toggle_debugger_breakpoint',
            '在指定项目文件的指定行切换调试器断点。如果无法确定项目目录，则返回错误。',
            {
                type: 'object',
                properties: {
                    filePathInProject: {type: 'string'},
                    line: {type: 'number'}
                },
                required: ['filePathInProject', 'line']
            }
        );
    }

    async handle(args: ToolParams['toggleDebuggerBreakpoint']): Promise<Response> {
        try {
            const {filePathInProject, line} = args;

            // 将项目相对路径转换为绝对路径
            const absolutePath = toAbsolutePathSafe(filePathInProject);
            if (!absolutePath) {
                return errorResponse('找不到项目目录或路径无效');
            }

            // 将路径转换为URI
            const fileUri = vscode.Uri.file(absolutePath);

            // 创建断点位置
            const position = new vscode.Position(line - 1, 0); // VSCode行号从0开始，而用户传入的是从1开始

            // 检查是否存在相同位置的断点
            const existingBreakpoints = vscode.debug.breakpoints.filter(bp => {
                if (bp instanceof vscode.SourceBreakpoint) {
                    const bpLocation = bp.location;
                    return bpLocation.uri.fsPath === fileUri.fsPath &&
                        bpLocation.range.start.line === position.line;
                }
                return false;
            });

            // 切换断点（存在则移除，不存在则添加）
            if (existingBreakpoints.length > 0) {
                // 移除现有断点
                vscode.debug.removeBreakpoints(existingBreakpoints);
                return successResponse('断点已移除');
            } else {
                // 添加新断点
                const breakpoint = new vscode.SourceBreakpoint(
                    new vscode.Location(fileUri, position),
                    true // 启用断点
                );
                vscode.debug.addBreakpoints([breakpoint]);

                // 打开文件并显示断点位置
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    await vscode.window.showTextDocument(document);
                    // 滚动到断点位置
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.revealRange(
                            new vscode.Range(position, position),
                            vscode.TextEditorRevealType.InCenter
                        );
                    }
                } catch (e) {
                    // 打开文件失败，但断点已设置，所以仍然返回成功
                    console.warn('打开文件失败，但断点已设置:', e);
                }

                return successResponse('断点已添加');
            }
        } catch (error) {
            console.error('切换断点错误:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * 获取所有断点信息
 */
export class GetDebuggerBreakpointsTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_debugger_breakpoints',
            '获取项目中所有已设置的行断点信息。返回一个包含断点路径和行号的JSON格式列表。',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        try {
            // 获取所有断点
            // 过滤并转换断点信息
            const breakpointInfo = vscode.debug.breakpoints
                .filter(bp => bp instanceof vscode.SourceBreakpoint)
                .map(bp => {
                    const sourceBp = bp as vscode.SourceBreakpoint;
                    const location = sourceBp.location;
                    return {
                        path: location.uri.fsPath,
                        line: location.range.start.line + 1 // 转换为1-based行号
                    };
                });

            return successResponse(breakpointInfo);
        } catch (error) {
            console.error('获取断点错误:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * 获取运行配置列表
 */
export class GetRunConfigurationsTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_run_configurations',
            '获取当前项目中可用的运行配置列表。返回JSON格式的运行配置名称列表。',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        try {
            // 获取启动配置
            const launchConfigs = vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];

            // 提取配置名称
            const configNames = launchConfigs.map(config => config.name).filter(Boolean);

            return successResponse(configNames);
        } catch (error) {
            console.error('获取运行配置错误:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * 运行指定配置
 */
export class RunConfigurationTool extends AbstractMcpTool<ToolParams['runConfiguration']> {
    constructor() {
        super(
            'run_configuration',
            '运行当前项目中的特定运行配置。如果找不到运行配置或执行失败，则返回错误。',
            {
                type: 'object',
                properties: {
                    configName: {type: 'string'}
                },
                required: ['configName']
            }
        );
    }

    async handle(args: ToolParams['runConfiguration']): Promise<Response> {
        try {
            const {configName} = args;

            // 获取所有启动配置
            const launchConfigs = vscode.workspace.getConfiguration('launch').get('configurations') as any[] || [];

            // 查找指定名称的配置
            const targetConfig = launchConfigs.find(config => config.name === configName);
            if (!targetConfig) {
                return errorResponse(`找不到名为 "${configName}" 的运行配置`);
            }

            // 执行启动调试会话
            const success = await vscode.debug.startDebugging(
                undefined, // 使用当前工作区
                targetConfig
            );

            if (success) {
                return successResponse('已启动运行配置');
            } else {
                return errorResponse('启动运行配置失败');
            }
        } catch (error) {
            console.error('运行配置错误:', error);
            return errorResponse(formatError(error));
        }
    }
}