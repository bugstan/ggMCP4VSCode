import * as path from 'path';
import * as fs from 'fs';
import { Response } from '../types';
import { successResponse, errorResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';

/**
 * Get project modules
 */
export async function getProjectModules(): Promise<Response> {
    try {
        // In VSCode, this operation is usually specific to the project type
        // Here we provide a simple implementation which can be extended based on project type
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // Check if it's a Node.js project
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            
            // Extract dependencies as "modules"
            const dependencies = packageJson.dependencies || {};
            const devDependencies = packageJson.devDependencies || {};
            
            const modules = Object.keys(dependencies)
                .concat(Object.keys(devDependencies));
            
            return successResponse(JSON.stringify(modules));
        } catch (err) {
            // Might not be a Node.js project, return empty array
            return successResponse(JSON.stringify([]));
        }
    } catch (error) {
        return errorResponse(`Error getting project modules: ${formatError(error)}`);
    }
}

/**
 * Get project dependencies
 */
export async function getProjectDependencies(): Promise<Response> {
    try {
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            return errorResponse('project dir not found');
        }
        
        // Check if it's a Node.js project
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            
            // Extract dependencies
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
            // Might not be a Node.js project, return empty array
            return successResponse(JSON.stringify([]));
        }
    } catch (error) {
        return errorResponse(`Error getting project dependencies: ${formatError(error)}`);
    }
}