# GG MCP for VSCode

[![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)](https://github.com/bugstan/gg-mcp-for-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/gg-mcp-for-vscode/blob/main/LICENSE)

Supercharge your AI assistants for VSCode! This extension enables a Model Context Protocol (MCP) server that allows AI assistants to directly interact with your VSCode environment.

![MCP Server Status](https://raw.githubusercontent.com/bugstan/gg-mcp-for-vscode/main/images/status-bar.png)

## ✨ Key Features

- **Zero Configuration** - Automatically starts when VSCode launches
- **44 Powerful Tools** - Comprehensive set of tools for file, editor, terminal, Git, and debugging operations
- **AI Assistant Enhancement** - Enable AI tools to read, modify, and analyze your code
- **Code Operations** - Let AI assistants create, edit files, and search through code
- **Advanced Code Analysis** - Symbol extraction, reference finding, and code refactoring
- **Debugging Integration** - AI assistants can help manage breakpoints and run configurations
- **Terminal Operations** - Run visible and background commands with output capture
- **Complete Git Integration** - Branch management, commits, file history, diffs, and more
- **Cross-Platform Support** - Works on Windows, macOS, and Linux
- **Claude Desktop Compatible** - Fully compatible with Claude Desktop, enabling AI-driven automated development
- **File Caching** - Efficient caching mechanism for improved performance

## 🆕 What's New in 1.1.2

- **New Display Name** - Renamed to "GG MCP for VSCode" for better clarity and recognition
- **Improved Path Handling** - Better cross-platform compatibility and path standardization with the new `pathInProject` parameter
- **Command Output Capture** - AI assistants can now execute commands and get their output
- **Enhanced Terminal Tools** - Better terminal text access and command execution
- **File Partial Replacement Interface** - Added new `replace_specific_text` API for replacing specific text in files
  - Provides the ability to replace specific code content locally
  - Supports replacing text within a single line or multiple lines
  - Preserves the original formatting (such as line endings and indents)
- **File Caching Mechanism** - Introduced an efficient file caching system to improve performance and reduce redundant file reads

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
