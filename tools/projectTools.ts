import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AbstractMcpTool } from '../types/tool';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';

/**
 * 获取项目模块
 */
export class GetProjectModulesTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_project_modules',
            '获取项目中所有模块及其依赖项的列表。返回模块名称的数组。',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const rootPath = getProjectRoot();
            
            if (!rootPath) {
                return errorResponse('Project root not found');
            }
            
            // 模块检测逻辑
            const modules: string[] = [];
            
            // 检查是否是Maven项目
            try {
                const pomPath = path.join(rootPath, 'pom.xml');
                if (fs.existsSync(pomPath)) {
                    modules.push('maven');
                }
            } catch (err) {
                // 忽略错误
            }
            
            // 检查是否是Gradle项目
            try {
                const gradlePath = path.join(rootPath, 'build.gradle');
                const gradleKtsPath = path.join(rootPath, 'build.gradle.kts');
                if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
                    modules.push('gradle');
                }
            } catch (err) {
                // 忽略错误
            }
            
            // 检查是否是Node.js项目
            try {
                const packageJsonPath = path.join(rootPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    modules.push('node');
                    
                    // 读取package.json获取依赖信息
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    if (packageJson.dependencies) {
                        for (const dep in packageJson.dependencies) {
                            modules.push(`node:${dep}`);
                        }
                    }
                }
            } catch (err) {
                // 忽略错误
            }
            
            // 检查是否是Python项目
            try {
                const pipfilePath = path.join(rootPath, 'Pipfile');
                const requirementsPath = path.join(rootPath, 'requirements.txt');
                if (fs.existsSync(pipfilePath)) {
                    modules.push('python-pipenv');
                } else if (fs.existsSync(requirementsPath)) {
                    modules.push('python-pip');
                }
            } catch (err) {
                // 忽略错误
            }
            
            return successResponse(modules);
        } catch (error) {
            return errorResponse(`Error retrieving project modules: ${formatError(error)}`);
        }
    }
}

/**
 * 获取项目依赖
 */
export class GetProjectDependenciesTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_project_dependencies',
            '获取项目中定义的所有依赖项的列表。返回依赖项名称的数组。',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const rootPath = getProjectRoot();
            
            if (!rootPath) {
                return errorResponse('Project root not found');
            }
            
            // 依赖检测逻辑
            const dependencies: string[] = [];
            
            // 检查Node.js依赖
            try {
                const packageJsonPath = path.join(rootPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    
                    // 处理dependencies
                    if (packageJson.dependencies) {
                        for (const dep in packageJson.dependencies) {
                            dependencies.push(`${dep}@${packageJson.dependencies[dep]}`);
                        }
                    }
                    
                    // 处理devDependencies
                    if (packageJson.devDependencies) {
                        for (const dep in packageJson.devDependencies) {
                            dependencies.push(`${dep}@${packageJson.devDependencies[dep]} (dev)`);
                        }
                    }
                }
            } catch (err) {
                // 忽略错误
            }
            
            // 检查Python依赖
            try {
                const requirementsPath = path.join(rootPath, 'requirements.txt');
                if (fs.existsSync(requirementsPath)) {
                    const content = fs.readFileSync(requirementsPath, 'utf8');
                    const lines = content.split('\n');
                    
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#')) {
                            dependencies.push(`py:${trimmed}`);
                        }
                    }
                }
            } catch (err) {
                // 忽略错误
            }
            
            // 如果找不到依赖，尝试使用VS Code扩展依赖视图
            if (dependencies.length === 0) {
                try {
                    // VS Code API没有直接提供获取项目依赖的方法
                    // 可以返回最近安装的VS Code扩展作为依赖示例
                    const extensions = vscode.extensions.all
                        .filter(ext => !ext.packageJSON.isBuiltin)
                        .slice(0, 10)
                        .map(ext => ext.id);
                    
                    if (extensions.length > 0) {
                        extensions.forEach(ext => {
                            dependencies.push(`vscode-ext:${ext}`);
                        });
                    }
                } catch (err) {
                    // 忽略错误
                }
            }
            
            return successResponse(dependencies);
        } catch (error) {
            return errorResponse(`Error retrieving project dependencies: ${formatError(error)}`);
        }
    }
}