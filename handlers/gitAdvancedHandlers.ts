import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';

/**
 * 获取Git API
 * @returns Git API或null
 */
async function getGitAPI() {
    // 使用VS Code API获取git扩展
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        return null; // Git扩展未安装
    }
    
    // 确保Git扩展已激活
    if (!gitExtension.isActive) {
        await gitExtension.activate();
    }
    
    const api = gitExtension.exports.getAPI(1);
    if (!api) {
        return null;
    }
    
    return api;
}

/**
 * 获取当前Git仓库
 * @returns Git仓库或null
 */
async function getCurrentRepository() {
    const api = await getGitAPI();
    
    if (!api) {
        return null;
    }
    
    const repositories = api.repositories;
    
    if (!repositories || repositories.length === 0) {
        return null; // 没有Git仓库
    }
    
    // 获取第一个仓库
    return repositories[0];
}

/**
 * 执行Git命令
 * @param command Git命令
 * @returns 命令执行结果
 */
async function executeGitCommand(command: string): Promise<{stdout: string, stderr: string, exitCode: number} | null> {
    const repository = await getCurrentRepository();
    
    if (!repository || typeof repository.exec !== 'function') {
        return null;
    }
    
    try {
        return await repository.exec(command);
    } catch (error) {
        console.error(`执行Git命令失败: ${command}`, error);
        return null;
    }
}

/**
 * 查看文件修改历史
 */
export async function getFileHistory(params: { pathInProject: string, maxCount?: number }): Promise<Response> {
    try {
        const { pathInProject, maxCount = 10 } = params;
        
        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // 构建文件的绝对路径
        const filePath = path.isAbsolute(pathInProject) 
            ? pathInProject 
            : path.join(projectRoot, pathInProject);
        
        // 获取相对于Git仓库的路径
        let relativePath = pathInProject;
        if (path.isAbsolute(pathInProject)) {
            relativePath = path.relative(projectRoot, pathInProject);
        }
        // 确保路径分隔符统一使用正斜杠
        relativePath = relativePath.replace(/\\/g, '/');
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 使用git log获取文件历史
        const command = `git log --max-count=${maxCount} --format="%H|%an|%ad|%s" --date=short -- "${relativePath}"`;
        const result = await executeGitCommand(command);
        
        if (!result || result.exitCode !== 0) {
            return errorResponse(`获取文件历史失败: ${result ? result.stderr : '未知错误'}`);
        }
        
        // 解析提交历史
        const commits = result.stdout
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const parts = line.split('|');
                return {
                    hash: parts[0] || '',
                    author: parts[1] || '',
                    date: parts[2] || '',
                    message: parts.slice(3).join('|') || ''
                };
            });
        
        return successResponse({
            file: relativePath,
            commits: commits
        });
    } catch (error) {
        return errorResponse(`获取文件历史时出错: ${formatError(error)}`);
    }
}

/**
 * 查看文件差异
 */
export async function getFileDiff(params: { pathInProject: string, hash1?: string, hash2?: string }): Promise<Response> {
    try {
        const { pathInProject, hash1, hash2 } = params;
        
        const projectRoot = getProjectRoot();
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // 获取相对于Git仓库的路径
        let relativePath = pathInProject;
        if (path.isAbsolute(pathInProject)) {
            relativePath = path.relative(projectRoot, pathInProject);
        }
        // 确保路径分隔符统一使用正斜杠
        relativePath = relativePath.replace(/\\/g, '/');
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        let command = '';
        
        if (hash1 && hash2) {
            // 比较两个提交之间的差异
            command = `git diff ${hash1} ${hash2} -- "${relativePath}"`;
        } else if (hash1) {
            // 比较指定提交与工作区的差异
            command = `git diff ${hash1} -- "${relativePath}"`;
        } else {
            // 比较暂存区与工作区的差异
            command = `git diff -- "${relativePath}"`;
        }
        
        const result = await executeGitCommand(command);
        
        if (!result || result.exitCode !== 0) {
            return errorResponse(`获取文件差异失败: ${result ? result.stderr : '未知错误'}`);
        }
        
        return successResponse({
            file: relativePath,
            diff: result.stdout
        });
    } catch (error) {
        return errorResponse(`获取文件差异时出错: ${formatError(error)}`);
    }
}

