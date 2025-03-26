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
        const modules = this.detectProjectTypes();

        // Additional processing for Node.js project dependencies
        if (modules.includes('node')) {
            try {
                const packageJson = this.readJsonFile<{
                    dependencies?: Record<string, string>
                }>('package.json');

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
 * Inherits from AbstractProjectTools base class to utilize common project analysis functionality
 */
export class GetProjectDependenciesTool extends AbstractProjectTools {
    constructor() {
        super(
            'get_project_dependencies',
            'Get project dependencies from package.json or other dependency management files.',
            {
                type: 'object',
                properties: {},
                required: []
            }
        );
    }

    /**
     * Execute project dependency analysis operation (implementing base class abstract method)
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        const rootPath = this.getProjectRootPath();
        if (!rootPath) {
            return responseHandler.failure('Project root not found');
        }

        try {
            // Try to read package.json first
            const packageJson = this.readJsonFile<{
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
            }>('package.json');

            if (packageJson) {
                const dependencies = packageJson.dependencies || {};
                const devDependencies = packageJson.devDependencies || {};

                return responseHandler.success({
                    dependencies: Object.keys(dependencies),
                    devDependencies: Object.keys(devDependencies)
                });
            }

            // If no package.json, try other dependency files
            const projectTypes = this.detectProjectTypes();
            if (projectTypes.length === 0) {
                // Fallback to VS Code extensions if no other dependencies found
                const extensions = this.getVSCodeExtensions();
                return responseHandler.success({
                    extensions
                });
            }

            // Try to read package.json for Node.js projects
            if (projectTypes.includes('node')) {
                const nodePackageJson = this.readJsonFile<{
                    dependencies?: Record<string, string>;
                    devDependencies?: Record<string, string>;
                }>('package.json');

                if (nodePackageJson) {
                    return responseHandler.success({
                        dependencies: Object.keys(nodePackageJson.dependencies || {}),
                        devDependencies: Object.keys(nodePackageJson.devDependencies || {})
                    });
                }
            }

            // For other project types, return project type info
            return responseHandler.success({
                projectTypes
            });
        } catch (err) {
            this.log.error('Error getting project dependencies', err);
            return responseHandler.failure(`Error getting project dependencies: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

/**
 * Get project type tool
 * Inherits from AbstractProjectTools base class to utilize common project analysis functionality
 */
export class GetProjectTypeTool extends AbstractProjectTools {
    constructor() {
        super(
            'get_project_type',
            'Detect project type based on presence of specific files (package.json, pom.xml, etc.).',
            {
                type: 'object',
                properties: {},
                required: []
            }
        );
    }

    /**
     * Execute project type detection operation (implementing base class abstract method)
     */
    protected async executeCore(_args: Record<string, never>): Promise<Response> {
        const rootPath = this.getProjectRootPath();
        if (!rootPath) {
            return responseHandler.failure('Project root not found');
        }

        try {
            const projectTypes = this.detectProjectTypes();
            return responseHandler.success({
                projectTypes
            });
        } catch (err) {
            this.log.error('Error detecting project type', err);
            return responseHandler.failure(`Error detecting project type: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
