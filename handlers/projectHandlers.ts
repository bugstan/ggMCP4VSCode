import * as path from 'path';
import * as fs from 'fs';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';

/**
 * 获取项目模块
 */
export async function getProjectModules(): Promise<Response> {
    try {
        // 在VSCode中，这个操作通常是特定于项目类型的
        // 这里我们提供一个简单的实现，可以根据项目类型扩展
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // 检查是否是Node.js项目
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            
            // 提取依赖作为"模块"
            const dependencies = packageJson.dependencies || {};
            const devDependencies = packageJson.devDependencies || {};
            
            const modules = Object.keys(dependencies)
                .concat(Object.keys(devDependencies));
            
            return successResponse(JSON.stringify(modules));
        } catch (err) {
            // 可能不是Node.js项目，返回空数组
            return successResponse(JSON.stringify([]));
        }
    } catch (error) {
        return errorResponse(`获取项目模块时出错: ${formatError(error)}`);
    }
}

/**
 * 获取项目依赖
 */
export async function getProjectDependencies(): Promise<Response> {
    try {
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // 检查是否是Node.js项目
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            
            // 提取依赖
            const dependencies = packageJson.dependencies || {};
            const devDependencies = packageJson.devDependencies || {};
            
            const allDependencies = {
                ...dependencies,
                ...devDependencies
            };
            
            const result = Object.entries(allDependencies).map(([name, version]: [string, any]) => ({
                name,
                version
            }));
            
            return successResponse(JSON.stringify(result));
        } catch (err) {
            // 可能不是Node.js项目，返回空数组
            return successResponse(JSON.stringify([]));
        }
    } catch (error) {
        return errorResponse(`获取项目依赖时出错: ${formatError(error)}`);
    }
}