/**
 * 获取当前分支信息
 */
export async function getBranchInfo(): Promise<Response> {
    try {
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 获取当前分支
        const currentBranch = repository.state?.HEAD?.name || '';
        
        // 获取所有分支
        const command = 'git branch -a';
        const result = await executeGitCommand(command);
        
        if (!result || result.exitCode !== 0) {
            return errorResponse(`获取分支信息失败: ${result ? result.stderr : '未知错误'}`);
        }
        
        // 解析分支列表
        const branches = result.stdout
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const isCurrent = line.startsWith('*');
                const name = line.replace('*', '').trim();
                const isRemote = name.startsWith('remotes/');
                
                return {
                    name: isRemote ? name.replace('remotes/', '') : name,
                    isCurrent,
                    isRemote
                };
            });
        
        return successResponse({
            currentBranch,
            branches
        });
    } catch (error) {
        return errorResponse(`获取分支信息时出错: ${formatError(error)}`);
    }
}

/**
 * 查看特定提交的详细信息
 */
export async function getCommitDetails(params: { hash: string }): Promise<Response> {
    try {
        const { hash } = params;
        
        if (!hash) {
            return errorResponse('提交哈希不能为空');
        }
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 获取提交详情
        const detailCommand = `git show --name-status --format="%H%n%an%n%ae%n%ad%n%s%n%b" --date=iso ${hash}`;
        const detailResult = await executeGitCommand(detailCommand);
        
        if (!detailResult || detailResult.exitCode !== 0) {
            return errorResponse(`获取提交详情失败: ${detailResult ? detailResult.stderr : '未知错误'}`);
        }
        
        // 解析提交详情
        const lines = detailResult.stdout.split('\n');
        
        // 提取基本信息
        const commitHash = lines[0];
        const author = lines[1];
        const email = lines[2];
        const date = lines[3];
        const subject = lines[4];
        
        // 提取提交消息正文
        let bodyEndIndex = 5; // 默认值
        while (bodyEndIndex < lines.length && !lines[bodyEndIndex].match(/^[A-Z]\t/)) {
            bodyEndIndex++;
        }
        
        const body = lines.slice(5, bodyEndIndex).join('\n').trim();
        
        // 提取更改的文件
        const files = [];
        for (let i = bodyEndIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const match = line.match(/^([A-Z])\t(.+)$/);
            if (match) {
                const [, status, filepath] = match;
                files.push({
                    status: getChangeStatusDescription(status),
                    path: filepath
                });
            }
        }
        
        return successResponse({
            hash: commitHash,
            author,
            email,
            date,
            subject,
            body,
            changes: files
        });
    } catch (error) {
        return errorResponse(`获取提交详情时出错: ${formatError(error)}`);
    }
}

/**
 * 提交更改
 */
export async function commitChanges(params: { message: string, amend?: boolean }): Promise<Response> {
    try {
        const { message, amend = false } = params;
        
        if (!message && !amend) {
            return errorResponse('提交消息不能为空');
        }
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 检查是否有暂存的更改
        const statusCommand = 'git status --porcelain';
        const statusResult = await executeGitCommand(statusCommand);
        
        if (!statusResult || statusResult.exitCode !== 0) {
            return errorResponse(`检查状态失败: ${statusResult ? statusResult.stderr : '未知错误'}`);
        }
        
        const hasUnstagedChanges = statusResult.stdout.split('\n')
            .some(line => line.trim() !== '' && line.startsWith('??'));
        
        const hasChanges = statusResult.stdout.trim() !== '';
        
        if (!hasChanges && !amend) {
            return errorResponse('没有要提交的更改');
        }
        
        if (hasUnstagedChanges) {
            // 暂存所有更改
            const stageCommand = 'git add .';
            const stageResult = await executeGitCommand(stageCommand);
            
            if (!stageResult || stageResult.exitCode !== 0) {
                return errorResponse(`暂存更改失败: ${stageResult ? stageResult.stderr : '未知错误'}`);
            }
        }
        
        // 提交更改
        const commitCommand = amend 
            ? `git commit --amend -m "${message.replace(/"/g, '\\"')}"`
            : `git commit -m "${message.replace(/"/g, '\\"')}"`;
        
        const commitResult = await executeGitCommand(commitCommand);
        
        if (!commitResult || commitResult.exitCode !== 0) {
            return errorResponse(`提交更改失败: ${commitResult ? commitResult.stderr : '未知错误'}`);
        }
        
        return successResponse({
            success: true,
            message: amend ? '已修改上一次提交' : '已成功提交更改'
        });
    } catch (error) {
        return errorResponse(`提交更改时出错: ${formatError(error)}`);
    }
}

