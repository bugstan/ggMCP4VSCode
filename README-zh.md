# ggMCP4VSCode

[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](https://github.com/bugstan/ggMCP4VSCode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/ggMCP4VSCode/blob/main/LICENSE)

为你的VSCode超级充能AI助手！这个扩展启用了模型上下文协议（Model Context Protocol, MCP）服务器，允许AI助手直接与你的VSCode环境交互。

![MCP服务器状态](https://raw.githubusercontent.com/bugstan/ggMCP4VSCode/main/images/status-bar.png)

## ✨ 主要特性

- **零配置** - 随VSCode启动自动启动
- **AI助手增强** - 使AI工具能够读取、修改和分析你的代码
- **代码操作** - 让AI助手创建、编辑文件并搜索代码
- **调试集成** - AI助手可以帮助管理断点和运行配置
- **终端操作** - 允许AI助手运行终端命令并获取结果（**现在支持在 VS Code 1.93+ 中捕获输出**）
- **Git集成** - 检查变更状态、提交历史

## 🆕 1.0.4版本新特性

- **终端Shell集成API支持** - 利用VS Code 1.93+的新Shell集成API
- **命令输出捕获** - AI助手现在可以执行命令并获取其输出
- **增强的终端工具** - 更好的终端文本访问和命令执行能力

## 🚀 快速开始

### 1. 安装扩展

- 在VS Code市场搜索"ggMCP4VSCode"并安装
- 或[点击此处安装](vscode:extension/bugstan.ggMCP4VSCode)

### 2. 推荐设置

- 推荐配合 Claude Desktop 和 [MCPxHub](https://github.com/bugstan/MCPxHub) 插件使用，以获得最佳交互体验
- **终端输出捕获功能需要 VS Code 1.93 或更高版本**

### 3. 验证服务器运行状态

安装后，MCP服务器会自动启动。查看右下角状态栏：

- **🔄 VSCode MCP服务器** - 服务器正在启动
- **⚡ VSCode MCP服务器** - 服务器正在运行
- **❌ VSCode MCP服务器** - 发生错误

点击状态栏项目可查看详情或重启服务器。

### 4. 使用AI助手

当与支持MCP协议的AI助手交互时，你现在可以：
- 要求助手查看你当前打开的文件
- 请求助手修改代码
- 让助手执行项目任务
- 执行终端命令并获取其输出（VS Code 1.93+）

## ⚙️ 配置选项

在VS Code设置中搜索"ggMCP"可找到所有选项：

- 端口范围
- 终端超时
- 输出捕获设置（VS Code 1.93+）
- 文件自动重载选项

## 📄 命令

- **MCP: 显示服务器状态** - 查看当前服务器信息
- **MCP: 重启服务器** - 手动重启MCP服务器

## 🔗 链接

- [GitHub仓库](https://github.com/bugstan/ggMCP4VSCode)
- [报告问题](https://github.com/bugstan/ggMCP4VSCode/issues)
- [模型上下文协议规范](https://github.com/microsoft/model-context-protocol)

## 📝 许可证

[MIT](LICENSE)

---

### 详细文档

欲获取更多技术细节和API文档，请访问我们的[GitHub仓库](https://github.com/bugstan/ggMCP4VSCode)。