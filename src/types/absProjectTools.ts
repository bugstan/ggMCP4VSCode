import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AbstractTool } from './absTool';
import { getProjectRoot } from '../utils/pathUtils';

/**
 * Abstract base class for project tools
 * Provides common functionality for project and dependency analysis
 */
export abstract class AbstractProjectTools<T = any> extends AbstractTool<T> {
    /**
     * Get project root directory
     * @returns Project root path or null
     */
    protected getProjectRootPath(): string | null {
        const rootPath = getProjectRoot();
        
        if (!rootPath) {
            this.log.warn('Project root not found');
            return null;
        }
        
        this.log.info(`Project root path: ${rootPath}`);
        return rootPath;
    }

    /**
     * Check if a file exists at the specified path
     * @param rootPath Project root path
     * @param filePath File path relative to root path
     * @returns Whether the file exists
     */
    protected fileExists(rootPath: string, filePath: string): boolean {
        try {
            const fullPath = path.join(rootPath, filePath);
            return fs.existsSync(fullPath);
        } catch (err) {
            this.log.info(`Error checking file existence: ${filePath}`, err);
            return false;
        }
    }

    /**
     * Safely read JSON file
     * @param rootPath Project root path
     * @param filePath File path relative to root path
     * @returns Parsed JSON object or null
     */
    protected readJsonFile<R = any>(rootPath: string, filePath: string): R | null {
        try {
            const fullPath = path.join(rootPath, filePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                return JSON.parse(content) as R;
            }
        } catch (err) {
            this.log.info(`Error reading JSON file: ${filePath}`, err);
        }
        return null;
    }

    /**
     * Safely read text file
     * @param rootPath Project root path
     * @param filePath File path relative to root path
     * @returns File content or null
     */
    protected readTextFile(rootPath: string, filePath: string): string | null {
        try {
            const fullPath = path.join(rootPath, filePath);
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf8');
            }
        } catch (err) {
            this.log.info(`Error reading text file: ${filePath}`, err);
        }
        return null;
    }

    /**
     * Get VSCode extension list (as fallback when no other dependencies are found)
     * @param limit Maximum number of extensions to return
     * @returns Array of extension IDs
     */
    protected getVSCodeExtensions(limit: number = 10): string[] {
        try {
            return vscode.extensions.all
                .filter(ext => !ext.packageJSON.isBuiltin)
                .slice(0, limit)
                .map(ext => ext.id);
        } catch (err) {
            this.log.info('Error getting VS Code extensions', err);
            return [];
        }
    }

    /**
     * Check project type and return results
     * Implements common project type detection logic
     * @param rootPath Project root path
     * @returns Array of detected project types
     */
    protected detectProjectTypes(rootPath: string): string[] {
        const projectTypes: string[] = [];
        
        // Check for Maven project
        if (this.fileExists(rootPath, 'pom.xml')) {
            this.log.info('Maven project detected (pom.xml)');
            projectTypes.push('maven');
        }
        
        // Check for Gradle project
        if (this.fileExists(rootPath, 'build.gradle') || this.fileExists(rootPath, 'build.gradle.kts')) {
            this.log.info('Gradle project detected (build.gradle)');
            projectTypes.push('gradle');
        }
        
        // Check for Node.js project
        if (this.fileExists(rootPath, 'package.json')) {
            this.log.info('Node.js project detected (package.json)');
            projectTypes.push('node');
        }
        
        // Check for Python project
        if (this.fileExists(rootPath, 'Pipfile')) {
            this.log.info('Python project detected (Pipfile)');
            projectTypes.push('python-pipenv');
        } else if (this.fileExists(rootPath, 'requirements.txt')) {
            this.log.info('Python project detected (requirements.txt)');
            projectTypes.push('python-pip');
        }
        
        // Check for .NET project
        if (this.fileExists(rootPath, '.csproj') || this.fileExists(rootPath, '.fsproj') || this.fileExists(rootPath, '.vbproj')) {
            this.log.info('.NET project detected (.csproj/.fsproj/.vbproj)');
            projectTypes.push('dotnet');
        }
        
        // Check for Go project
        if (this.fileExists(rootPath, 'go.mod')) {
            this.log.info('Go project detected (go.mod)');
            projectTypes.push('go');
        }
        
        // Check for Rust project
        if (this.fileExists(rootPath, 'Cargo.toml')) {
            this.log.info('Rust project detected (Cargo.toml)');
            projectTypes.push('rust');
        }
        
        return projectTypes;
    }
}
