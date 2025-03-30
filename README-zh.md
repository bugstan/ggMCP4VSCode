# GG MCP for VSCode

[![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)](https://github.com/bugstan/gg-mcp-for-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bugstan/gg-mcp-for-vscode/blob/main/LICENSE)

VSCode AI 助手!这个扩展启用了一个模型上下文协议(MCP)服务器,允许 AI 助手直接与您的 VSCode 环境交互。

![MCP Server Status](https://raw.githubusercontent.com/bugstan/gg-mcp-for-vscode/main/images/status-bar.png)

## ✨ 主要特性

- **零配置** - 随 VSCode 启动自动开始
- **增强 AI 助手** - 使 AI 工具能够阅读、修改和分析您的代码
- **代码操作** - 让 AI 助手创建、编辑文件,并搜索代码
- **调试集成** - AI 助手可以帮助管理断点和运行配置
- **终端操作** - 允许 AI 助手运行终端命令并获取结果
- **Git 集成** - 检查变更状态、提交历史
- **兼容 Claude Desktop** - 与 Claude Desktop 完全兼容,实现 AI 驱动的自动化开发

## 🆕 1.1.2 版新功能

- **新的显示名称** - 重命名为 "GG MCP for VSCode",以提高清晰度和识别度
- **改进的路径处理** - 通过新的 `pathInProject` 参数实现更好的跨平台兼容性和路径标准化
- **命令输出捕获** - AI 助手现在可以执行命令并获取其输出
- **增强的终端工具** - 更好的终端文本访问和命令执行
- **文件局部替换接口** - 添加了新的 `replace_specific_text` API,用于替换文件中的特定文本
    - 提供在本地替换特定代码内容的能力
    - 支持在单行或多行内替换文本
    - 保留原始格式(如换行符和缩进)
- **文件缓存机制** - 引入了高效的文件缓存系统,以提高性能并减少冗余的文件读取

## 🚀 快速开始

### 1. 安装扩展

- 在 VS Code 市场中搜索 "GG MCP for VSCode" 并安装
- 或者 [点击此处安装](vscode:extension/bugstan.gg-mcp-for-vscode)

### 2. 推荐设置

- **Claude Desktop 集成**: 本扩展与 Claude Desktop 完全兼容,允许您:
    - 接受并执行来自 Claude 的开发指令
    - 通过 Claude 的 AI 能力实现自动化编码辅助
    - 让 Claude 在适当的权限下直接读取和修改您的代码库
- **MCPxHub**: 为获得更好的体验,请与 [MCPxHub](https://github.com/bugstan/MCPxHub) 插件一起使用

### 3. 验证服务器是否正在运行

安装后,MCP 服务器会自动启动。查看右下角状态栏:

- **🔄 MCP Server** - 服务器正在启动
- **⚡ MCP Server** - 服务器正在运行
- **❌ MCP Server** - 发生错误

单击状态栏项以查看详细信息或重新启动服务器。

### 4. 与 AI 助手一起使用

当与支持 MCP 协议的 AI 助手(如 Claude Desktop)交互时,您现在可以:

- 要求助手查看您当前打开的文件
- 请求助手修改代码
- 让助手执行项目任务
- 让 Claude 根据您的需求自动开发功能
- 执行终端命令并获取其输出

## 💻 使用 Claude Desktop 进行自动化开发

借助 GG MCP for VSCode 和 Claude Desktop,您可以:

- 指示 Claude 分析您的整个代码库
- 让 Claude 自动实现新功能或修复错误
- 要求 Claude 在保持功能的同时重构代码
- 让 Claude 对您的代码架构提出改进建议
- 使用自然语言描述编码任务,让 Claude 处理实现

## ⚙️ 配置选项

### 文件缓存

该扩展现在包含一个智能文件缓存机制:
- 减少文件系统读取操作
- 提高重复文件访问的性能
- 文件修改时自动使缓存失效
- 可在扩展设置中进行配置

在 VS Code 设置中搜索 "ggMCP" 以找到所有选项:

- 端口范围
- 终端超时
- 文件自动重新加载选项
- 文件缓存行为

## 📄 命令

- **MCP: Show Server Status** - 查看当前服务器信息
- **MCP: Restart Server** - 手动重启 MCP 服务器

## 🔗 链接

- [GitHub Repository](https://github.com/bugstan/gg-mcp-for-vscode)
- [Report Issues](https://github.com/bugstan/gg-mcp-for-vscode/issues)
- [Model Context Protocol Specification](https://github.com/microsoft/model-context-protocol)

## 📝 许可

[MIT](LICENSE)

--- 

### 详细文档

欲了解更多技术细节和 API 文档,请访问我们的 [GitHub 仓库](https://github.com/bugstan/gg-mcp-for-vscode)。