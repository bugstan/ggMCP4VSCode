# 更新日志

本项目的所有重大更改都将记录在此文件中。

## [1.3.0] - 2024-12-09
### 变更
- **用户体验**: 将服务器启动、重试和手动重启的模态对话框替换为状态栏消息。
- **端口管理**: 添加了运行时端口黑名单和自动缓存清除机制以解决端口冲突问题。
- **UI**: 状态栏现在显示活动的服务器端口号。
- **依赖**: 更新 `@types/node` 至 ^20.19.25，`typescript` 至 ^5.9.3，`@vscode/vsce` 至 ^3.7.1。

## [1.2.4] - 2024-12-08

### 变更
- **优化**: 移除了 ESLint 以简化开发流程，依赖 TypeScript 进行检查。
- **修复**: 修复了 `replace_file_content_at_position` 工具中的 CRLF 换行符问题。
- **修复**: 更新并修复了过期的测试脚本（如 `rewrite_file_content_test.js`）。
- **文档**: 标准化文档结构（将中文文档移至 `docs/`），并添加 `RULES.md`。

## [1.2.1] - 2024-12-07

### 文档
- 更新 README，更清晰地支持 Antigravity, Cursor, 和 Windsurf
- 改进 package.json 中的 SEO 关键词，提高可发现性

## [1.2.0] - 2024-12-07

### 新增
- 新增 `replace_specific_text` 工具，用于替换文件中的特定文本
- 新增 `append_file_content` 工具，用于向文件追加内容
- 新增 `rewrite_file_content` 工具，用于完全重写文件内容
- 新增 `run_command_on_background` 工具，用于在后台执行命令
- 新增 `get_terminal_info` 工具，用于检索终端和操作系统信息
- 新增 `execute_os_specific_command` 工具，用于特定平台的命令执行
- 新增 Git 高级工具：`get_file_history`, `get_file_diff`, `get_branch_info`, `get_commit_details`, `commit_changes`, `pull_changes`, `switch_branch`, `create_branch`
- 文件缓存机制，提高性能

### 变更
- 重写 INTERFACE.md 文档，包含所有 44 个工具
- 添加包含请求/响应示例的全面 API 文档
- 添加工具摘要表供快速参考
- 更新 README，包含新功能和改进的清晰度
- **重构魔术数字**: 将所有硬编码的阈值和限制集中到 `config/defaults.ts` 中的 `Defaults.Thresholds` 和 `Defaults.Limits`
- 迁移 8 个文件中的阈值以使用集中配置
- 减少日志冗余，将许多高频 `log.info()` 改为 `log.debug()`
- 在 `src/types/gitTypes.ts` 中添加 `GitRepository` 和相关 Git 类型，用于类型安全的 Git 操作
- 更新所有 Git 工具以使用 `GitRepository` 类型而不是 `any`
- **破坏性变更：符合 MCP 的响应格式**: 将 `Response` 类型从 `{status, error}` 完全重构为 MCP 标准 `{content: McpContent[], isError}` 格式
- 添加支持 text, image, audio, resource_link, 和 resource 内容类型的 `McpContent` 接口
- ResponseHandler 的 `success()` 和 `failure()` 方法现在返回符合 MCP 标准的响应
- **破坏性变更：JSON-RPC 2.0 协议**: 完全重写 MCPService 以实现标准 JSON-RPC 2.0 协议
- 实现 MCP 方法：`initialize`, `tools/list`, `tools/call`, `notifications/initialized`, `notifications/cancelled`
- 所有请求现在使用 JSON-RPC 2.0 格式的 POST：`{"jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1}`

### 修复
- 改进跨平台路径处理，使用 `pathInProject` 参数
- 增强错误处理和响应一致性
- 修复 AbsTools.handle() 中的死代码（if-else 分支相同）
- 修复正常操作日志的错误日志级别（debug 误用 error）
- 修复文件写入中的异步操作未等待完成，确保缓存一致性
- 移除 AbsFileTools 中未使用的 EventEmitter 代码，降低复杂度
- 将高频缓存和拦截器日志从 info 更改为 debug 级别
- 通过幂等初始化修复潜在的重复拦截器注册
- 为 ResponseHandler 添加 `successRaw()` 方法，以清晰说明序列化行为

### 安全 (MCP 合规)
- **本地主机绑定**: 服务器现在仅绑定到 `127.0.0.1` 而不是所有接口，遵循 [MCP 安全指南](https://modelcontextprotocol.io/docs/concepts/transports#security-warning)
- **Origin 验证**: 添加 Origin 头验证以防止 DNS 重绑定攻击
- **改进的 CORS**: CORS 头现在反映实际请求来源，而不是通配符 `*`
- **工具接口合规**: 根据 MCP 规范向 McpTool 接口添加 `title` 和 `annotations` 可选字段
- **工具列表响应**: 现在包含 `title` 字段（如果未提供则从 name 自动生成）和 `annotations`（如果存在）

## [1.1.1] - 2025-03-30

### 新增
- 更新显示名称为 "GG MCP for VSCode" 以提高清晰度
- 增强 README，包含 Claude Desktop 集成细节

### 变更
- 更新文档以反映新的显示名称
- 改进中文本地化支持

## [1.1.0] - 2025-03-26

### 新增
- 项目重构：引入基类抽象，实现缓存机制，显著提高性能和效率

## [1.0.5] - 2025-03-25

### 新增
- 实现全面的工具基类系统，以更好地组织工具
- 为每个工具类别（File, Editor, Terminal, Code, Debug, Git）创建专用基类
- 跨所有工具添加统一的错误处理和日志记录
- 引入 `toolBases.ts` 以简化工具基类导入

### 变更
- 重构并标准化基类命名约定
- 修复与 Logger 使用相关的 TypeScript 类型错误
- 提高基类实现的类型安全性
- 更新接口文档以反映新的工具组织

### 修复
- 解决 Logger 使用中的属性访问 TypeScript 错误
- 修复潜在的未定义属性访问错误
- 改进工具执行中的错误隔离

## [1.0.4] - 2025-03-24

### 新增
- 增加对 VS Code 1.93+ Terminal Shell Integration API 的支持
- 新增 `execute_command_with_output` 工具，用于捕获命令行输出
- 增强 `get_terminal_text` 工具，使用 Shell Integration API 检索终端内容
- 添加终端输出相关的配置选项

### 变更
- 改进带有超时处理的终端命令执行
- 优化输出捕获机制，增加最大输出行限制

## [1.0.3] - 2025-03-23

### 新增
- 增加更多对 VSCode 扩展开发的支持
- 增强工具类型定义和错误处理

### 变更
- 优化服务器启动流程
- 提高代码稳定性和性能

## [1.0.0] - 2025-03-22

### 新增
- 本地化支持，包含中文 README 和 CONTRIBUTING 文件
- 自动化 README 版本更新脚本
- 增强开发和打包工作流
- 改进项目配置管理

### 变更
- 标准化 package.json 中的项目脚本
- 更新开发依赖
- 优化 .gitignore 和 .vscodeignore 配置

### 修复
- 解决潜在的跨平台脚本兼容性问题

## [0.2.0] - 2025-03-21

### 新增
- 初始 GitHub 仓库发布
- 支持超过 30 个 VSCode API 工具接口
- 自动端口扫描和分配
- 服务器状态管理 UI

### 变更
- 优化服务器启动流程
- 改进错误处理机制

### 修复
- 修复终端命令执行中的超时问题

## [0.1.0] - 未发布

### 新增
- 初始版本的基本功能
- 基本 MCP 协议实现
- 基本文件和编辑器操作功能
