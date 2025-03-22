# ggMCP4VSCode

[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/bugstan/ggMCP4VSCode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/ggMCP4VSCode/blob/main/LICENSE)

Supercharge your AI assistants for VSCode! This extension enables a Model Context Protocol (MCP) server that allows AI assistants to directly interact with your VSCode environment.

![MCP Server Status](https://raw.githubusercontent.com/bugstan/ggMCP4VSCode/main/images/status-bar.png)

## ✨ Key Features

- **Zero Configuration** - Automatically starts when VSCode launches
- **AI Assistant Enhancement** - Enable AI tools to read, modify, and analyze your code
- **Code Operations** - Let AI assistants create, edit files, and search through code
- **Debugging Integration** - AI assistants can help manage breakpoints and run configurations
- **Terminal Operations** - Allow AI assistants to run terminal commands and get results
- **Git Integration** - Check change status, commit history

## 🚀 Quick Start

### 1. Install the Extension

- Search for "ggMCP4VSCode" in the VS Code marketplace and install
- Or [click here to install](vscode:extension/bugstan.ggMCP4VSCode)

### 2. Recommended Setup

- Recommended to use with Claude Desktop and [MCPxHub](https://github.com/bugstan/MCPxHub) plugin for the best interactive experience

### 3. Verify Server Is Running

After installation, the MCP server automatically starts. Check the bottom-right status bar:

- **$(sync~spin) VSCode MCP Server** - Server is starting
- **$(zap) VSCode MCP Server** - Server is running
- **$(error) VSCode MCP Server** - Error occurred

Click on the status bar item to see details or restart the server.

### 4. Use with AI Assistants

When interacting with AI assistants that support the MCP protocol, you can now:
- Ask the assistant to look at your currently open files
- Request the assistant to modify code
- Have the assistant perform project tasks

## ⚙️ Configuration Options

Find all options by searching for "ggMCP" in VS Code settings:

- Port range
- Terminal timeout
- File auto-reload options

## 📄 Commands

- **MCP: Show Server Status** - View current server information
- **MCP: Restart Server** - Manually restart the MCP server

## 🔗 Links

- [GitHub Repository](https://github.com/bugstan/ggMCP4VSCode)
- [Report Issues](https://github.com/bugstan/ggMCP4VSCode/issues)
- [Model Context Protocol Specification](https://github.com/microsoft/model-context-protocol)

## 📝 License

[MIT](LICENSE)

---

### Detailed Documentation

For more technical details and API documentation, please visit our [GitHub repository](https://github.com/bugstan/ggMCP4VSCode).