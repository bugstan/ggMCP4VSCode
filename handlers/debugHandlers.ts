import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { errorResponse, formatError, successResponse } from '../utils/response';
import { getProjectRoot } from '../utils/project';

// 添加断点类型
type VSCodeBreakpoint = vscode.Breakpoint;
type VSCodeSourceBreakpoint = vscode.SourceBreakpoint;

/**
 * 切换调试器断点
 */
export async function toggleDebuggerBreakpoint(
    params: { filePathInProject: string, line: number }
): Promise<Response> {
    try {
        const {filePathInProject, line} = params;
        const projectRoot = getProjectRoot();

        if (!projectRoot) {
            return errorResponse("can't find project dir");
        }

        // 解析文件的完整路径
        const filePath = path.join(projectRoot, filePathInProject);

        // 创建一个断点位置
        const uri = vscode.Uri.file(filePath);
        const position = new vscode.Position(line - 1, 0); // 行号从0开始，而参数从1开始
        const location = new vscode.Location(uri, position);

        // 获取所有现有断点
        // 检查是否已经存在匹配的断点
        const allBreakpoints: readonly VSCodeBreakpoint[] = vscode.debug.breakpoints;
        const existingBreakpoints = allBreakpoints.filter((bp): bp is VSCodeSourceBreakpoint => {
            if (bp instanceof vscode.SourceBreakpoint) {
                const bpPos = bp.location.range.start;
                return bp.location.uri.fsPath === uri.fsPath &&
                    bpPos.line === position.line;
            }
            return false;
        });

        if (existingBreakpoints.length > 0) {
            // 删除现有断点
            await vscode.debug.removeBreakpoints(existingBreakpoints);
        } else {
            // 添加新断点
            const breakpoint = new vscode.SourceBreakpoint(
                location,
                true,  // enabled
                undefined,  // condition
                undefined,  // hit condition
                undefined   // log message
            );
            await vscode.debug.addBreakpoints([breakpoint]);
        }

        // 打开文件并导航到断点位置
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );

        return successResponse('ok');
    } catch (error) {
        return errorResponse(`切换断点时出错: ${formatError(error)}`);
    }
}

/**
 * 获取所有调试器断点
 */
export async function getDebuggerBreakpoints(): Promise<Response> {
    try {
        // 获取所有断点
        const allBreakpoints: readonly VSCodeBreakpoint[] = vscode.debug.breakpoints;
        
        // 格式化结果
        const result = allBreakpoints
            .filter((bp): bp is VSCodeSourceBreakpoint => bp instanceof vscode.SourceBreakpoint)
            .map(bp => {
                return {
                    path: bp.location.uri.fsPath,
                    line: bp.location.range.start.line + 1 // 转换为1-based行号
                };
            });

        return successResponse(JSON.stringify(result));
    } catch (error) {
        return errorResponse(`获取断点时出错: ${formatError(error)}`);
    }
}

/**
 * 运行配置
 */
export async function runConfiguration(params: { configName: string }): Promise<Response> {
    try {
        const {configName} = params;

        // 获取所有启动配置
        const launchConfigs = vscode.workspace
            .getConfiguration('launch')
            .get<any[]>('configurations') || [];

        // 查找指定的配置
        const config = launchConfigs.find((c) => c.name === configName);

        if (!config) {
            return errorResponse(`未找到名为 "${configName}" 的运行配置`);
        }

        // 启动调试会话
        await vscode.debug.startDebugging(undefined, config);

        return successResponse('ok');
    } catch (error) {
        return errorResponse(`error ${formatError(error)}`);
    }
}

/**
 * 获取运行配置
 */
export async function getRunConfigurations(): Promise<Response> {
    try {
        // 获取所有启动配置
        const launchConfigs = vscode.workspace
            .getConfiguration('launch')
            .get<any[]>('configurations') || [];

        // 提取配置名称
        const configNames = launchConfigs.map((c) => c.name);

        return successResponse(JSON.stringify(configNames));
    } catch (error) {
        return errorResponse(`获取运行配置时出错: ${formatError(error)}`);
    }
}