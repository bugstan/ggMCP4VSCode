# GG MCP for VSCode

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/bugstan/gg-mcp-for-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/gg-mcp-for-vscode/blob/main/LICENSE)
[![MCP Compliant](https://img.shields.io/badge/MCP-Fully%20Compliant-success)](https://modelcontextprotocol.io/)

**Supercharge your AI assistants!** verify your code, automate tasks, and let AI agents work directly within VS Code.

This extension provides a **fully compliant Model Context Protocol (MCP) Server** for VS Code, enabling advanced AI assistants like **Claude Desktop**, **Cursor**, **Windsurf**, and **Antigravity** to directly read, write, and analyze code in your workspace.

![MCP Server Status](https://raw.githubusercontent.com/bugstan/gg-mcp-for-vscode/main/images/status-bar.png)

## 🆕 What's New in 1.2.0

> **Major Update: Full MCP Compliance & Security**

- **✅ Fully MCP Compliant protocols**: Now implements strict **JSON-RPC 2.0**, standard response formats, and tool definitions aligned with official specs.
- **🔒 Enhanced Security**: Built with "Secure by Design" principles—local binding only (127.0.0.1) and strict Origin validation.
- **🛠️ 44+ Powerful Tools**: Comprehensive toolset for Files, Git, Terminal, and Debugging operations.
- **⚡ Improved Performance**: Optimized request handling and file caching.

## ✨ Key Features

- **Universal Compatibility**: Works perfectly with **Claude Desktop**, **Cursor**, **Windsurf**, **Antigravity**, and any MCP-compliant client.
- **Zero Configuration**: Automatically starts a secure local MCP server when VSCode launches.
- **Complete Toolset**:
  - **📂 File Operations**: Read, write, create, and patch files safely.
  - **💻 Terminal Control**: Execute commands, run background tasks, and capture output.
  - **🔧 Git Integration**: Commit, push, pull, view diffs, and manage branches.
  - **🐛 Debugging**: Set breakpoints and manage launch configurations.
  - **🔍 Code Analysis**: Find symbols, references, and definitions.
- **Secure Architecture**: Localhost-only binding ensuring your code stays private on your machine.
- **Cross-Platform**: Seamless support for Windows, macOS, and Linux.

## 🚀 Quick Start

### 1. Install the Extension

- Search for "GG MCP for VSCode" in the VS Code marketplace and install
- Or [click here to install](vscode:extension/bugstan.gg-mcp-for-vscode)

### 2. Recommended Setup

- **Claude Desktop Integration**: This extension is fully compatible with Claude Desktop, allowing you to:
  - Accept and execute development instructions from Claude
  - Enable automated coding assistance through Claude's AI capabilities
  - Let Claude read and modify your codebase directly with proper permissions
- **MCPxHub**: For enhanced experience, use with [MCPxHub](https://github.com/bugstan/MCPxHub) plugin

### 3. Verify Server Is Running

After installation, the MCP server automatically starts. Check the bottom-right status bar:

- **🔄 MCP Server** - Server is starting
- **⚡ MCP Server** - Server is running
- **❌ MCP Server** - Error occurred

Click on the status bar item to see details or restart the server.

### 4. Use with AI Assistants

When interacting with AI assistants that support the MCP protocol (like Claude Desktop), you can now:
- Ask the assistant to look at your currently open files
- Request the assistant to modify code
- Have the assistant perform project tasks
- Let Claude automatically develop features based on your requirements
- Execute terminal commands and get their output

## 💻 Automated Development with Claude Desktop

With GG MCP for VSCode and Claude Desktop, you can:

- Instruct Claude to analyze your entire codebase
- Have Claude automatically implement new features or fix bugs
- Ask Claude to refactor code while maintaining functionality
- Let Claude suggest improvements to your code architecture
- Use natural language to describe coding tasks and let Claude handle the implementation

## ⚙️ Configuration Options

### File Caching

The extension now includes an intelligent file caching mechanism:
- Reduces file system read operations
- Improves performance for repeated file access
- Automatically invalidates cache when files are modified
- Can be configured in extension settings

Find all options by searching for "ggMCP" in VS Code settings:

- Port range
- Terminal timeout
- File auto-reload options
- File caching behavior

## 📄 Commands

- **MCP: Show Server Status** - View current server information
- **MCP: Restart Server** - Manually restart the MCP server

## 🔗 Links

- [GitHub Repository](https://github.com/bugstan/gg-mcp-for-vscode)
- [Report Issues](https://github.com/bugstan/gg-mcp-for-vscode/issues)
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

For technical details and source code, visit our [GitHub repository](https://github.com/bugstan/gg-mcp-for-vscode).
