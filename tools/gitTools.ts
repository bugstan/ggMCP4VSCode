import * as vscode from 'vscode';
import {AbstractMcpTool} from '../types/tool';
import {Response, ToolParams} from '../types';
import {successResponse, errorResponse, formatError} from '../utils/response';
import {toRelativePath} from '../utils/pathUtils';
import {getProjectRoot} from '../utils/project';

/**
 * 获取项目版本控制状态工具
 */
export class GetProjectVcsStatusTool extends AbstractMcpTool<{}> {
    constructor() {
        super(
            'get_project_vcs_status',
            '获取项目中文件的版本控制状态。返回变更文件的列表，包含路径和变更类型。',
            {
                type: 'object',
                properties: {}
            }
        );
    }

    async handle(_args: {}): Promise<Response> {
        try {
            const projectRoot = getProjectRoot();

            if (!projectRoot) {
                return errorResponse('project dir not found');
            }

            // 使用VS Code API获取git扩展
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                return successResponse([]); // Git扩展未安装
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
                return successResponse([]); // 没有Git仓库
            }

            // 获取第一个仓库的状态
            const repository = repositories[0];
            if (!repository) {
                return successResponse([]);
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

                // 转换为项目相对路径
                const relativePath = toRelativePath(path);

                return {
                    path: relativePath || path,
                    type: change.status || change.type || 'UNKNOWN'
                };
            });

            return successResponse(result);
        } catch (error) {
            console.error('获取版本控制状态时出错:', error);
            return errorResponse(formatError(error));
        }
    }
}

/**
 * 通过消息搜索提交
 */
export class FindCommitByMessageTool extends AbstractMcpTool<ToolParams['findCommitByMessage']> {
    constructor() {
        super(
            'find_commit_by_message',
            '在项目历史记录中根据提供的文本或关键字搜索提交。返回匹配的提交哈希数组。',
            {
                type: 'object',
                properties: {
                    text: {type: 'string'}
                },
                required: ['text']
            }
        );
    }

    async handle(args: ToolParams['findCommitByMessage']): Promise<Response> {
        try {
            const {text} = args;

            // 获取Git扩展
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                return successResponse([]); // Git扩展未安装
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
                return successResponse([]); // 没有Git仓库
            }

            // 获取第一个仓库
            const repository = repositories[0];
            if (!repository) {
                return successResponse([]);
            }

            // 为搜索文本进行转义，防止命令注入
            const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");

            // 执行git log命令搜索提交
            const logCommand = `git log --grep="${escapedText}" --format="%H" -n 10`;

            // 尝试执行Git命令
            try {
                // 检查是否存在exec方法
                if (typeof repository.exec !== 'function') {
                    // 尝试使用替代方法
                    const result = await vscode.commands.executeCommand('git.cmd', [
                        'log',
                        `--grep=${escapedText}`,
                        '--format=%H',
                        '-n',
                        '10'
                    ]);

                    if (Array.isArray(result)) {
                        return successResponse(result);
                    }

                    return errorResponse('无法执行Git命令');
                }

                // 使用仓库的exec方法
                const result = await repository.exec(logCommand);

                if (result.exitCode !== 0) {
                    console.error(`Git命令执行失败: ${result.stderr}`);
                    return successResponse([]); // 返回空数组，表示没有找到匹配的提交
                }

                // 解析提交哈希
                const commits = result.stdout
                    .split('\n')
                    .filter((line: string) => line.trim() !== '');

                return successResponse(commits);
            } catch (err) {
                console.error('执行Git命令失败:', err);
                // 返回空数组，表示没有找到匹配的提交或执行出错
                return successResponse([]);
            }
        } catch (error) {
            console.error('查找提交时出错:', error);
            return errorResponse(formatError(error));
        }
    }
}