# VSCode MCP 服务器 API 测试工具

这个目录包含了用于测试 VSCode MCP 服务器 API 的脚本。

## 配置文件

测试工具现在使用中央配置文件 `config.js` 来管理全局设置：

- 默认URL路径前缀 `/api/mcp/`
- 默认端口范围
- 控制台颜色设置
- 调试选项

如需修改全局配置，只需编辑 `config.js` 文件。

## 测试脚本说明

### 单独测试特定 API

每个测试脚本可以单独运行，用于测试特定的 API：

- `status.js` - 测试获取工作区状态（包含工作区路径）
- `get_open_in_editor_file_path.js` - 测试获取当前打开的文件路径
- `get_open_in_editor_file_text.js` - 测试获取当前打开的文件内容
- `get_selected_in_editor_text.js` - 测试获取当前选中的文本
- `get_all_open_file_paths.js` - 测试获取所有打开的文件路径
- `list_files_in_folder.js` - 测试目录列表功能
- `list_tools.js` - 测试获取可用工具列表
- `open_file_names.js` - 测试获取所有打开文件的文件名（包含两种方法）
- `get_file_text_by_path.js` - 测试通过路径获取文件内容
- `replace_file_text_by_path.js` - 测试通过路径替换文件内容
- `create_new_file_with_text.js` - 测试创建新文件并填充内容
- `find_files_by_name_substring.js` - 测试根据名称子字符串查找文件
- `search_in_files_content.js` - 测试在文件内容中搜索文本

### 运行所有测试

- `run-all-tests.js` - 运行所有测试

## 命令行参数

所有测试脚本都支持以下命令行参数：

- `--port=<端口号>` 或 `-p <端口号>` - 指定 MCP 服务器的端口号
  例如：`node test/status.js --port=9960`
  
对于 `list_files_in_folder.js` 脚本，还支持：

- `--path=<目录路径>` 或 `-d <目录路径>` - 指定要列出的目录路径
  例如：`node test/list_files_in_folder.js --path=/handlers`

## 使用示例

### 使用自动端口探测

```bash
# 运行所有测试
node test/run-all-tests.js

# 测试特定 API
node test/status.js
node test/get_open_in_editor_file_path.js
node test/list_files_in_folder.js --path=/utils
node test/list_tools.js
node test/open_file_names.js
```

### 指定端口号

```bash
# 运行所有测试，指定端口
node test/run-all-tests.js --port=9960

# 测试特定 API，指定端口
node test/status.js --port=9960
node test/list_tools.js --port=9960
```

## 接口路径格式

测试脚本使用统一的API路径格式：`/api/mcp/*`

例如：`http://localhost:9960/api/mcp/list_tools`

## 响应格式

所有 API 响应都使用标准的 MCP 响应格式：

成功响应：
```json
{
  "status": "操作结果",
  "error": null
}
```

错误响应：
```json
{
  "status": null,
  "error": "错误消息"
}
```

## 错误处理

测试脚本使用控制台的红色输出显示错误消息，使错误更加醒目：
- API错误响应显示为红色
- 请求失败显示为红色
- 测试脚本的异常显示为红色

## 调试提示

- 如果无法连接到服务器，请确保 VSCode 插件已安装并激活
- 默认情况下，服务器会在端口范围 9960-9990 中的第一个可用端口上运行
- 测试脚本会自动扫描端口范围以找到运行中的服务器
- 如果测试时出现响应解析错误，请检查 VSCode 输出面板中的日志
- 检查 `config.js` 文件中的设置是否正确配置