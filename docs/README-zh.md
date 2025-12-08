# GG MCP for VSCode

[🇺🇸 English Document](../README.md)

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/n2ns/ggMCP4VSCode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/n2ns/ggMCP4VSCode/blob/main/LICENSE)
[![MCP Compliant](https://img.shields.io/badge/MCP-Fully%20Compliant-success)](https://modelcontextprotocol.io/)

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/bugstan.gg-mcp-for-vscode?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=bugstan.gg-mcp-for-vscode)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/bugstan.gg-mcp-for-vscode)](https://marketplace.visualstudio.com/items?itemName=bugstan.gg-mcp-for-vscode)
[![Open VSX Version](https://img.shields.io/open-vsx/v/bugstan/gg-mcp-for-vscode?label=Open%20VSX)](https://open-vsx.org/extension/bugstan/gg-mcp-for-vscode)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/bugstan/gg-mcp-for-vscode?label=Downloads)](https://open-vsx.org/extension/bugstan/gg-mcp-for-vscode)


**为 AI 助手启用 MCP 支持。** 让 **Claude Desktop** 直接在您的 IDE 中工作。

本扩展是一个**符合模型上下文协议 (MCP) 规范的服务器**，支持 **VS Code**、**Cursor**、**Windsurf** 和 **Antigravity**。

它充当 Claude Desktop 与您本地代码库之间的桥梁：**Claude Desktop** 发起指令，本扩展作为服务器负责在您的项目中**执行开发工作**（如文件编辑、代码修改和运行命令）。

![MCP Server Status](https://raw.githubusercontent.com/n2ns/ggMCP4VSCode/main/images/status-bar.png)


## ✨ 核心特性

- **多 IDE 支持**：支持 **VS Code**、**Cursor**、**Windsurf** 和 **Antigravity** 等 IDE。
- **Claude Desktop 集成**：响应 Claude Desktop 的开发请求，支持自动化编程任务。
- **兼容性**：支持任何符合 MCP 标准的客户端。
- **零配置**：VS Code 启动时自动开启本地 MCP 服务器。
- **工具集**：
  - **📂 文件操作**：读取、写入、创建和修补文件。
  - **💻 终端控制**：执行命令、运行后台任务并捕获输出。
  - **🔧 Git 集成**：提交、推送、拉取、查看差异和管理分支。
  - **🐛 调试支持**：设置断点和管理启动配置。
  - **🔍 代码分析**：查找符号、引用和定义。
- **安全架构**：仅绑定本地主机 (Localhost)。
- **端口管理**：自动解决端口冲突，并使用状态栏消息进行通知。
- **跨平台支持**：支持 Windows、macOS 和 Linux。
- **文件缓存**：内置文件内容缓存机制。

## 🚀 快速开始

### 1. 安装扩展

- 在 VS Code 市场中搜索 "GG MCP for VSCode" 并安装
- 或者 [点击此处安装](vscode:extension/bugstan.gg-mcp-for-vscode)

### 2. 推荐设置

- **Claude Desktop 集成**：本扩展与 Claude Desktop 兼容，功能包括：
  - 执行来自 Claude 的开发指令
  - 通过 Claude 实现辅助编码
  - 允许 Claude 读取和修改代码库
- **MCPxHub**：建议配合 [MCPxHub](https://github.com/bugstan/MCPxHub) 插件使用

### 3. 验证服务器是否正在运行

安装后，MCP 服务器会自动启动。查看右下角状态栏：

- **🔄 MCP Server** - 服务器正在启动
- **🔌 [端口号]** - 服务器正在运行 (例如 `🔌 9961`)
- **❌ MCP Server** - 发生错误

单击状态栏项以查看信息或重新启动服务器。

### 4. 与 AI 助手一起使用

当与支持 MCP 协议的 AI 助手（如 Claude Desktop）交互时，可以：
- 查看当前打开的文件
- 修改代码
- 执行项目任务
- 开发功能
- 执行终端命令并获取输出

## 💻 使用 Claude Desktop 进行自动化开发

借助 GG MCP for VSCode 和 Claude Desktop，功能包括：

- 分析代码库
- 实现功能或修复错误
- 重构代码
- 提出代码架构建议
- 处理编码任务

## ⚙️ 配置选项

### 文件缓存

该扩展包含文件缓存机制：
- 减少文件系统读取操作
- 优化文件访问性能
- 文件修改时清除缓存
- 可在扩展设置中进行配置

在 VS Code 设置中搜索 "ggMCP" 查看选项：

- 端口范围
- 终端超时
- 文件自动重新加载选项
- 文件缓存行为

## 📄 命令

- **MCP: Show Server Status** - 查看当前服务器信息
- **MCP: Restart Server** - 手动重启 MCP 服务器

## 🔗 链接

- [GitHub 仓库](https://github.com/n2ns/ggMCP4VSCode)
- [报告问题](https://github.com/n2ns/ggMCP4VSCode/issues)
- [Model Context Protocol 规范](https://github.com/microsoft/model-context-protocol)

## 📝 许可

[MIT](LICENSE)

---

### 可用工具（共 44 个）

| 类别 | 数量 | 示例 |
|------|------|------|
| 编辑器工具 | 5 | `get_open_in_editor_file_text`, `replace_selected_text`, `open_file_in_editor` |
| 文件工具 | 9 | `get_file_text_by_path`, `create_new_file_with_text`, `replace_specific_text` |
| 代码分析 | 3 | `get_symbols_in_file`, `find_references`, `refactor_code_at_location` |
| 调试工具 | 4 | `toggle_debugger_breakpoint`, `run_configuration` |
| 终端工具 | 5 | `execute_terminal_command`, `run_command_on_background`, `get_terminal_info` |
| Git 工具 | 10 | `get_project_vcs_status`, `commit_changes`, `switch_branch`, `get_file_diff` |
| 项目工具 | 2 | `get_project_modules`, `get_project_dependencies` |
| 操作工具 | 3 | `list_available_actions`, `execute_action_by_id` |

### 详细文档

完整的 API 文档和示例，请参阅 [INTERFACE.md](docs/INTERFACE.md)。

技术细节和源代码，请访问我们的 [GitHub 仓库](https://github.com/n2ns/ggMCP4VSCode)。
