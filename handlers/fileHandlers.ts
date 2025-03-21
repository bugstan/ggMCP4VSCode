import * as vscode from 'vscode';
import * as path from 'path';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { normalizePath, toAbsolutePathSafe, toRelativePath } from '../utils/pathUtils';
import { FileReloader } from '../utils/fileReloader';
import { getCurrentDirectory } from '../utils/project';

/**
 * 创建新文件并填充内容
 */
export async function createNewFileWithText(params: { pathInProject: string, text: string }): Promise<Response> {
    try {
        const {pathInProject, text} = params;

        // 路径规范化和安全检查
        const normalizedPath = normalizePath(pathInProject);
        const absolutePath = toAbsolutePathSafe(normalizedPath);

        if (!absolutePath) {
            return errorResponse('无法确定文件路径');
        }

        // 创建URI
        const fileUri = vscode.Uri.file(absolutePath);
        const dirUri = vscode.Uri.file(path.dirname(absolutePath));

        try {
            // 确保目录存在
            await vscode.workspace.fs.createDirectory(dirUri);

            // 写入文件内容
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            await vscode.workspace.fs.writeFile(fileUri, bytes);

            // 打开新创建的文件
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);

            return successResponse({
                path: absolutePath,
                relativePath: toRelativePath(absolutePath)
            });
        } catch (err) {
            return errorResponse(`创建文件操作失败: ${formatError(err)}`);
        }
    } catch (error) {
        return errorResponse(`创建文件时出错: ${formatError(error)}`);
    }
}

/**
 * 根据名称子字符串查找文件
 */
export async function findFilesByNameSubstring(params: { nameSubstring: string }): Promise<Response> {
    try {
        const {nameSubstring} = params;

        if (!nameSubstring) {
            return errorResponse('搜索字符串不能为空');
        }

        // 获取当前工作目录
        const currentDir = getCurrentDirectory();
        if (!currentDir) {
            return errorResponse('无法确定搜索范围');
        }

        // 使用VS Code API搜索文件
        const files = await vscode.workspace.findFiles('**/*' + nameSubstring + '*');

        // 格式化结果
        const results = files.map(file => {
            const relativePath = toRelativePath(file.fsPath);
            return {
                path: file.fsPath,
                relativePath: relativePath,
                name: path.basename(file.fsPath)
            };
        });

        return successResponse({
            results: results,
            currentDirectory: currentDir
        });
    } catch (error) {
        return errorResponse(`查找文件时出错: ${formatError(error)}`);
    }
}

/**
 * 通过路径获取文件内容
 */
export async function getFileTextByPath(params: { pathInProject: string }): Promise<Response> {
    try {
        const {pathInProject} = params;
        const normalizedPath = normalizePath(pathInProject);
        const absolutePath = toAbsolutePathSafe(normalizedPath);

        if (!absolutePath) {
            return errorResponse('无法确定文件路径');
        }

        try {
            // 创建URI并读取文件内容
            const fileUri = vscode.Uri.file(absolutePath);
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = new TextDecoder().decode(content);

            return successResponse({
                content: text,
                path: absolutePath,
                relativePath: toRelativePath(absolutePath)
            });
        } catch (err) {
            return errorResponse('文件不存在或无法访问');
        }
    } catch (error) {
        return errorResponse(`获取文件内容时出错: ${formatError(error)}`);
    }
}

/**
 * 通过路径替换文件内容
 */
export async function replaceFileTextByPath(params: { pathInProject: string, text: string }): Promise<Response> {
    try {
        const {pathInProject, text} = params;
        const normalizedPath = normalizePath(pathInProject);
        const absolutePath = toAbsolutePathSafe(normalizedPath);

        if (!absolutePath) {
            return errorResponse('无法确定文件路径');
        }

        // 创建URI
        const fileUri = vscode.Uri.file(absolutePath);

        // 检查文件是否存在
        try {
            await vscode.workspace.fs.stat(fileUri);
        } catch (err) {
            return errorResponse('文件不存在或无法访问');
        }

        // 检查文件是否已在编辑器中打开并有未保存的更改
        if (FileReloader.hasUnsavedChanges(absolutePath)) {
            return errorResponse('文件有未保存的更改，请先保存或放弃更改后再尝试修改');
        }

        try {
            // 写入文件内容
            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);
            await vscode.workspace.fs.writeFile(fileUri, bytes);

            // 重新加载已打开的文件
            await FileReloader.reloadFile(absolutePath);

            return successResponse({
                path: absolutePath,
                relativePath: toRelativePath(absolutePath),
                status: '文件已更新并重新加载'
            });
        } catch (err) {
            return errorResponse(`无法修改文件内容: ${formatError(err)}`);
        }
    } catch (error) {
        return errorResponse(`替换文件内容时出错: ${formatError(error)}`);
    }
}

