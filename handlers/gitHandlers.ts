import * as vscode from 'vscode';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';

/**
 * 获取项目版本控制状态
 */
export async function getProjectVcsStatus(): Promise<Response> {
    try {
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // 使用VS Code API获取git扩展
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return successResponse(JSON.stringify([])); // Git扩展未安装
        }
        
        // 确保Git扩展已激活
        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }
        
        const api = gitExtension.exports.getAPI(1);
        if (!api) {
            return errorResponse('无法获取Git API');
        }
        
        const repositories = api.repositories;
        
        if (!repositories || repositories.length === 0) {
            return successResponse(JSON.stringify([])); // 没有Git仓库
        }
        
        // 获取第一个仓库的状态
        const repository = repositories[0];
        if (!repository) {
            return successResponse(JSON.stringify([]));
        }
        
        // 获取工作树变更，兼容不同版本的API
        let changes = [];
        try {
            // 尝试获取工作树变更
            if (repository.state && repository.state.workingTreeChanges) {
                changes = repository.state.workingTreeChanges;
            } else if (repository.state && repository.state.changes) {
                changes = repository.state.changes;
            }
        } catch (err) {
            console.error('获取Git变更时出错:', err);
            // 继续执行，返回空数组
        }
        
        // 格式化结果
        const result = changes.map((change: any) => {
            let path;
            
            // 尝试不同的属性名来获取路径
            if (change.uri && change.uri.path) {
                path = change.uri.path;
            } else if (change.resourceUri && change.resourceUri.path) {
                path = change.resourceUri.path;
            } else if (change.path) {
                path = change.path;
            } else {
                path = '';
            }
            
            // 移除项目根路径前缀
            if (path && projectRoot && path.startsWith(projectRoot)) {
                path = path.replace(projectRoot, '');
            }
            
            // 规范化路径，确保以 / 开头
            if (path && !path.startsWith('/')) {
                path = '/' + path;
            }
            
            return {
                path: path,
                type: change.status || change.type || 'UNKNOWN'
            };
        });
        
        return successResponse(JSON.stringify(result));
    } catch (error) {
        return errorResponse(`获取版本控制状态时出错: ${formatError(error)}`);
    }
}

/**
 * 根据消息查找提交
 */
export async function findCommitByMessage(params: { text: string }): Promise<Response> {
    try {
        const { text } = params;
        
        // 获取Git扩展
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return successResponse(JSON.stringify([])); // Git扩展未安装
        }
        
        // 确保Git扩展已激活
        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }
        
        const api = gitExtension.exports.getAPI(1);
        if (!api) {
            return errorResponse('无法获取Git API');
        }
        
        const repositories = api.repositories;
        
        if (!repositories || repositories.length === 0) {
            return successResponse(JSON.stringify([])); // 没有Git仓库
        }
        
        // 获取第一个仓库
        const repository = repositories[0];
        if (!repository) {
            return successResponse(JSON.stringify([]));
        }
        
        // 为搜索文本进行转义，防止命令注入
        const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
        
        // 执行git log命令搜索提交
        const logCommand = `git log --grep="${escapedText}" --format="%H" -n 10`;
        
        // 检查是否存在exec方法
        if (typeof repository.exec !== 'function') {
            return errorResponse('当前Git API版本不支持直接执行Git命令');
        }
        
        try {
            const result = await repository.exec(logCommand);
            
            if (result.exitCode !== 0) {
                return errorResponse(`Git命令执行失败: ${result.stderr}`);
            }
            
            // 解析提交哈希
            const commits = result.stdout
                .split('\n')
                .filter((line: string) => line.trim() !== '');
            
            return successResponse(JSON.stringify(commits));
        } catch (err) {
            // 尝试替代方法
            return errorResponse(`执行Git命令失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    } catch (error) {
        return errorResponse(`查找提交时出错: ${formatError(error)}`);
    }
}