/**
 * 拉取更改
 */
export async function pullChanges(params: { remote?: string, branch?: string }): Promise<Response> {
    try {
        const { remote = 'origin', branch } = params;
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 构建拉取命令
        let pullCommand = 'git pull';
        
        if (remote) {
            pullCommand += ` ${remote}`;
            
            if (branch) {
                pullCommand += ` ${branch}`;
            }
        }
        
        const pullResult = await executeGitCommand(pullCommand);
        
        if (!pullResult || pullResult.exitCode !== 0) {
            return errorResponse(`拉取更改失败: ${pullResult ? pullResult.stderr : '未知错误'}`);
        }
        
        return successResponse({
            success: true,
            message: pullResult.stdout || '已成功拉取更改'
        });
    } catch (error) {
        return errorResponse(`拉取更改时出错: ${formatError(error)}`);
    }
}

/**
 * 切换分支
 */
export async function switchBranch(params: { branch: string }): Promise<Response> {
    try {
        const { branch } = params;
        
        if (!branch) {
            return errorResponse('分支名不能为空');
        }
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 切换分支
        const checkoutCommand = `git checkout ${branch}`;
        const checkoutResult = await executeGitCommand(checkoutCommand);
        
        if (!checkoutResult || checkoutResult.exitCode !== 0) {
            return errorResponse(`切换分支失败: ${checkoutResult ? checkoutResult.stderr : '未知错误'}`);
        }
        
        return successResponse({
            success: true,
            message: `已切换到分支 '${branch}'`
        });
    } catch (error) {
        return errorResponse(`切换分支时出错: ${formatError(error)}`);
    }
}

/**
 * 创建新分支
 */
export async function createBranch(params: { branch: string, startPoint?: string }): Promise<Response> {
    try {
        const { branch, startPoint } = params;
        
        if (!branch) {
            return errorResponse('分支名不能为空');
        }
        
        const repository = await getCurrentRepository();
        if (!repository) {
            return errorResponse('Git仓库未找到');
        }
        
        // 构建创建分支命令
        let createCommand = `git checkout -b ${branch}`;
        
        if (startPoint) {
            createCommand += ` ${startPoint}`;
        }
        
        const createResult = await executeGitCommand(createCommand);
        
        if (!createResult || createResult.exitCode !== 0) {
            return errorResponse(`创建分支失败: ${createResult ? createResult.stderr : '未知错误'}`);
        }
        
        return successResponse({
            success: true,
            message: `已创建并切换到新分支 '${branch}'`
        });
    } catch (error) {
        return errorResponse(`创建分支时出错: ${formatError(error)}`);
    }
}

/**
 * 获取变更状态描述
 * @param status 变更状态字母代码
 * @returns 状态描述
 */
function getChangeStatusDescription(status: string): string {
    switch (status) {
        case 'A': return 'ADDED';
        case 'M': return 'MODIFIED';
        case 'D': return 'DELETED';
        case 'R': return 'RENAMED';
        case 'C': return 'COPIED';
        case 'U': return 'UPDATED';
        default: return status;
    }
}