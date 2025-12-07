# VSCode 扩展调试指南

本指南介绍如何调试 GG MCP for VSCode 扩展。

## 调试配置

项目提供了三种调试配置 (`.vscode/launch.json`)：

### 1. Extension - 调试扩展本身

这是主要的调试配置，用于在开发主机中调试扩展。

**使用方法**：
1. 按 `F5` 或点击 **Run > Start Debugging**
2. 选择 **"Extension"** 配置
3. VSCode 会打开一个新的 **Extension Development Host** 窗口
4. 在新窗口中，扩展会自动激活

**调试功能**：
- 在 `src/` 目录的 TypeScript 文件中设置断点
- 使用调试控制台查看日志
- 使用变量面板检查运行时状态

### 2. Extension Tests - 运行扩展测试

用于在 VSCode 环境中运行需要 VSCode API 的测试。

**使用方法**：
1. 按 `F5` 选择 **"Extension Tests"** 配置
2. 测试会在 Extension Development Host 中运行

### 3. Unit Tests (Node) - 运行纯单元测试

用于运行不依赖 VSCode API 的单元测试。

**使用方法**：
1. 按 `F5` 选择 **"Unit Tests (Node)"** 配置
2. 测试会在集成终端中运行

## 调试步骤

### 调试扩展代码

1. **设置断点**
   - 打开 `src/` 目录下的任意 TypeScript 文件
   - 点击行号左侧设置断点（红点）

2. **启动调试**
   - 按 `F5` 启动调试
   - 等待 Extension Development Host 窗口打开

3. **触发断点**
   - 在 Extension Development Host 中执行操作
   - 例如：使用 AI 助手调用 MCP 工具
   - 当执行到断点时，调试器会暂停

4. **检查状态**
   - 使用 **Variables** 面板查看变量
   - 使用 **Watch** 面板添加监视表达式
   - 使用 **Call Stack** 查看调用堆栈

### 调试 HTTP 请求

1. 在以下文件设置断点：
   - `src/server/mcpService.ts` - HTTP 请求入口
   - `src/server/requestHandler.ts` - 请求处理
   - `src/server/responseHandler.ts` - 响应处理

2. 使用测试脚本发送请求：
   ```bash
   node test/list_tools.js --port=9960
   ```

### 调试工具执行

1. 在工具文件中设置断点：
   - `src/tools/fileReadWriteTools.ts`
   - `src/tools/editorTools.ts`
   - `src/tools/terminalTools.ts`
   - 等等...

2. 在基类中设置断点：
   - `src/types/absTools.ts` - `handle()` 方法
   - `src/types/absFileTools.ts` - 文件操作方法

## 运行测试

### 运行所有集成测试（需要运行中的服务器）

```bash
# 首先启动扩展（F5），然后：
npm test
```

### 运行单元测试

```bash
# 不需要启动扩展
npm run compile
node test/unit-tests.js
```

### 运行单个测试

```bash
node test/list_tools.js --port=9960
node test/list_files_in_folder.js --port=9960
```

## 日志调试

### 查看调试日志

1. 在 Extension Development Host 中：
   - 按 `Ctrl+Shift+U` 打开输出面板
   - 选择 **GG MCP for VSCode** 输出通道

2. 日志级别配置（`settings.json`）：
   ```json
   {
       "ggMCP.enableLogging": true
   }
   ```

### 代码中添加日志

```typescript
// 使用模块专用日志器
import { Logger } from '../utils/logger';
const log = Logger.forModule('MyModule');

log.debug('调试信息', { data });
log.info('一般信息');
log.warn('警告信息');
log.error('错误信息', error);
```

## 常见调试场景

### 场景 1：调试工具执行

1. 在 `src/types/absTools.ts` 的 `handle()` 方法设置断点
2. 启动调试 (`F5`)
3. 使用 AI 助手调用任意工具
4. 断点命中后，步入 (`F11`) 查看工具执行流程

### 场景 2：调试缓存问题

1. 在 `src/server/cache/cacheManager.ts` 设置断点
2. 在相关工具操作后检查缓存状态

### 场景 3：调试拦截器

1. 在 `src/server/interceptors/interceptorChain.ts` 设置断点
2. 观察拦截器链的执行顺序

### 场景 4：调试配置问题

1. 在 `src/config/defaults.ts` 查看默认值
2. 在 `src/config/index.ts` 查看配置加载逻辑

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F5` | 启动调试 |
| `Shift+F5` | 停止调试 |
| `Ctrl+Shift+F5` | 重启调试 |
| `F9` | 切换断点 |
| `F10` | 单步跳过 |
| `F11` | 单步进入 |
| `Shift+F11` | 单步跳出 |
| `F6` | 暂停 |

## 提示

1. **热重载**：修改 TypeScript 代码后需要重新编译（`npm run compile`）或重启调试
2. **Watch 模式**：使用 `npm run watch` 自动编译修改
3. **源映射**：确保 `tsconfig.json` 中 `sourceMap: true` 以支持 TypeScript 调试
