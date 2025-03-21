import * as vscode from 'vscode';
import * as path from 'path';
import { AbstractMcpTool } from '../types/tool';
import { Response, ToolParams } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { normalizePath, toAbsolutePathSafe, toRelativePath } from '../utils/pathUtils';
import { FileReloader } from '../utils/fileReloader';

/**
 * 创建新文件并填充内容
 */
export class CreateNewFileWithTextTool extends AbstractMcpTool<ToolParams['createNewFileWithText']> {
    constructor() {
        super(
            'create_new_file_with_text',
            '在项目目录中指定路径创建新文件并填充内容。如果无法确定项目目录，则返回错误。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    text: { type: 'string' }
                },
                required: ['pathInProject', 'text']
            }
        );
    }

    async handle(args: ToolParams['createNewFileWithText']): Promise<Response> {
        try {
            const { pathInProject, text } = args;

            // 路径规范化和安全检查
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                return errorResponse("can't find project dir");
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

                return successResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                return errorResponse(`Failed to create file: ${formatError(err)}`);
            }
        } catch (error) {
            return errorResponse(`Error creating file: ${formatError(error)}`);
        }
    }
}

/**
 * 根据名称子字符串查找文件
 */
export class FindFilesByNameSubstringTool extends AbstractMcpTool<ToolParams['findFilesByNameSubstring']> {
    constructor() {
        super(
            'find_files_by_name_substring',
            '在项目中搜索文件名包含指定子字符串的所有文件。返回文件信息数组。',
            {
                type: 'object',
                properties: {
                    nameSubstring: { type: 'string' }
                },
                required: ['nameSubstring']
            }
        );
    }

    async handle(args: ToolParams['findFilesByNameSubstring']): Promise<Response> {
        try {
            const { nameSubstring } = args;

            if (!nameSubstring) {
                return errorResponse('Search string cannot be empty');
            }

            // 使用VS Code API搜索文件
            const files = await vscode.workspace.findFiles('**/*' + nameSubstring + '*');

            // 格式化结果
            const results = files.map(file => {
                return {
                    path: toRelativePath(file.fsPath),
                    name: path.basename(file.fsPath)
                };
            });

            return successResponse(results);
        } catch (error) {
            return errorResponse(`Error finding files: ${formatError(error)}`);
        }
    }
}

/**
 * 通过路径获取文件内容
 */
export class GetFileTextByPathTool extends AbstractMcpTool<ToolParams['getFileTextByPath']> {
    constructor() {
        super(
            'get_file_text_by_path',
            '通过相对于项目根目录的路径获取文件的文本内容。如果文件不存在或超出项目范围，则返回错误。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    async handle(args: ToolParams['getFileTextByPath']): Promise<Response> {
        try {
            const { pathInProject } = args;
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                return errorResponse('project dir not found');
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
                return errorResponse('file not found');
            }
        } catch (error) {
            return errorResponse(`Error getting file content: ${formatError(error)}`);
        }
    }
}

/**
 * 通过路径替换文件内容
 */
export class ReplaceFileTextByPathTool extends AbstractMcpTool<ToolParams['replaceFileTextByPath']> {
    constructor() {
        super(
            'replace_file_text_by_path',
            '使用新文本替换指定项目文件的全部内容。如果文件不存在或无法访问，则返回错误。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' },
                    text: { type: 'string' }
                },
                required: ['pathInProject', 'text']
            }
        );
    }

    async handle(args: ToolParams['replaceFileTextByPath']): Promise<Response> {
        try {
            const { pathInProject, text } = args;
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                return errorResponse('project dir not found');
            }

            try {
                // 创建URI
                const fileUri = vscode.Uri.file(absolutePath);

                // 检查文件是否存在
                try {
                    await vscode.workspace.fs.stat(fileUri);
                } catch (err) {
                    return errorResponse('file not found');
                }

                // 写入文件内容
                const encoder = new TextEncoder();
                const bytes = encoder.encode(text);
                await vscode.workspace.fs.writeFile(fileUri, bytes);

                // 使用FileReloader重新加载已打开的文件
                await FileReloader.reloadFile(absolutePath);

                return successResponse({
                    path: absolutePath,
                    relativePath: toRelativePath(absolutePath)
                });
            } catch (err) {
                return errorResponse('could not get document');
            }
        } catch (error) {
            return errorResponse(`Error replacing file content: ${formatError(error)}`);
        }
    }
}

/**
 * 列出文件夹中的文件
 */
export class ListFilesInFolderTool extends AbstractMcpTool<ToolParams['listFilesInFolder']> {
    constructor() {
        super(
            'list_files_in_folder',
            '列出指定项目文件夹中的所有文件和目录。返回条目信息数组。',
            {
                type: 'object',
                properties: {
                    pathInProject: { type: 'string' }
                },
                required: ['pathInProject']
            }
        );
    }

    async handle(args: ToolParams['listFilesInFolder']): Promise<Response> {
        try {
            const { pathInProject } = args;

            // 路径规范化和安全检查
            const normalizedPath = normalizePath(pathInProject);
            const absolutePath = toAbsolutePathSafe(normalizedPath);

            if (!absolutePath) {
                return errorResponse('project dir not found');
            }

            // 创建URI
            const dirUri = vscode.Uri.file(absolutePath);

            try {
                // 检查目录是否存在和是否真的是目录
                try {
                    const stat = await vscode.workspace.fs.stat(dirUri);
                    if (stat.type !== vscode.FileType.Directory) {
                        return errorResponse(`Path is not a directory: ${normalizedPath}`);
                    }
                } catch (err) {
                    return errorResponse(`Directory does not exist or cannot be accessed: ${normalizedPath}`);
                }

                // 读取目录内容
                const entries = await vscode.workspace.fs.readDirectory(dirUri);

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
                        console.log(`Error processing entry: ${name}`, entryErr);
                    }
                }

                // 排序：目录在前，文件在后，同类型按名称排序
                result.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });

                // 特殊处理 list_files_in_folder 的响应，添加换行符
                const jsonWithNewlines = JSON.stringify(result).replace(/},{/g, '},\n{');
                
                // 直接返回带有格式化的JSON字符串，而不是让 successResponse 处理
                return {
                    status: jsonWithNewlines,
                    error: null
                };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                return errorResponse(`Cannot access path: ${normalizedPath} (${errorMessage})`);
            }
        } catch (error) {
            return errorResponse(`Error listing folder contents: ${formatError(error)}`);
        }
    }
}

/**
 * 在文件内容中搜索文本
 */
export class SearchInFilesContentTool extends AbstractMcpTool<ToolParams['searchInFilesContent']> {
    constructor() {
        super(
            'search_in_files_content',
            '在项目的所有文件中搜索指定的文本子字符串。返回包含匹配项的文件信息数组。',
            {
                type: 'object',
                properties: {
                    searchText: { type: 'string' }
                },
                required: ['searchText']
            }
        );
    }

    async handle(args: ToolParams['searchInFilesContent']): Promise<Response> {
        try {
            const { searchText } = args;

            if (!searchText) {
                return errorResponse('Search text cannot be empty');
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
                                path: toRelativePath(file.fsPath)
                            });
                        }
                    } catch (err) {
                        // 忽略单个文件的错误，继续处理其他文件
                        console.error(`Unable to read file ${file.fsPath}: ${err}`);
                    }
                }

                return successResponse(foundFiles);
            } catch (err) {
                return errorResponse(`Error executing search: ${err instanceof Error ? err.message : String(err)}`);
            }
        } catch (error) {
            return errorResponse(`Error searching in file content: ${formatError(error)}`);
        }
    }
}