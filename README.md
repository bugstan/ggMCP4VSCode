# VSCode MCP 服务器扩展

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/bugstan/vscode-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/vscode-mcp-server/blob/main/LICENSE)

这个VSCode扩展实现了基于Model Context Protocol (MCP)协议的服务器，允许AI助手等客户端通过HTTP请求直接访问VSCode的API功能。通过这个扩展，外部应用可以与VSCode编辑器进行交互，实现文件操作、内容编辑、调试控制等高级功能。

## 功能特点

- 自动启动MCP服务器，监听指定端口范围内的请求
- 提供30多种VSCode API工具，使用官方API实现，确保最佳兼容性
- 支持丰富的功能集:
  - 文件操作（创建、读取、更新、搜索）
  - 编辑器操作（获取/替换选中内容，替换文件内容）
  - 调试功能（断点管理，运行配置）
  - 终端操作（执行命令，获取输出）
  - Git操作（获取变更状态，搜索提交）
  - VSCode命令执行和操作管理
  - 项目依赖和模块管理
- 符合JSON-RPC 2.0的通信标准
- 完善的错误处理和响应格式化
- 状态栏指示器显示服务器运行状态
- 支持通过命令重启服务器或更改配置

## 安装

1. 从VS Code插件市场安装，或者
2. 下载 .vsix 文件并通过VS Code的"从VSIX安装"功能安装
3. 若要从源码安装:
   ```bash
   git clone https://github.com/bugstan/vscode-mcp-server.git
   cd vscode-mcp-server
   npm install
   npm run compile
   ```
   然后按 F5 在开发主机中启动

## 配置选项

在VS Code设置中可以自定义以下选项：

- `ggMCP.portStart`: 端口范围起始值（默认：9960）
- `ggMCP.portEnd`: 端口范围结束值（默认：9990）
- `ggMCP.terminalTimeout`: 终端命令执行超时时间（默认：15000毫秒）
- `ggMCP.enableLogging`: 启用日志记录（默认：true）
- `ggMCP.autoReloadModifiedFiles`: 是否自动重新加载已修改的文件（默认：true）
- `ggMCP.autoOpenModifiedFiles`: 是否自动打开修改的文件（默认：false）

## API接口

### 初始化

- **URL**: `http://localhost:{port}/api/mcp/initialize`
- **方法**: GET/POST
- **响应**: 返回服务器信息和工作环境数据，格式符合JSON-RPC 2.0标准
  ```json
  {
    "jsonrpc": "2.0",
    "id": 0,
    "result": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "tools": { "listChanged": true },
        "resources": {}
      },
      "serverInfo": {
        "name": "mcpnexthub/vscode",
        "version": "1.0.0"
      },
      "environment": {
        "workspaceRoot": "/path/to/project",
        "activeFile": "/path/to/active/file.js",
        "currentDirectory": "/path/to/current/dir"
      }
    }
  }
  ```

### 获取服务器状态

- **URL**: `http://localhost:{port}/api/mcp/status`
- **方法**: GET/POST
- **响应**: 返回服务器运行状态和当前工作环境信息，格式符合JSON-RPC 2.0标准
  ```json
  {
    "jsonrpc": "2.0",
    "id": 0,
    "result": {
      "status": "running",
      "environment": {
        "workspaceRoot": "/path/to/project",
        "activeFile": "/path/to/active/file.js",
        "currentDirectory": "/path/to/current/dir",
        "openFiles": ["/path/to/file1.js", "/path/to/file2.js"]
      }
    }
  }
  ```

### 获取工具列表

- **URL**: `http://localhost:{port}/api/mcp/list_tools`
- **方法**: GET
- **响应**: 返回所有可用工具的详细信息，包括名称、描述和参数定义

### 调用工具

- **URL**: `http://localhost:{port}/api/mcp/{toolName}`
- **方法**: POST
- **请求体**: 支持两种格式：
  1. 直接参数格式
  2. JSON-RPC 2.0格式
  
- **响应**: 返回操作结果，格式符合JSON-RPC 2.0标准

## 主要API工具说明

### 编辑器操作

- `get_open_in_editor_file_text`: 获取当前打开文件的内容
- `get_open_in_editor_file_path`: 获取当前打开文件的路径
- `get_selected_in_editor_text`: 获取选中的文本
- `replace_selected_text`: 替换选中的文本
- `replace_current_file_text`: 替换当前文件的全部内容
- `get_all_open_file_texts`: 获取所有打开文件的内容
- `get_all_open_file_paths`: 获取所有打开文件的路径
- `open_file_in_editor`: 在编辑器中打开文件

### 文件操作

- `create_new_file_with_text`: 创建新文件并填充内容
- `find_files_by_name_substring`: 查找文件名包含指定子字符串的文件
- `get_file_text_by_path`: 获取指定路径文件的内容
- `replace_file_text_by_path`: 替换指定文件的内容
- `list_files_in_folder`: 列出文件夹内容
- `search_in_files_content`: 在文件内容中搜索文本

### 调试功能

- `toggle_debugger_breakpoint`: 切换断点
- `get_debugger_breakpoints`: 获取所有断点
- `run_configuration`: 运行调试配置
- `get_run_configurations`: 获取可用的调试配置

### 终端操作

- `get_terminal_text`: 获取终端内容
- `execute_terminal_command`: 执行终端命令
- `wait`: 等待指定时间

### Git操作

- `get_project_vcs_status`: 获取版本控制状态
- `find_commit_by_message`: 搜索提交

### VSCode操作

- `list_available_actions`: 列出可用的VSCode命令
- `execute_action_by_id`: 执行指定命令
- `get_progress_indicators`: 获取进度指示器状态

### 项目管理

- `get_project_modules`: 获取项目模块列表
- `get_project_dependencies`: 获取项目依赖列表

## 命令

扩展提供以下VSCode命令：

- `ggMCP.showStatus`: 显示MCP服务器状态（端口等信息）
- `ggMCP.restart`: 重启MCP服务器

## 项目架构

```
vscode-mcp-server/
├── extension.ts          # 插件入口文件
├── server.ts             # MCP服务器实现
├── tools.ts              # 工具定义
├── handlers/             # 处理程序
├── utils/                # 工具函数
├── types/                # 类型定义
└── test/                 # 测试脚本
```

## 实现细节

- 使用VSCode官方API实现所有功能，确保最佳兼容性和稳定性
- 采用异步编程模式处理请求和响应
- 自动端口扫描，确保在可用端口上启动服务器
- 统一的错误处理机制，提供详细的错误信息
- 路径安全检查，避免未授权的文件访问
- 支持远程文件系统和虚拟文件系统

## 开发与测试

### 构建

```bash
npm install
npm run compile
```

### 调试

按 F5 在VSCode新窗口中启动插件。

### 打包

```bash
npm run vscode:prepublish
vsce package
```

## 贡献

欢迎贡献代码、提出问题和建议！请先fork本仓库，然后提交pull request。

## 许可证

[MIT](LICENSE)
