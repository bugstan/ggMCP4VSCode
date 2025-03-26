import {Response} from '../types';
import {responseHandler} from '../server/responseHandler';
import {AbstractProjectTools} from '../types/absProjectTools';

/**
 * Get project modules tool
 * Supports detection of multiple project types and dependencies
 */
export class GetProjectModulesTool extends AbstractProjectTools<Record<string, never>> {
    constructor() {
        super(
            'get_project_modules',
            'Get a list of all modules and their dependencies in the project. Returns an array of module names.',
            {type: 'object', properties: {}}
        );
    }

    /**
     * Execute tool core logic
     * @param _args Empty parameter object
     * @returns Response object
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        const rootPath = this.getProjectRootPath();

        if (!rootPath) {
            return responseHandler.failure('Project root directory not found');
        }

        this.log.info(`Analyzing project modules at path: ${rootPath}`);

        // Use base class method to detect project types
        const modules = this.detectProjectTypes(rootPath);

        // Additional processing for Node.js project dependencies
        if (modules.includes('node')) {
            try {
                const packageJson = this.readJsonFile<{
                    dependencies?: Record<string, string>
                }>(rootPath, 'package.json');

                if (packageJson?.dependencies) {
                    for (const dep in packageJson.dependencies) {
                        modules.push(`node:${dep}`);
                    }
                }
            } catch (err) {
                // Ignore error
                this.log.info('Error reading package.json dependencies', err);
            }
        }

        this.log.info(`Found ${modules.length} modules in project`);
        return responseHandler.success(modules);
    }
}

/**
 * Get project dependencies tool
 * Supports dependency detection for multiple project types
 */
export class GetProjectDependenciesTool extends AbstractProjectTools<Record<string, never>> {
    constructor() {
        super(
            'get_project_dependencies',
            'Get a list of all dependencies defined in the project. Returns an array of dependency names.',
            {type: 'object', properties: {}}
        );
    }

    /**
     * Execute tool core logic
     * @param _args Empty parameter object
     * @returns Response object
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        const rootPath = this.getProjectRootPath();

        if (!rootPath) {
            return responseHandler.failure('Project root directory not found');
        }

        this.log.info(`Analyzing project dependencies at path: ${rootPath}`);

        // Dependency detection logic
        const dependencies: string[] = [];

        // Check Node.js dependencies
        try {
            const packageJson = this.readJsonFile<{
                dependencies?: Record<string, string>,
                devDependencies?: Record<string, string>
            }>(rootPath, 'package.json');

            if (packageJson) {
                // Process regular dependencies
                if (packageJson.dependencies) {
                    for (const dep in packageJson.dependencies) {
                        dependencies.push(`${dep}@${packageJson.dependencies[dep]}`);
                    }
                }

                // Process development dependencies
                if (packageJson.devDependencies) {
                    for (const dep in packageJson.devDependencies) {
                        dependencies.push(`${dep}@${packageJson.devDependencies[dep]} (dev)`);
                    }
                }
            }
        } catch (err) {
            // Ignore error
            this.log.info('Error reading Node.js dependencies', err);
        }

        // Check Python dependencies
        try {
            const content = this.readTextFile(rootPath, 'requirements.txt');
            if (content) {
                const lines = content.split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        dependencies.push(`py:${trimmed}`);
                    }
                }
            }
        } catch (err) {
            // Ignore error
            this.log.info('Error reading Python dependencies', err);
        }

        // If no dependencies found, use VS Code extensions as examples
        if (dependencies.length === 0) {
            try {
                this.log.info('No project dependencies found, using VS Code extensions as examples');
                const extensions = this.getVSCodeExtensions(10);

                if (extensions.length > 0) {
                    extensions.forEach(ext => {
                        dependencies.push(`vscode-ext:${ext}`);
                    });
                }
            } catch (err) {
                // Ignore error
                this.log.info('Error getting VS Code extensions as dependency examples', err);
            }
        }

        this.log.info(`Found ${dependencies.length} dependencies in project`);
        return responseHandler.success(dependencies);
    }
}