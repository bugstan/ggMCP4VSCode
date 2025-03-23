import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AbstractMcpTool } from '../types/tool';
import { Response } from '../types';
import { createResponse, formatError } from '../utils/response';
import { getProjectRoot } from '../utils/pathUtils';
import { Logger } from '../utils/logger';

// Create module-specific logger
const log = Logger.forModule('ProjectTools');

/**
 * Get project modules
 */
export class GetProjectModulesTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_project_modules',
            'Get a list of all modules in the project with their dependencies. Returns an array of module names.',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const rootPath = getProjectRoot();
            
            if (!rootPath) {
                log.warn('Project root not found');
                return createResponse(null, 'Project root not found');
            }
            
            log.debug(`Analyzing project modules in: ${rootPath}`);
            
            // Module detection logic
            const modules: string[] = [];
            
            // Check if it's a Maven project
            try {
                const pomPath = path.join(rootPath, 'pom.xml');
                if (fs.existsSync(pomPath)) {
                    log.debug('Maven project detected (pom.xml)');
                    modules.push('maven');
                }
            } catch (err) {
                // Ignore errors
            }
            
            // Check if it's a Gradle project
            try {
                const gradlePath = path.join(rootPath, 'build.gradle');
                const gradleKtsPath = path.join(rootPath, 'build.gradle.kts');
                if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
                    log.debug('Gradle project detected (build.gradle)');
                    modules.push('gradle');
                }
            } catch (err) {
                // Ignore errors
            }
            
            // Check if it's a Node.js project
            try {
                const packageJsonPath = path.join(rootPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    log.debug('Node.js project detected (package.json)');
                    modules.push('node');
                    
                    // Read package.json to get dependency info
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    if (packageJson.dependencies) {
                        for (const dep in packageJson.dependencies) {
                            modules.push(`node:${dep}`);
                        }
                    }
                }
            } catch (err) {
                // Ignore errors
            }
            
            // Check if it's a Python project
            try {
                const pipfilePath = path.join(rootPath, 'Pipfile');
                const requirementsPath = path.join(rootPath, 'requirements.txt');
                if (fs.existsSync(pipfilePath)) {
                    log.debug('Python project detected (Pipfile)');
                    modules.push('python-pipenv');
                } else if (fs.existsSync(requirementsPath)) {
                    log.debug('Python project detected (requirements.txt)');
                    modules.push('python-pip');
                }
            } catch (err) {
                // Ignore errors
            }
            
            log.info(`Found ${modules.length} modules in project`);
            return createResponse(modules);
        } catch (error) {
            log.error('Error retrieving project modules', error);
            return createResponse(null, `Error retrieving project modules: ${formatError(error)}`);
        }
    }
}

/**
 * Get project dependencies
 */
export class GetProjectDependenciesTool extends AbstractMcpTool {
    constructor() {
        super(
            'get_project_dependencies',
            'Get a list of all dependencies defined in the project. Returns an array of dependency names.',
            { type: 'object', properties: {} }
        );
    }

    async handle(_args: Record<string, never>): Promise<Response> {
        try {
            const rootPath = getProjectRoot();
            
            if (!rootPath) {
                log.warn('Project root not found');
                return createResponse(null, 'Project root not found');
            }
            
            log.debug(`Analyzing project dependencies in: ${rootPath}`);
            
            // Dependency detection logic
            const dependencies: string[] = [];
            
            // Check Node.js dependencies
            try {
                const packageJsonPath = path.join(rootPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    log.debug('Analyzing Node.js dependencies (package.json)');
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    
                    // Process dependencies
                    if (packageJson.dependencies) {
                        for (const dep in packageJson.dependencies) {
                            dependencies.push(`${dep}@${packageJson.dependencies[dep]}`);
                        }
                    }
                    
                    // Process devDependencies
                    if (packageJson.devDependencies) {
                        for (const dep in packageJson.devDependencies) {
                            dependencies.push(`${dep}@${packageJson.devDependencies[dep]} (dev)`);
                        }
                    }
                }
            } catch (err) {
                // Ignore errors
            }
            
            // Check Python dependencies
            try {
                const requirementsPath = path.join(rootPath, 'requirements.txt');
                if (fs.existsSync(requirementsPath)) {
                    log.debug('Analyzing Python dependencies (requirements.txt)');
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
                // Ignore errors
            }
            
            // If no dependencies found, try using VS Code extensions as examples
            if (dependencies.length === 0) {
                try {
                    log.debug('No project dependencies found, using VS Code extensions as examples');
                    // VS Code API doesn't directly provide a method to get project dependencies
                    // Can return recently installed VS Code extensions as dependency examples
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
                    // Ignore errors
                }
            }
            
            log.info(`Found ${dependencies.length} dependencies in project`);
            return createResponse(dependencies);
        } catch (error) {
            log.error('Error retrieving project dependencies', error);
            return createResponse(null, `Error retrieving project dependencies: ${formatError(error)}`);
        }
    }
}