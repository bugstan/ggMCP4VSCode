# VSCode MCP Server Plugin Interface Documentation

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

The plugin provides various tools for operating the VSCode environment, organized by category:

### Editor Tools

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
  - `filePath` (string, required): The path of the file to open, can be absolute or relative to the project root.
- **Returns**: `"file is opened"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "filePath": "src/index.js"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "file is opened",
    "error": null
  }
  ```

### File Read/Write Tools

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

#### 7. replace_file_text_by_path

- **Description**: Replace the entire content of a specified project file with new text.
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
        "name": "newFile.js",
        "type": "file",
        "path": "src\\utils\\newFile.js"
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

### File Search Tools

#### 10. search_in_files_content

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

#### 11. find_files_by_name_substring

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
      },
      {
        "path": "test\\helper.test.js",
        "name": "helper.test.js",
        "directory": "test",
        "absolutePath": "C:\\Projects\\MyProject\\test\\helper.test.js"
      }
    ],
    "error": null
  }
  ```

### Code Analysis Tools

#### 12. get_symbols_in_file

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
    "status": "{\"symbols\":[{\"name\":\"helper\",\"kind\":\"Function\",\"range\":{\"startLine\":0,\"startCharacter\":0,\"endLine\":2,\"endCharacter\":1},\"selectionRange\":{\"startLine\":0,\"startCharacter\":9,\"endLine\":0,\"endCharacter\":15},\"text\":\"helper\",\"detail\":\"\"}]}",
    "error": null
  }
  ```

#### 13. find_references

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
    "status": "{\"references\":[{\"path\":\"src\\\\utils\\\\helper.js\",\"line\":0,\"character\":9,\"endLine\":0,\"endCharacter\":15},{\"path\":\"src\\\\index.js\",\"line\":3,\"character\":4,\"endLine\":3,\"endCharacter\":10}]}",
    "error": null
  }
  ```

#### 14. refactor_code_at_location

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
    "status": "{\"success\":true,\"message\":\"Successfully renamed to helperFunction\"}",
    "error": null
  }
  ```

### Debug Tools

#### 15. toggle_debugger_breakpoint

- **Description**: Toggle a debugger breakpoint at the specified line in a project file.
- **Parameters**:
  - `filePathInProject` (string, required): The relative path to the file within the project.
  - `line` (number, required): The line number where to toggle the breakpoint (1-based).
- **Returns**: `"Breakpoint added"` or `"Breakpoint removed"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "filePathInProject": "src/utils/helper.js",
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

#### 16. get_debugger_breakpoints

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

#### 17. get_run_configurations

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

#### 18. run_configuration

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

### Terminal Tools

#### 19. get_terminal_text

- **Description**: Retrieve the current text content from the first active terminal in the IDE.
- **Parameters**: None
- **Returns**: String containing the terminal's text content, or empty string if no terminal is open.
- **Example Response**:
  ```json
  {
    "status": "> npm install\nAdded 125 packages in 3.5s",
    "error": null
  }
  ```

#### 20. execute_terminal_command

- **Description**: Execute a specified shell command in the IDE's integrated terminal.
- **Parameters**:
  - `command` (string, required): The shell command to execute.
- **Returns**: String containing command output (if available) or execution status message.
- **Example Request**:
  ```json
  {
    "command": "npm list --depth=0"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "my-project@1.0.0\n├── express@4.18.2\n└── lodash@4.17.21",
    "error": null
  }
  ```

#### 21. execute_command_with_output

- **Description**: Execute a specified shell command and capture its output using VS Code's Shell Integration API.
- **Parameters**:
  - `command` (string, required): The shell command to execute.
- **Returns**: String containing command output or execution status message.
- **Example Request**:
  ```json
  {
    "command": "node -v"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "v16.14.2",
    "error": null
  }
  ```

#### 22. get_command_output

- **Description**: Get the output from the last command executed with execute_command_with_output.
- **Parameters**: None
- **Returns**: JSON object with command status and output.
- **Example Response**:
  ```json
  {
    "status": {
      "status": "completed",
      "output": "v16.14.2"
    },
    "error": null
  }
  ```

#### 23. wait

- **Description**: Wait for a specified number of milliseconds.
- **Parameters**:
  - `milliseconds` (number, required): The duration to wait in milliseconds.
- **Returns**: `"ok"` after the wait completes.
- **Example Request**:
  ```json
  {
    "milliseconds": 3000
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

### Git Tools

#### 24. get_project_vcs_status

- **Description**: Get the version control status of files in the project.
- **Parameters**: None
- **Returns**: JSON array of changed files with paths and change types.
- **Example Response**:
  ```json
  {
    "status": [
      {
        "path": "src/utils/helper.js",
        "type": "MODIFIED"
      },
      {
        "path": "src/new-file.js",
        "type": "ADDED"
      }
    ],
    "error": null
  }
  ```

#### 25. find_commit_by_message

- **Description**: Search for a commit based on the provided text or keywords in the project history.
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

### Project Tools

#### 26. get_project_modules

- **Description**: Get list of all modules in the project with their dependencies.
- **Parameters**: None
- **Returns**: JSON list of module names.
- **Example Response**:
  ```json
  {
    "status": [
      "main",
      "auth",
      "api"
    ],
    "error": null
  }
  ```

#### 27. get_project_dependencies

- **Description**: Get list of all dependencies defined in the project.
- **Parameters**: None
- **Returns**: JSON list of dependency names.
- **Example Response**:
  ```json
  {
    "status": [
      "express",
      "react",
      "lodash"
    ],
    "error": null
  }
  ```

### Action Tools

#### 28. list_available_actions

- **Description**: List all available actions in VSCode IDE editor.
- **Parameters**: None
- **Returns**: JSON array of actions with their IDs and presentation text.
- **Example Response**:
  ```json
  {
    "status": [
      {
        "id": "format.document",
        "text": "Format Document"
      },
      {
        "id": "editor.action.rename",
        "text": "Rename Symbol"
      }
    ],
    "error": null
  }
  ```

#### 29. execute_action_by_id

- **Description**: Execute an action by its ID in VSCode IDE editor.
- **Parameters**:
  - `actionId` (string, required): The ID of the action to execute.
- **Returns**: `"ok"` if successful, error message otherwise.
- **Example Request**:
  ```json
  {
    "actionId": "format.document"
  }
  ```
- **Example Response**:
  ```json
  {
    "status": "ok",
    "error": null
  }
  ```

## Data Structures

### Internal Response Interface

```typescript
interface IDEResponseOk {
    /** Operation success status message */
    status: string;
    /** Error information is empty */
    error: null;
}

interface IDEResponseErr {
    /** Status is empty */
    status: null;
    /** Error information */
    error: string;
}

type IDEResponse = IDEResponseOk | IDEResponseErr;
```

### Tool Definition

```typescript
interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}
```

### VSCode Configuration Options

VSCode MCP Server Plugin provides the following configuration options:

- `ggMCP.portStart`: MCP server port range start value (default: 9960)
- `ggMCP.portEnd`: MCP server port range end value (default: 9990)
- `ggMCP.terminalTimeout`: Terminal command execution timeout (default: 15000 milliseconds)
- `ggMCP.enableLogging`: Enable logging (default: true)
- `ggMCP.autoReloadModifiedFiles`: Automatically reload files modified remotely (default: true)
