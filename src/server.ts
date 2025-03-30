/**
 * MCP Server
 *
 * This file exports the server functionality from the server/ directory.
 * The original server code has been refactored into multiple files:
 *
 * - server/index.ts         - Main entry point with the startMCPServer function
 * - server/serverManager.ts - Manages the HTTP server lifecycle
 * - server/mcpService.ts    - HTTP request handling and routing
 * - server/requestHandler.ts - Processing different types of requests
 *
 * This refactoring improves maintainability by separating concerns while
 * keeping all the original functionality intact.
 */

// Re-export everything from the server module
export * from './server/index';
