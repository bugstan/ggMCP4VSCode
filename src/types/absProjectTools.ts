import * as vscode from 'vscode';
import * as fs from 'fs';
import { AbstractTool } from './absTool';
import { getProjectRoot, toAbsolutePathSafe } from '../utils/pathUtils';
import { Response } from './index';
import { responseHandler } from '../server/responseHandler';

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
     * @param filePath File path relative to root path
     * @returns Whether the file exists
     */
    protected fileExists(filePath: string): boolean {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) return false;
            return fs.existsSync(fullPath);
        } catch (err) {
            this.log.info(`Error checking file existence: ${filePath}`, err);
            return false;
        }
    }

    /**
     * Safely read JSON file
     * @param filePath File path relative to root path
     * @returns Parsed JSON object or null
     */
    protected readJsonFile<R = any>(filePath: string): R | null {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) return null;
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
     * @param filePath File path relative to root path
     * @returns File content or null
     */
    protected readTextFile(filePath: string): string | null {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) return null;
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
     * @returns Array of detected project types
     */
    protected detectProjectTypes(): string[] {
        const projectTypes: string[] = [];

        // Check for Maven project
        if (this.fileExists('pom.xml')) {
            this.log.info('Maven project detected (pom.xml)');
            projectTypes.push('maven');
        }

        // Check for Gradle project
        if (this.fileExists('build.gradle') || this.fileExists('build.gradle.kts')) {
            this.log.info('Gradle project detected (build.gradle)');
            projectTypes.push('gradle');
        }

        // Check for Node.js project
        if (this.fileExists('package.json')) {
            this.log.info('Node.js project detected (package.json)');
            projectTypes.push('node');
        }

        // Check for Python project
        if (this.fileExists('Pipfile')) {
            this.log.info('Python project detected (Pipfile)');
            projectTypes.push('python-pipenv');
        } else if (this.fileExists('requirements.txt')) {
            this.log.info('Python project detected (requirements.txt)');
            projectTypes.push('python-pip');
        }

        // Check for .NET project
        if (this.fileExists('.csproj') || this.fileExists('.fsproj') || this.fileExists('.vbproj')) {
            this.log.info('.NET project detected (.csproj/.fsproj/.vbproj)');
            projectTypes.push('dotnet');
        }

        // Check for Go project
        if (this.fileExists('go.mod')) {
            this.log.info('Go project detected (go.mod)');
            projectTypes.push('go');
        }

        // Check for Rust project
        if (this.fileExists('Cargo.toml')) {
            this.log.info('Rust project detected (Cargo.toml)');
            projectTypes.push('rust');
        }

        return projectTypes;
    }

    protected async executeProjectOperation(filePath: string): Promise<Response> {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) {
                return responseHandler.failure('Invalid file path');
            }

            if (!fs.existsSync(fullPath)) {
                return responseHandler.failure('File does not exist');
            }

            return responseHandler.success({});
        } catch (e) {
            return responseHandler.failure(`Project operation error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    protected async readProjectFile(filePath: string): Promise<Response> {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) {
                return responseHandler.failure('Invalid file path');
            }

            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                return responseHandler.success(content);
            }

            return responseHandler.failure('File does not exist');
        } catch (e) {
            return responseHandler.failure(`File read error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    protected async writeProjectFile(filePath: string, content: string): Promise<Response> {
        try {
            const fullPath = toAbsolutePathSafe(filePath);
            if (!fullPath) {
                return responseHandler.failure('Invalid file path');
            }

            if (fs.existsSync(fullPath)) {
                fs.writeFileSync(fullPath, content, 'utf8');
                return responseHandler.success({});
            }

            return responseHandler.failure('File does not exist');
        } catch (e) {
            return responseHandler.failure(`File write error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
}
