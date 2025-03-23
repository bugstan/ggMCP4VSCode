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
- **Function**: Get VSCode MCP server running status and environment information
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

The plugin provides various tools for operating the VSCode environment, including but not limited to:

- **VSCode File Operations**: Read, create, modify files
- **VSCode Editor Operations**: Get selected content, replace text
- **VSCode Project Operations**: List files, search content, get version control status
- **VSCode Debugging Operations**: Set breakpoints, get breakpoint list
- **VSCode Terminal Operations**: Get terminal content, execute commands

For a detailed list of tools and parameters, please retrieve via the `list_tools` interface.

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
