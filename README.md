# GG MCP for VSCode

[🇨🇳 中文文档](docs/README-zh.md) | [🇺🇸 English](README.md)

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/n2ns/ggMCP4VSCode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/n2ns/ggMCP4VSCode/blob/main/LICENSE)
[![MCP Compliant](https://img.shields.io/badge/MCP-Fully%20Compliant-success)](https://modelcontextprotocol.io/)

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/bugstan.gg-mcp-for-vscode?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=bugstan.gg-mcp-for-vscode)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/bugstan.gg-mcp-for-vscode)](https://marketplace.visualstudio.com/items?itemName=bugstan.gg-mcp-for-vscode)
[![Open VSX Version](https://img.shields.io/open-vsx/v/bugstan/gg-mcp-for-vscode?label=Open%20VSX)](https://open-vsx.org/extension/bugstan/gg-mcp-for-vscode)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/bugstan/gg-mcp-for-vscode?label=Downloads)](https://open-vsx.org/extension/bugstan/gg-mcp-for-vscode)


**Enable MCP support for AI assistants.** Let **Claude Desktop** work directly inside your IDE.

This extension provides a **compliant Model Context Protocol (MCP) Server** compatible with **VS Code**, **Cursor**, **Windsurf**, and **Antigravity**.

It acts as the bridge between your local codebase and **Claude Desktop**: Claude initiates the instructions, and this extension acts as the server to **execute development work**—reading files, editing code, and running commands—in your workspace.

![MCP Server Status](https://raw.githubusercontent.com/n2ns/ggMCP4VSCode/main/images/status-bar.png)


## ✨ Key Features

- **Multi-IDE Support**: Supports **VS Code**, **Cursor**, **Windsurf**, and **Antigravity**.
- **Claude Desktop Integration**: Handles development requests from Claude Desktop, enabling automated programming tasks.
- **Compatibility**: Supports MCP-compliant clients.
- **Zero Configuration**: Automatically starts a local MCP server when VS Code launches.
- **Toolset**:
  - **📂 File Operations**: Read, write, create, and patch files.
  - **💻 Terminal Control**: Execute commands, run background tasks, and capture output.
  - **🔧 Git Integration**: Commit, push, pull, view diffs, and manage branches.
  - **🐛 Debugging**: Set breakpoints and manage launch configurations.
  - **🔍 Code Analysis**: Find symbols, references, and definitions.
- **Secure Architecture**: Binds to localhost only.
- **Port Management**: Automatic port conflict resolution with background status notifications.
- **Cross-Platform**: Support for Windows, macOS, and Linux.
- **File Caching**: Built-in file content caching.

## 🚀 Quick Start

### 1. Install the Extension

- Search for "GG MCP for VSCode" in the VS Code marketplace and install
- Or [click here to install](vscode:extension/bugstan.gg-mcp-for-vscode)

### 2. Recommended Setup

- **Claude Desktop Integration**: This extension is compatible with Claude Desktop, enabling:
  - Execution of development instructions from Claude
  - Automated coding assistance
  - Direct read/write access to codebase
- **MCPxHub**: Recommended for use with [MCPxHub](https://github.com/bugstan/MCPxHub) plugin

### 3. Verify Server Is Running

After installation, the MCP server automatically starts. Check the bottom-right status bar:

- **🔄 MCP Server** - Server is starting
- **🔌 [Port]** - Server is running (e.g., `🔌 9961`)
- **❌ MCP Server** - Error occurred

Click on the status bar item to see details or restart the server.

### 4. Use with AI Assistants

When interacting with MCP-compliant AI assistants (like Claude Desktop), capabilities include:
- Viewing open files
- Modifying code
- Performing project tasks
- Developing features
- Executing terminal commands

## 💻 Automated Development with Claude Desktop

Capabilities with GG MCP for VSCode and Claude Desktop:

- Codebase analysis
- Feature implementation and bug fixing
- Code refactoring
- Architecture suggestions
- Task implementation

## ⚙️ Configuration Options

### File Caching

The extension includes a file caching mechanism:
- Reduces file system read operations
- Optimizes file access performance
- Invalidates cache on file modification
- Configurable in extension settings

Find options by searching for "ggMCP" in VS Code settings:

- Port range
- Terminal timeout
- File auto-reload options
- File caching behavior

## 📄 Commands

- **MCP: Show Server Status** - View current server information
- **MCP: Restart Server** - Manually restart the MCP server

## 🔗 Links

- [GitHub Repository](https://github.com/n2ns/ggMCP4VSCode)
- [Report Issues](https://github.com/n2ns/ggMCP4VSCode/issues)
- [Model Context Protocol Specification](https://github.com/microsoft/model-context-protocol)

## 📝 License

[MIT](LICENSE)

---

### Available Tools (44 total)

| Category | Count | Examples |
|----------|-------|----------|
| Editor Tools | 5 | `get_open_in_editor_file_text`, `replace_selected_text`, `open_file_in_editor` |
| File Tools | 9 | `get_file_text_by_path`, `create_new_file_with_text`, `replace_specific_text` |
| Code Analysis | 3 | `get_symbols_in_file`, `find_references`, `refactor_code_at_location` |
| Debug Tools | 4 | `toggle_debugger_breakpoint`, `run_configuration` |
| Terminal Tools | 5 | `execute_terminal_command`, `run_command_on_background`, `get_terminal_info` |
| Git Tools | 10 | `get_project_vcs_status`, `commit_changes`, `switch_branch`, `get_file_diff` |
| Project Tools | 2 | `get_project_modules`, `get_project_dependencies` |
| Action Tools | 3 | `list_available_actions`, `execute_action_by_id` |

### Detailed Documentation

For complete API documentation with examples, see [INTERFACE.md](docs/INTERFACE.md).

For technical details and source code, visit our [GitHub repository](https://github.com/n2ns/ggMCP4VSCode).
