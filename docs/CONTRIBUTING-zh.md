# 贡献指南

非常感谢您对ggMCP4VSCode的关注！我们欢迎并鼓励社区成员参与到项目的开发和改进中。本文档将指导您如何为该项目做出贡献。

## 行为准则

参与本项目的所有贡献者都应遵循开源社区的基本行为准则：
- 尊重所有项目参与者
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情

## 如何贡献

### 提交问题(Issues)

如果您发现bug或有新功能建议，欢迎通过GitHub Issues提交：

1. 使用我们提供的Issue模板
2. 清晰描述问题或建议
3. 提供复现步骤（如适用）
4. 添加相关日志和截图（如适用）
5. 说明您的环境（VSCode版本、操作系统等）

### 提交代码

如果您想直接贡献代码，请遵循以下步骤：

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 将您的更改推送到分支 (`git push origin feature/amazing-feature`)
5. 提交Pull Request

### 开发环境设置

1. 克隆仓库：
   ```bash
   git clone https://github.com/n2ns/ggMCP4VSCode.git
   cd ggMCP4VSCode
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 编译代码：
   ```bash
   npm run compile
   ```

4. 调试：
   在VSCode中按F5启动一个新的VSCode窗口进行调试。

### 代码风格指南

- 遵循TypeScript的官方风格指南
- 所有新代码必须有适当的注释
- 保持代码简洁和可读性
- 遵循现有的项目结构

## Pull Request流程

1. 确保您的PR描述清晰地说明了更改内容和原因
2. 如果PR与某个Issue相关，请在PR描述中引用该Issue
3. 更新相关文档（如README.md）
4. 所有CI检查必须通过
5. 需要通过代码审查后才能合并

## 发布流程

项目维护者负责发布新版本，流程如下：

1. 更新版本号（遵循语义化版本规范）
2. 更新CHANGELOG.md
3. 创建发布分支
4. 创建标签和GitHub Release
5. 发布到VSCode扩展市场

## 感谢

再次感谢您对项目的贡献！您的参与对于改进ggMCP4VSCode至关重要。

如有任何问题，请通过GitHub Issues联系我们。
