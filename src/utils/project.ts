/**
 * This file is now deprecated. All functionality has been moved to pathUtils.ts.
 * 
 * Import the following functions from pathUtils.ts instead:
 * - getProjectRoot
 * - getActiveFile
 * - getCurrentDirectory
 * - uuid
 */

import { getProjectRoot, getActiveFile, getCurrentDirectory, uuid } from './pathUtils';

// Re-export for backward compatibility
export { getProjectRoot, getActiveFile, getCurrentDirectory, uuid };
