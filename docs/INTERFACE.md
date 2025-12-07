# VSCode MCP Server Plugin Interface Documentation

[![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)](https://github.com/n2ns/ggMCP4VSCode)

## Introduction

The VSCode MCP Server Plugin is an extension for Visual Studio Code that provides Model Context Protocol (MCP) support. It allows MCP clients (such as AI assistants) to communicate with VSCode through HTTP protocol, executing various VSCode operations like file reading/writing, code editing, debugging control, etc.

## Communication Architecture

```
 +---------------------+       +---------------+
 |                     |       |               |
 | MCP Client          | <---> | VSCode Plugin |
 | (e.g. AI Assistant) |       | (MCP Server)  |
 |                     |       |               |
 +---------------------+       +---------------+
                        HTTP Protocol
                       (Port Communication)
```

### Communication Method

- **Protocol**: HTTP
- **Connection Type**: Short connection, request-response model
- **Endpoint Format**: `http://${HOST}:${PORT}/mcp/*` (Standard MCP format)
- **Port Range**: Default 9960-9990 (Configurable in VSCode settings)

## Interface Definition

### 1. Initialize Connection

- **URL**: `http://${HOST}:${PORT}/mcp/initialize`
- **Method**: GET/POST
- **Function**: Get VSCode server information and environment details
- **Response Format**: JSON object (JSON-RPC 2.0 format)
  ```json
  {
    "jsonrpc": "2.0",
    "id": 0,
    "result": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "tools": {
          "listChanged": true
        },
        "resources": {}
      },
      "serverInfo": {
        "name": "vscode-mcp-server",
        "version": "1.0.0"
      },
      "environment": {
        "workspaceRoot": "Project root directory path",
        "activeFile": "Current active file path",
        "currentDirectory": "Current directory path"
      }
    }
  }
  ```

### 2. Get Server Status

- **URL**: `http://${HOST}:${PORT}/mcp/status`
- **Method**: GET/POST
- **Function**: Get MCP server running status and environment information
- **Response Format**: JSON object (JSON-RPC 2.0 format)
  ```json
  {
    "jsonrpc": "2.0",
    "id": 0,
    "result": {
      "status": "running",
      "environment": {
        "workspaceRoot": "Project root directory path",
        "activeFile": "Current active file path",
        "currentDirectory": "Current directory path",
        "openFiles": ["File path 1", "File path 2"]
      }
    }
  }
  ```

### 3. Get Tools List

- **URL**: `http://${HOST}:${PORT}/mcp/list_tools`
- **Method**: GET
- **Function**: Get a list of all tools supported by the VSCode plugin
- **Response Format**: JSON array, directly returns an array of tool definition objects
  ```json
  [
    {
      "name": "tool_name",
      "description": "tool_description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": { "type": "string" },
          "param2": { "type": "number" }
        },
        "required": ["param1"]
      }
    }
  ]
  ```

### 4. Tool Invocation

- **URL**: `http://${HOST}:${PORT}/mcp/${toolName}`
- **Method**: POST
- **Request Headers**:
  ```
  Content-Type: application/json
  ```
- **Request Body**: JSON object, can be one of two formats:

  1. Direct parameter format:
  ```json
  {
    "param1": "value1",
    "param2": 123
  }
  ```

  2. JSON-RPC 2.0 format:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "params": {
      "arguments": {
        "param1": "value1",
        "param2": 123
      }
    }
  }
  ```

- **Function**: Execute a specific VSCode tool invocation
- **Response Format**: MCP standard format
  ```json
  {
    "status": "Operation result",
    "error": null
  }
  ```

  Error response:
  ```json
  {
    "status": null,
    "error": "Error message"
  }
  ```

## MCP Protocol Compatibility Notes

VSCode MCP Server Plugin adopts standard MCP protocol:

1. **Interface Path**: Uses standard MCP path format `/mcp/*`

2. **Response Format**: Uses standard MCP response format
   - Success response: `{"status": "Result content", "error": null}`
   - Error response: `{"status": null, "error": "Error message"}`

3. **Tool Description**: Provides standard tool description format

4. **Port Range**: Uses VSCode-specific port range (9960-9990)

## Available VSCode Tools

The plugin provides **44 tools** for operating the VSCode environment, organized by category:

### Editor Tools (5 tools)

#### 1. get_open_in_editor_file_text

- **Description**: Retrieve the complete text content of the file currently open in the editor.
- **Parameters**: None
- **Returns**: String containing the file content, or empty string if no file is open.
- **Example Response**:
  ```json
  {
    "status": "console.log('Hello World');\n",
    "error": null
  }
  ```

#### 2. get_open_in_editor_file_path

- **Description**: Get the absolute path of the file currently open in the editor.
- **Parameters**: None
- **Returns**: String containing the file path, or empty string if no file is open.
- **Example Response**:
  ```json
  {
    "status": "C:\\Projects\\MyProject\\src\\index.js",
    "error": null
  }
  ```

#### 3. replace_selected_text

- **Description**: Replace the text currently selected in the editor.
- **Parameters**:
  - `text` (string, required): The new text to replace the selection with.
- **Returns**: `"ok"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "text": "console.log('New Text');"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

#### 4. replace_current_file_text

- **Description**: Replace the entire content of the file currently open in the editor.
- **Parameters**:
  - `text` (string, required): The new content for the file.
- **Returns**: `"ok"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "text": "// New file content\nconsole.log('Replaced Content');"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

#### 5. open_file_in_editor

- **Description**: Open the specified file in the editor.
- **Parameters**:
  - `pathInProject` (string, required): The path of the file to open, can be absolute or relative to the project root.
- **Returns**: `"file is opened"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/index.js"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "file is opened",
    "error": null
  }
  ```

### File Read/Write Tools (8 tools)

#### 6. get_file_text_by_path

- **Description**: Get the text content of a file using its path relative to the project root.
- **Parameters**:
  - `pathInProject` (string, required): The path to the file, relative to project root.
- **Returns**: JSON object containing the file content, path information.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "content": "function helper() { return 'Hello'; }",
      "path": "C:\\Projects\\MyProject\\src\\utils\\helper.js",
      "relativePath": "src\\utils\\helper.js"
    },
    "error": null
  }
  ```

#### 7. rewrite_file_content

- **Description**: Rewrite the entire content of a specified project file with new text.
- **Parameters**:
  - `pathInProject` (string, required): The path to the target file, relative to project root.
  - `text` (string, required): The new content to write to the file.
- **Returns**: JSON object with file information and operation details.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "text": "function helper() { return 'Updated'; }"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "path": "C:\\Projects\\MyProject\\src\\utils\\helper.js",
      "relativePath": "src\\utils\\helper.js",
      "size": 35,
      "operationTimeMs": 42
    },
    "error": null
  }
  ```

#### 8. create_new_file_with_text

- **Description**: Create a new file at the specified path in the project directory and populate it with content.
- **Parameters**:
  - `pathInProject` (string, required): The relative path where the file should be created.
  - `text` (string, required): The content to write into the new file.
- **Returns**: JSON object with file information and operation details.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/newFile.js",
    "text": "// New file content\nfunction newFunc() { return true; }"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "path": "C:\\Projects\\MyProject\\src\\utils\\newFile.js",
      "relativePath": "src\\utils\\newFile.js",
      "operationTimeMs": 38
    },
    "error": null
  }
  ```

#### 9. list_files_in_folder

- **Description**: List all files and directories in the specified project folder.
- **Parameters**:
  - `pathInProject` (string, required): The path to the folder to list, relative to project root (use `"/"` for root).
- **Returns**: JSON array of file entries with type and path information.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": [
      {
        "name": "helper.js",
        "type": "file",
        "path": "src\\utils\\helper.js"
      },
      {
        "name": "config",
        "type": "directory",
        "path": "src\\utils\\config"
      }
    ],
    "error": null
  }
  ```

#### 10. replace_file_content_at_position

- **Description**: Replace a portion of file content at specified line positions. This tool allows replacing content between specific lines in a file. The replacement is precise and only affects the specified range, leaving the rest of the file unchanged.
- **Parameters**:
  - `pathInProject` (string, required): The path to the target file, relative to project root.
  - `startLine` (number, required): The starting line number (1-based).
  - `endLine` (number, required): The ending line number (1-based).
  - `content` (string, required): The new content to write.
  - `offset` (number, optional): The character offset within the line (0-based).
- **Returns**: "ok" if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "startLine": 5,
    "endLine": 5,
    "content": "function helper() { return 'Updated'; }",
    "offset": 0
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

#### 11. append_file_content

- **Description**: Append content to the end of a file.
- **Parameters**:
  - `pathInProject` (string, required): The path to the target file, relative to project root.
  - `text` (string, required): The content to append to the file.
- **Returns**: JSON object with file information and operation details.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "text": "\n// Appended content\nfunction newHelper() {}"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "path": "C:\\Projects\\MyProject\\src\\utils\\helper.js",
      "relativePath": "src\\utils\\helper.js",
      "operationTimeMs": 25
    },
    "error": null
  }
  ```

#### 12. replace_specific_text

- **Description**: Replace specific text occurrences in a file. Supports replacing single or multiple occurrences.
- **Parameters**:
  - `pathInProject` (string, required): The path to the target file, relative to project root.
  - `searchText` (string, required): The text to search for.
  - `replaceText` (string, required): The text to replace with.
  - `replaceAll` (boolean, optional): Whether to replace all occurrences. Default: false.
- **Returns**: JSON object with replacement count and file information.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "searchText": "oldFunction",
    "replaceText": "newFunction",
    "replaceAll": true
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "path": "C:\\Projects\\MyProject\\src\\utils\\helper.js",
      "replacements": 3,
      "operationTimeMs": 30
    },
    "error": null
  }
  ```

### File Search Tools (2 tools)

#### 13. search_in_files_content

- **Description**: Search for a text substring within all files in the project.
- **Parameters**:
  - `searchText` (string, required): The text to search for in files.
- **Returns**: JSON array of files containing matches.
- **Example Request**:
  ```json
  {
    "searchText": "function helper"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": [
      {
        "path": "src\\utils\\helper.js",
        "absolutePath": "C:\\Projects\\MyProject\\src\\utils\\helper.js"
      },
      {
        "path": "test\\helper.test.js",
        "absolutePath": "C:\\Projects\\MyProject\\test\\helper.test.js"
      }
    ],
    "error": null
  }
  ```

#### 14. find_files_by_name_substring

- **Description**: Search for all files in the project whose names contain the specified substring.
- **Parameters**:
  - `nameSubstring` (string, required): The substring to search for in file names.
- **Returns**: JSON array of file information.
- **Example Request**:
  ```json
  {
    "nameSubstring": "helper"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": [
      {
        "path": "src\\utils\\helper.js",
        "name": "helper.js",
        "directory": "src\\utils",
        "absolutePath": "C:\\Projects\\MyProject\\src\\utils\\helper.js"
      }
    ],
    "error": null
  }
  ```

### Code Analysis Tools (3 tools)

#### 15. get_symbols_in_file

- **Description**: Get all symbols defined in the file (functions, classes, variables, etc.).
- **Parameters**:
  - `pathInProject` (string, required): Path to the file to analyze, relative to project root.
- **Returns**: JSON object containing an array of symbol information.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "symbols": [
        {
          "name": "helper",
          "kind": "Function",
          "range": {
            "startLine": 0,
            "startCharacter": 0,
            "endLine": 2,
            "endCharacter": 1
          },
          "text": "helper",
          "detail": ""
        }
      ]
    },
    "error": null
  }
  ```

#### 16. find_references

- **Description**: Find all reference locations of a symbol.
- **Parameters**:
  - `pathInProject` (string, required): Path to the file containing the symbol, relative to project root.
  - `line` (number, required): The line number where the symbol is located (0-based).
  - `character` (number, required): The character position where the symbol is located (0-based).
- **Returns**: JSON object containing an array of reference locations.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "line": 0,
    "character": 12
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "references": [
        {
          "path": "src\\utils\\helper.js",
          "line": 0,
          "character": 9,
          "endLine": 0,
          "endCharacter": 15
        },
        {
          "path": "src\\index.js",
          "line": 3,
          "character": 4,
          "endLine": 3,
          "endCharacter": 10
        }
      ]
    },
    "error": null
  }
  ```

#### 17. refactor_code_at_location

- **Description**: Perform code refactoring at a specific location. Supports rename, extract function, extract variable, and other operations.
- **Parameters**:
  - `pathInProject` (string, required): Path to the file to refactor, relative to project root.
  - `line` (number, required): The line number where to apply refactoring (0-based).
  - `character` (number, required): The character position where to apply refactoring (0-based).
  - `refactorType` (string, required): The type of refactoring to apply (e.g., "rename", "extract_function", "extract_variable").
  - `options` (object, optional): Additional options for the refactoring:
    - `newName` (string, required for "rename"): The new name for the renamed symbol.
- **Returns**: JSON object with success status and refactoring details.
- **Example Request** (Rename):
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "line": 0,
    "character": 12,
    "refactorType": "rename",
    "options": {
      "newName": "helperFunction"
    }
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "success": true,
      "message": "Successfully renamed to helperFunction"
    },
    "error": null
  }
  ```

### Debug Tools (4 tools)

#### 18. toggle_debugger_breakpoint

- **Description**: Toggle a debugger breakpoint at the specified line in a project file.
- **Parameters**:
  - `pathInProject` (string, required): The relative path to the file within the project.
  - `line` (number, required): The line number where to toggle the breakpoint (1-based).
- **Returns**: `"Breakpoint added"` or `"Breakpoint removed"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "line": 5
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "Breakpoint added",
    "error": null
  }
  ```

#### 19. get_debugger_breakpoints

- **Description**: Get information about all line breakpoints set in the project.
- **Parameters**: None
- **Returns**: JSON array of breakpoint information.
- **Example Response**:
  ```json
  {
    "status": [
      {
        "path": "C:\\Projects\\MyProject\\src\\utils\\helper.js",
        "line": 5
      },
      {
        "path": "C:\\Projects\\MyProject\\src\\index.js",
        "line": 12
      }
    ],
    "error": null
  }
  ```

#### 20. get_run_configurations

- **Description**: Get a list of available run configurations in the current project.
- **Parameters**: None
- **Returns**: JSON array of run configuration names.
- **Example Response**:
  ```json
  {
    "status": [
      "Run Dev Server",
      "Run Tests",
      "Build Production"
    ],
    "error": null
  }
  ```

#### 21. run_configuration

- **Description**: Run a specific run configuration in the current project.
- **Parameters**:
  - `configName` (string, required): The name of the run configuration to execute.
- **Returns**: `"Run configuration started"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "configName": "Run Dev Server"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "Run configuration started",
    "error": null
  }
  ```

### Terminal Tools (3 tools)

#### 22. execute_terminal_command

- **Description**: Execute a shell command in the IDE's integrated terminal. The command will be visible to the user and only returns execution status.
- **Parameters**:
  - `command` (string, required): The shell command to execute.
- **Returns**: JSON object with execution status.
- **Example Request**:
  ```json
  {
    "command": "npm list --depth=0"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "status": "executed"
    },
    "error": null
  }
  ```

#### 23. run_command_on_background

- **Description**: Execute a command in the background and return its output. The command execution is not visible to the user.
- **Parameters**:
  - `command` (string, required): The shell command to execute.
  - `cwd` (string, optional): The working directory for the command.
  - `env` (object, optional): Environment variables for the command.
  - `timeout` (number, optional): Command execution timeout in milliseconds.
- **Returns**: JSON object with command output.
- **Example Request**:
  ```json
  {
    "command": "node -v"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "stdout": "v18.17.0",
      "stderr": "",
      "exitCode": 0
    },
    "error": null
  }
  ```

#### 24. wait

- **Description**: Wait for a specified number of milliseconds before continuing.
- **Parameters**:
  - `milliseconds` (number, required): The duration to wait in milliseconds.
- **Returns**: JSON object indicating completion.
- **Example Request**:
  ```json
  {
    "milliseconds": 3000
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "status": "completed",
      "message": "Waited for 3000 milliseconds"
    },
    "error": null
  }
  ```

### Terminal Info Tools (2 tools)

#### 25. get_terminal_info

- **Description**: Retrieve information about the current terminal and operating system environment. Returns data about OS type, terminal type, and whether it is the default terminal.
- **Parameters**: None
- **Returns**: JSON object with terminal and OS information.
- **Example Response**:
  ```json
  {
    "status": {
      "osType": "Windows",
      "osVersion": "Microsoft Windows [Version 10.0.22621.3007]",
      "terminalType": "PowerShell",
      "isIntegratedTerminal": false,
      "isDefault": true
    },
    "error": null
  }
  ```

#### 26. execute_os_specific_command

- **Description**: Execute a command with syntax adjusted for the detected operating system and terminal. You can provide different command versions for different platforms, or a generic command.
- **Parameters**:
  - `windowsCommand` (string, optional): Command for Windows.
  - `unixCommand` (string, optional): Command for Linux/Unix.
  - `macCommand` (string, optional): Command for macOS.
  - `command` (string, optional): Generic command for all platforms.
- **Returns**: JSON object with execution status and OS information.
- **Example Request**:
  ```json
  {
    "windowsCommand": "dir",
    "unixCommand": "ls -la",
    "macCommand": "ls -la"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "osType": "Windows",
      "command": "dir",
      "executed": true
    },
    "error": null
  }
  ```

### Git Basic Tools (2 tools)

#### 27. get_project_vcs_status

- **Description**: Retrieves the current version control status of files in the project. Use this tool to get information about modified, added, deleted, and moved files in your VCS (e.g., Git).
- **Parameters**: None
- **Returns**: JSON array of changed files with paths and change types.
- **Example Response**:
  ```json
  {
    "status": [
      {
        "pathInProject": "src/utils/helper.js",
        "type": "MODIFICATION"
      },
      {
        "pathInProject": "src/new-file.js",
        "type": "ADDITION"
      }
    ],
    "error": null
  }
  ```

#### 28. find_commit_by_message

- **Description**: Search for a commit based on the provided text or keywords in the project history. Useful for finding specific change sets or code modifications by commit messages.
- **Parameters**:
  - `text` (string, required): The text to search for in commit messages.
- **Returns**: JSON array of matching commit hashes.
- **Example Request**:
  ```json
  {
    "text": "fix bug"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": [
      "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8",
      "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9"
    ],
    "error": null
  }
  ```

### Git Advanced Tools (8 tools)

#### 29. get_file_history

- **Description**: Get the modification history of a file.
- **Parameters**:
  - `pathInProject` (string, required): Path to the file to get history for.
  - `maxEntries` (number, optional): Maximum number of history entries to return.
- **Returns**: JSON array of commit information.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "maxEntries": 10
  }
  ```
- **Example Response**:
  ```json
  {
    "status": [
      {
        "hash": "a1b2c3d4",
        "message": "Update helper function",
        "author": "Developer",
        "date": "2024-01-15T10:30:00Z"
      }
    ],
    "error": null
  }
  ```

#### 30. get_file_diff

- **Description**: Get the diff of a file between two commits or against the working tree.
- **Parameters**:
  - `pathInProject` (string, required): Path to the file.
  - `commit1` (string, optional): First commit hash (or "HEAD").
  - `commit2` (string, optional): Second commit hash.
- **Returns**: String containing the diff output.
- **Example Request**:
  ```json
  {
    "pathInProject": "src/utils/helper.js",
    "commit1": "HEAD~1",
    "commit2": "HEAD"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "diff --git a/src/utils/helper.js b/src/utils/helper.js\n...",
    "error": null
  }
  ```

#### 31. get_branch_info

- **Description**: Get information about current and available branches.
- **Parameters**: None
- **Returns**: JSON object with branch information.
- **Example Response**:
  ```json
  {
    "status": {
      "current": "main",
      "branches": ["main", "develop", "feature/new-feature"]
    },
    "error": null
  }
  ```

#### 32. get_commit_details

- **Description**: Get detailed information about a specific commit.
- **Parameters**:
  - `commitHash` (string, required): The hash of the commit.
- **Returns**: JSON object with commit details.
- **Example Request**:
  ```json
  {
    "commitHash": "a1b2c3d4e5f6"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "hash": "a1b2c3d4e5f6",
      "message": "Fix critical bug",
      "author": "Developer",
      "date": "2024-01-15T10:30:00Z",
      "files": ["src/index.js", "src/utils/helper.js"]
    },
    "error": null
  }
  ```

#### 33. commit_changes

- **Description**: Commit staged changes with a message.
- **Parameters**:
  - `message` (string, required): The commit message.
  - `files` (array, optional): Specific files to commit. If not provided, commits all staged changes.
- **Returns**: JSON object with commit result.
- **Example Request**:
  ```json
  {
    "message": "Add new feature",
    "files": ["src/feature.js"]
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "success": true,
      "commitHash": "a1b2c3d4e5f6"
    },
    "error": null
  }
  ```

#### 34. pull_changes

- **Description**: Pull changes from remote repository.
- **Parameters**:
  - `remote` (string, optional): Remote name. Default: "origin".
  - `branch` (string, optional): Branch name.
- **Returns**: JSON object with pull result.
- **Example Request**:
  ```json
  {
    "remote": "origin",
    "branch": "main"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "success": true,
      "message": "Already up to date."
    },
    "error": null
  }
  ```

#### 35. switch_branch

- **Description**: Switch to a different branch.
- **Parameters**:
  - `branch` (string, required): The name of the branch to switch to.
- **Returns**: JSON object with switch result.
- **Example Request**:
  ```json
  {
    "branch": "develop"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "success": true,
      "branch": "develop"
    },
    "error": null
  }
  ```

#### 36. create_branch

- **Description**: Create a new branch.
- **Parameters**:
  - `branch` (string, required): The name of the new branch.
  - `checkout` (boolean, optional): Whether to switch to the new branch after creation.
- **Returns**: JSON object with creation result.
- **Example Request**:
  ```json
  {
    "branch": "feature/new-feature",
    "checkout": true
  }
  ```
- **Example Response**:
  ```json
  {
    "status": {
      "success": true,
      "branch": "feature/new-feature",
      "checkedOut": true
    },
    "error": null
  }
  ```

### Project Tools (2 tools)

#### 37. get_project_modules

- **Description**: Get information about project modules and dependencies. Detects project type (Node.js, Python, Go, Rust, etc.) and lists relevant VSCode extensions.
- **Parameters**: None
- **Returns**: JSON object with project type and extension information.
- **Example Response**:
  ```json
  {
    "status": {
      "types": ["node"],
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint"
      ]
    },
    "error": null
  }
  ```

#### 38. get_project_dependencies

- **Description**: Get project dependencies from package management files. Supports Node.js (package.json) and Python (requirements.txt) projects.
- **Parameters**: None
- **Returns**: JSON object with dependency information.
- **Example Response**:
  ```json
  {
    "status": {
      "type": "node",
      "dependencies": {
        "express": "^4.18.2",
        "lodash": "^4.17.21"
      },
      "devDependencies": {
        "typescript": "^5.0.0"
      }
    },
    "error": null
  }
  ```

### Action Tools (3 tools)

#### 39. list_available_actions

- **Description**: Lists all available actions in VSCode IDE editor. Returns a JSON array of objects containing action information.
- **Parameters**: None
- **Returns**: JSON array of actions with their IDs and presentation text.
- **Example Response**:
  ```json
  {
    "status": [
      {
        "id": "workbench.action.files.save",
        "text": "Save File"
      },
      {
        "id": "editor.action.formatDocument",
        "text": "Format Document"
      },
      {
        "id": "workbench.action.debug.start",
        "text": "Start Debugging"
      }
    ],
    "error": null
  }
  ```

#### 40. execute_action_by_id

- **Description**: Executes an action by its ID in VSCode IDE editor. Note: This tool doesn't wait for the action to complete.
- **Parameters**:
  - `actionId` (string, required): The ID of the action to execute.
- **Returns**: `"ok"` if the action was successfully executed, `"action not found"` otherwise.
- **Example Request**:
  ```json
  {
    "actionId": "editor.action.formatDocument"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

#### 41. get_progress_indicators

- **Description**: Retrieves the status of all running progress indicators in VSCode IDE editor.
- **Parameters**: None
- **Returns**: JSON array of objects containing progress information. Returns an empty array if no progress indicators are running.
- **Example Response**:
  ```json
  {
    "status": [],
    "error": null
  }
  ```

### Summary: All 44 Tools

| Category | Tool Name | Description |
|----------|-----------|-------------|
| **Editor** | `get_open_in_editor_file_text` | Get current file content |
| **Editor** | `get_open_in_editor_file_path` | Get current file path |
| **Editor** | `replace_selected_text` | Replace selected text |
| **Editor** | `replace_current_file_text` | Replace entire file content |
| **Editor** | `open_file_in_editor` | Open file in editor |
| **File** | `get_file_text_by_path` | Read file by path |
| **File** | `rewrite_file_content` | Rewrite entire file |
| **File** | `create_new_file_with_text` | Create new file |
| **File** | `list_files_in_folder` | List folder contents |
| **File** | `replace_file_content_at_position` | Replace at position |
| **File** | `append_file_content` | Append to file |
| **File** | `replace_specific_text` | Replace specific text |
| **File** | `search_in_files_content` | Search file contents |
| **File** | `find_files_by_name_substring` | Find files by name |
| **Code** | `get_symbols_in_file` | Get file symbols |
| **Code** | `find_references` | Find symbol references |
| **Code** | `refactor_code_at_location` | Refactor code |
| **Debug** | `toggle_debugger_breakpoint` | Toggle breakpoint |
| **Debug** | `get_debugger_breakpoints` | Get all breakpoints |
| **Debug** | `get_run_configurations` | List run configs |
| **Debug** | `run_configuration` | Execute run config |
| **Terminal** | `execute_terminal_command` | Run visible command |
| **Terminal** | `run_command_on_background` | Run background command |
| **Terminal** | `wait` | Wait milliseconds |
| **Terminal** | `get_terminal_info` | Get terminal/OS info |
| **Terminal** | `execute_os_specific_command` | Run OS-specific command |
| **Git** | `get_project_vcs_status` | Get VCS status |
| **Git** | `find_commit_by_message` | Search commits |
| **Git** | `get_file_history` | Get file history |
| **Git** | `get_file_diff` | Get file diff |
| **Git** | `get_branch_info` | Get branch info |
| **Git** | `get_commit_details` | Get commit details |
| **Git** | `commit_changes` | Commit changes |
| **Git** | `pull_changes` | Pull changes |
| **Git** | `switch_branch` | Switch branch |
| **Git** | `create_branch` | Create branch |
| **Project** | `get_project_modules` | Get project modules |
| **Project** | `get_project_dependencies` | Get dependencies |
| **Action** | `list_available_actions` | List VSCode actions |
| **Action** | `execute_action_by_id` | Execute VSCode action |
| **Action** | `get_progress_indicators` | Get progress status |

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "status": null,
  "error": "Error message describing the issue"
}
```

Common error scenarios:

1. **File not found**: When the specified file path doesn't exist
2. **No active editor**: When an operation requires an active editor but none is open
3. **Permission denied**: When the operation lacks necessary permissions
4. **Git not available**: When Git operations are attempted in a non-Git repository
5. **Invalid parameters**: When required parameters are missing or invalid

## Notes

1. All file paths can be either absolute or relative to the workspace root
2. Line numbers in most tools are 1-based unless specified otherwise
3. Character positions are typically 0-based
4. The `pathInProject` parameter is the recommended way to specify file paths for cross-platform compatibility
5. Tools that modify files will trigger the file reload mechanism if `ggMCP.autoReloadModifiedFiles` is enabled
