# VSCode MCP 服务器插件接口文档

## 介绍

VSCode MCP 服务器插件是一个为Visual Studio Code提供MCP（Model Context Protocol）协议支持的扩展。它允许MCP客户端（如AI助手）通过HTTP协议与VSCode进行通信，执行各种VSCode操作，如文件读写、代码编辑、调试控制等。

## 通信架构

```
 +---------------------+       +---------------+
 |                     |       |               |
 | MCP客户端            | <---> | VSCode插件    |
 | (如AI助手)           |       | (MCP服务器)   |
 |                     |       |               |
 +---------------------+       +---------------+
                        HTTP协议
                      (端口通信)
```

### 通信方式

- **协议**: HTTP
- **连接类型**: 短连接，请求-响应模式
- **端点格式**: `http://${HOST}:${PORT}/mcp/*`（标准MCP格式）
- **端口范围**: 默认9960-9990（可在VSCode设置中配置）

## 接口定义

### 1. 初始化连接

- **URL**: `http://${HOST}:${PORT}/mcp/initialize`
- **方法**: GET/POST
- **功能**: 获取VSCode服务器信息和环境信息
- **响应格式**: JSON对象（JSON-RPC 2.0格式）
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
        "workspaceRoot": "项目根目录路径",
        "activeFile": "当前活动文件路径",
        "currentDirectory": "当前目录路径"
      }
    }
  }
  ```

### 2. 获取服务器状态

- **URL**: `http://${HOST}:${PORT}/mcp/status`
- **方法**: GET/POST
- **功能**: 获取VSCode MCP服务器运行状态和环境信息
- **响应格式**: JSON对象（JSON-RPC 2.0格式）
  ```json
  {
    "jsonrpc": "2.0",
    "id": 0,
    "result": {
      "status": "running",
      "environment": {
        "workspaceRoot": "项目根目录路径",
        "activeFile": "当前活动文件路径",
        "currentDirectory": "当前目录路径",
        "openFiles": ["文件路径1", "文件路径2"]
      }
    }
  }
  ```

### 3. 获取工具列表

- **URL**: `http://${HOST}:${PORT}/mcp/list_tools`
- **方法**: GET
- **功能**: 获取VSCode插件支持的所有工具列表
- **响应格式**: JSON数组，直接返回工具定义对象数组
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

### 4. 工具调用

- **URL**: `http://${HOST}:${PORT}/mcp/${toolName}`
- **方法**: POST
- **请求头**: 
  ```
  Content-Type: application/json
  ```
- **请求体**: JSON对象，可以是以下两种格式之一：
  
  1. 直接参数格式：
  ```json
  {
    "param1": "value1",
    "param2": 123
  }
  ```
  
  2. JSON-RPC 2.0格式：
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
  
- **功能**: 执行特定VSCode工具调用
- **响应格式**: MCP 标准格式
  ```json
  {
    "status": "操作结果",
    "error": null
  }
  ```
  
  错误响应:
  ```json
  {
    "status": null,
    "error": "错误消息"
  }
  ```

## MCP 协议兼容性说明

VSCode MCP 服务器插件采用标准 MCP 协议:

1. **接口路径**: 使用标准的 MCP 路径格式 `/mcp/*`

2. **响应格式**: 使用标准 MCP 响应格式
   - 成功响应: `{"status": "结果内容", "error": null}`
   - 错误响应: `{"status": null, "error": "错误消息"}`

3. **工具描述**: 提供标准的工具描述格式

4. **端口范围**: 使用VSCode特定的端口范围(9960-9990)

## 可用VSCode工具

插件提供了多种工具用于操作VSCode环境，包括但不限于：

- **VSCode文件操作**：读取、创建、修改文件
- **VSCode编辑器操作**：获取选中内容、替换文本
- **VSCode项目操作**：列出文件、搜索内容、获取版本控制状态
- **VSCode调试操作**：设置断点、获取断点列表
- **VSCode终端操作**：获取终端内容、执行命令

详细工具列表和参数请通过`list_tools`接口获取。

## 数据结构

### 内部响应接口

```typescript
interface IDEResponseOk {
    /** 操作成功状态消息 */
    status: string;
    /** 错误信息为空 */
    error: null;
}

interface IDEResponseErr {
    /** 状态为空 */
    status: null;
    /** 错误信息 */
    error: string;
}

type IDEResponse = IDEResponseOk | IDEResponseErr;
```

### 工具定义

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

### VSCode配置项

VSCode MCP服务器插件提供以下配置选项：

- `ggMCP.portStart`: MCP服务器端口范围起始值（默认：9960）
- `ggMCP.portEnd`: MCP服务器端口范围结束值（默认：9990）
- `ggMCP.terminalTimeout`: 终端命令执行超时时间（默认：15000毫秒）
- `ggMCP.enableLogging`: 启用日志记录（默认：true）
- `ggMCP.autoReloadModifiedFiles`: 远程修改文件后自动重新加载（默认：true）