/**
 * 列出文件夹中的文件
 */
export async function listFilesInFolder(params: { pathInProject: string }): Promise<Response> {
    console.log(`[listFilesInFolder] 开始处理目录请求: ${params.pathInProject}`);

    try {
        const {pathInProject} = params;

        // 路径规范化和安全检查
        const normalizedPath = normalizePath(pathInProject);
        console.log(`[listFilesInFolder] 规范化路径: ${normalizedPath}`);

        // 获取绝对路径
        const absolutePath = toAbsolutePathSafe(normalizedPath);
        console.log(`[listFilesInFolder] 绝对路径: ${absolutePath}`);

        if (!absolutePath) {
            console.log(`[listFilesInFolder] 无法确定目录路径`);
            return errorResponse('无法确定目录路径');
        }

        // 创建URI
        const dirUri = vscode.Uri.file(absolutePath);

        try {
            // 检查目录是否存在和是否真的是目录
            try {
                const stat = await vscode.workspace.fs.stat(dirUri);
                if (stat.type !== vscode.FileType.Directory) {
                    console.log(`[listFilesInFolder] 路径不是目录: ${absolutePath}`);
                    return errorResponse(`路径不是目录: ${normalizedPath}`);
                }
            } catch (err) {
                console.log(`[listFilesInFolder] 目录不存在或无法访问: ${absolutePath}`, err);
                return errorResponse(`目录不存在或无法访问: ${normalizedPath}`);
            }

            // 读取目录内容
            console.log(`[listFilesInFolder] 读取目录内容: ${absolutePath}`);
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            console.log(`[listFilesInFolder] 目录内容读取成功，共 ${entries.length} 项`);

            // 格式化结果
            const result = [];

            for (const [name, fileType] of entries) {
                try {
                    // 计算每个条目的绝对路径
                    const entryAbsPath = path.join(absolutePath, name);

                    // 转换为相对路径并统一分隔符
                    const entryRelPath = toRelativePath(entryAbsPath) || '';

                    result.push({
                        name: name,
                        type: fileType === vscode.FileType.Directory ? 'directory' : 'file',
                        path: entryRelPath
                    });
                } catch (entryErr) {
                    // 跳过无法处理的条目
                    console.log(`[listFilesInFolder] 处理条目时出错: ${name}`, entryErr);
                }
            }

            // 排序：目录在前，文件在后，同类型按名称排序
            result.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            console.log(`[listFilesInFolder] 成功处理目录，准备返回 ${result.length} 个条目`);

            return successResponse(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.log(`[listFilesInFolder] 读取目录内容失败:`, err);
            return errorResponse(`无法访问路径: ${normalizedPath} (${errorMessage})`);
        }
    } catch (error) {
        console.log(`[listFilesInFolder] 处理过程中发生未预期的错误:`, error);
        return errorResponse(`列出文件夹内容时出错: ${formatError(error)}`);
    }
}

/**
 * 在文件内容中搜索文本
 */
export async function searchInFilesContent(params: { searchText: string }): Promise<Response> {
    try {
        const {searchText} = params;

        if (!searchText) {
            return errorResponse('搜索文本不能为空');
        }

        // 获取当前工作目录
        const currentDir = getCurrentDirectory();
        if (!currentDir) {
            return errorResponse('无法确定搜索范围');
        }

        // 创建搜索结果存储
        const foundFiles = [];

        try {
            // 使用 vscode.workspace.findFiles 实现基本的文本搜索功能
            const files = await vscode.workspace.findFiles('**/*');

            // 对找到的文件进行文本内容搜索
            for (const file of files) {
                try {
                    // 读取文件内容
                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();

                    // 检查是否包含搜索文本
                    if (text.includes(searchText)) {
                        foundFiles.push({
                            path: toRelativePath(file.fsPath),
                            name: path.basename(file.fsPath)
                        });
                    }
                } catch (err) {
                    // 忽略单个文件的错误，继续处理其他文件
                    console.error(`无法读取文件 ${file.fsPath}: ${err}`);
                }
            }

            return successResponse({
                results: foundFiles,
                searchDirectory: currentDir
            });
        } catch (err) {
            return errorResponse(`执行搜索时出错: ${err instanceof Error ? err.message : String(err)}`);
        }
    } catch (error) {
        return errorResponse(`搜索文件内容时出错: ${formatError(error)}`);
    }
}