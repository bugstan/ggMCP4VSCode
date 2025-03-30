import * as vscode from 'vscode';
import * as fs from 'fs';
import { AbsTools } from '../types/absTools';
import { toAbsolutePath } from '../utils/pathUtils';
import { Response, ToolParams } from '../types';
import { responseHandler } from '../server/responseHandler';

/**
 * Get project modules tool
 * Inherits from AbstractTool base class
 */
export class GetProjectModulesTool extends AbsTools<ToolParams['getProjectModules']> {
    constructor() {
        super(
            'get_project_modules',
            'Get information about project modules and dependencies. Returns an array of module information.',
            {
                type: 'object',
                properties: {},
                required: [],
            }
        );
    }

    /**
     * Execute project module detection (implementing base class abstract method)
     */
    protected async executeCore(_args: ToolParams['getProjectModules']): Promise<Response> {
        try {
            const projectTypes = this.detectProjectTypes();
            return responseHandler.success({
                types: projectTypes,
                extensions: this.getVSCodeExtensions(),
            });
        } catch (err) {
            this.log.error('Error getting project modules', err);
            return responseHandler.failure(err instanceof Error ? err.message : String(err));
        }
    }

    /**
     * Get VSCode extension list (as fallback when no other dependencies are found)
     */
    private getVSCodeExtensions(limit: number = 10): string[] {
        try {
            return vscode.extensions.all
                .filter((ext) => !ext.packageJSON.isBuiltin)
                .slice(0, limit)
                .map((ext) => ext.id);
        } catch (err) {
            this.log.error('Error getting VS Code extensions', err);
            return [];
        }
    }

    /**
     * Check project type and return results
     */
    private detectProjectTypes(): string[] {
        const projectTypes: string[] = [];

        // Check for Maven project
        if (this.fileExists(vscode.Uri.file('pom.xml'))) {
            projectTypes.push('maven');
        }

        // Check for Gradle project
        if (
            this.fileExists(vscode.Uri.file('build.gradle')) ||
            this.fileExists(vscode.Uri.file('build.gradle.kts'))
        ) {
            projectTypes.push('gradle');
        }

        // Check for Node.js project
        if (this.fileExists(vscode.Uri.file('package.json'))) {
            projectTypes.push('node');
        }

        // Check for Python project
        if (this.fileExists(vscode.Uri.file('Pipfile'))) {
            projectTypes.push('python-pipenv');
        } else if (this.fileExists(vscode.Uri.file('requirements.txt'))) {
            projectTypes.push('python-pip');
        }

        // Check for .NET project
        if (
            this.fileExists(vscode.Uri.file('.csproj')) ||
            this.fileExists(vscode.Uri.file('.fsproj')) ||
            this.fileExists(vscode.Uri.file('.vbproj'))
        ) {
            projectTypes.push('dotnet');
        }

        // Check for Go project
        if (this.fileExists(vscode.Uri.file('go.mod'))) {
            projectTypes.push('go');
        }

        // Check for Rust project
        if (this.fileExists(vscode.Uri.file('Cargo.toml'))) {
            projectTypes.push('rust');
        }

        return projectTypes;
    }
}

/**
 * Get project dependencies tool
 * Inherits from AbstractTool base class
 */
export class GetProjectDependenciesTool extends AbsTools<ToolParams['getProjectDependencies']> {
    constructor() {
        super(
            'get_project_dependencies',
            'Get project dependencies from package management files. Returns an array of dependency information.',
            {
                type: 'object',
                properties: {},
                required: [],
            }
        );
    }

    /**
     * Execute dependency detection (implementing base class abstract method)
     */
    protected async executeCore(_args: ToolParams['getProjectDependencies']): Promise<Response> {
        try {
            const dependencies = await this.getDependencies();
            return responseHandler.success(dependencies);
        } catch (err) {
            this.log.error('Error getting project dependencies', err);
            return responseHandler.failure(err instanceof Error ? err.message : String(err));
        }
    }

    /**
     * Get project dependencies
     */
    private async getDependencies(): Promise<any> {
        // Try to read package.json for Node.js projects
        const packageJson = this.readJsonFile<any>('package.json');
        if (packageJson && (packageJson.dependencies || packageJson.devDependencies)) {
            return {
                type: 'node',
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
            };
        }

        // Try to read requirements.txt for Python projects
        const requirementsTxt = this.readTextFile('requirements.txt');
        if (requirementsTxt) {
            const dependencies = requirementsTxt
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'))
                .reduce(
                    (acc, line) => {
                        const [name, version] = line.split('==');
                        if (name) {
                            acc[name] = version || 'latest';
                        }
                        return acc;
                    },
                    {} as Record<string, string>
                );

            return {
                type: 'python',
                dependencies,
            };
        }

        // Fallback to VS Code extensions
        return {
            type: 'vscode',
            extensions: this.getVSCodeExtensions(),
        };
    }

    /**
     * Safely read JSON file using new path processing function
     */
    private readJsonFile<R = any>(filePath: string): R | null {
        try {
            // Use new toAbsolutePath function
            const fullPath = toAbsolutePath(filePath);
            if (!fullPath) return null;
            if (this.fileExists(vscode.Uri.file(fullPath))) {
                const content = fs.readFileSync(fullPath, 'utf8');
                return JSON.parse(content) as R;
            }
        } catch (err) {
            this.log.error(`Error reading JSON file: ${filePath}`, err);
        }
        return null;
    }

    /**
     * Safely read text file using new path processing function
     */
    private readTextFile(filePath: string): string | null {
        try {
            // Use new toAbsolutePath function
            const fullPath = toAbsolutePath(filePath);
            if (!fullPath) return null;
            if (this.fileExists(vscode.Uri.file(fullPath))) {
                return fs.readFileSync(fullPath, 'utf8');
            }
        } catch (err) {
            this.log.error(`Error reading text file: ${filePath}`, err);
        }
        return null;
    }

    /**
     * Get VSCode extension list
     */
    private getVSCodeExtensions(limit: number = 10): string[] {
        try {
            return vscode.extensions.all
                .filter((ext) => !ext.packageJSON.isBuiltin)
                .slice(0, limit)
                .map((ext) => ext.id);
        } catch (err) {
            this.log.error('Error getting VS Code extensions', err);
            return [];
        }
    }
}
