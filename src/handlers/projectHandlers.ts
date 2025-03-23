import * as path from 'path';
import * as fs from 'fs';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/project';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('ProjectHandlers');

/**
 * Get project modules
 */
export async function getProjectModules(): Promise<Response> {
    try {
        log.debug('Getting project modules');
        
        // In VSCode, this operation is usually specific to the project type
        // Here we provide a simple implementation which can be extended based on project type
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            log.warn('Project directory not found');
            return createResponse(null, 'project dir not found');
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
            
            log.info(`Found ${modules.length} project modules`);
            return createResponse(JSON.stringify(modules));
        } catch (err) {
            // Might not be a Node.js project, return empty array
            log.info('No Node.js package.json found, returning empty modules list');
            return createResponse(JSON.stringify([]));
        }
    } catch (error) {
        log.error('Error getting project modules', error);
        return createResponse(null, `Error getting project modules: ${formatError(error)}`);
    }
}

/**
 * Get project dependencies
 */
export async function getProjectDependencies(): Promise<Response> {
    try {
        log.debug('Getting project dependencies');
        
        const projectRoot = getProjectRoot();
        
        if (!projectRoot) {
            log.warn('Project directory not found');
            return createResponse(null, 'project dir not found');
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
            
            log.info(`Found ${result.length} project dependencies`);
            return createResponse(JSON.stringify(result));
        } catch (err) {
            // Might not be a Node.js project, return empty array
            log.info('No Node.js package.json found, returning empty dependencies list');
            return createResponse(JSON.stringify([]));
        }
    } catch (error) {
        log.error('Error getting project dependencies', error);
        return createResponse(null, `Error getting project dependencies: ${formatError(error)}`);
    }
}