/**
 * ggMCP4VSCode Base Class Index
 * Unified export of all tool base classes for easy importing
 */

// Export basic interfaces
export { JsonSchemaObject, McpTool, NoArgs } from './toolInterfaces';

// Export base abstract classes
export { AbstractTool } from './absTool';

// Export specialized tool base classes
export { AbstractFileTools } from './absFileTools';
export { AbstractEditorTools } from './absEditorTools';
export { AbstractTerminalTools } from './absTerminalTools';
export { AbstractCodeTools } from './absCodeTools';
export { AbstractDebugTools } from './absDebugTools';
export { AbstractGitTools } from './absGitTools';
export { AbstractProjectTools } from './absProjectTools';
