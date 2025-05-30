# 🛠️ 工具和测试脚本目录

这个目录包含了API测试工具的各种辅助工具、测试脚本和调试工具。

## 📁 目录结构

```
tools/
├── README.md                    # 本文档
├── example-config.json          # 示例配置文件
├── debug/                       # 调试工具
│   ├── debug-data-flow.html     # 数据流调试工具
│   └── debug-storage.html       # 存储调试工具
├── test/                        # 测试工具
│   ├── test-new-features.html   # 新功能测试页面
│   ├── test-new-features-demo.js # 新功能演示脚本
│   ├── test-api-fix.html        # API修复测试工具
│   ├── quick-test.html          # 快速测试工具
│   ├── test-data.html           # 测试数据工具
│   └── test-persistence.js      # 数据持久化测试
└── fix/                         # 修复工具
    └── fix-testing-panel.js     # TestingPanel修复脚本
```

## 🔧 工具使用指南

### 调试工具 (debug/)

#### debug-data-flow.html
- **用途**：诊断数据流问题，检查提示词和模型加载
- **使用**：直接在浏览器中打开，点击相应按钮进行诊断
- **适用场景**：TestingPanel无法选择提示词/模型时

#### debug-storage.html
- **用途**：检查和管理localStorage中的数据
- **功能**：查看、编辑、导出、导入、清空存储数据
- **适用场景**：数据丢失、数据格式错误、备份恢复### 测试工具 (test/)

#### test-new-features.html
- **用途**：验证新增功能的完整性
- **功能**：展示多用户输入、复制按钮、统计显示等新功能
- **使用**：在浏览器中打开查看功能说明和演示

#### test-new-features-demo.js
- **用途**：在控制台演示新功能
- **使用**：
  ```javascript
  // 在浏览器控制台运行
  runNewFeaturesDemo();
  ```

#### test-api-fix.html
- **用途**：测试API停止按钮和第三方兼容性修复
- **功能**：模拟API请求，测试停止功能和URL路径处理
- **适用场景**：验证API修复是否生效

#### quick-test.html
- **用途**：快速验证基本功能
- **功能**：创建测试数据、验证数据读取、确认功能正常
- **适用场景**：快速检查应用状态

#### test-data.html
- **用途**：创建和管理测试数据
- **功能**：生成示例提示词、API配置、模型数据
- **适用场景**：初始化测试环境

#### test-persistence.js
- **用途**：测试数据持久化功能
- **使用**：在控制台运行测试数据存储和读取

### 修复工具 (fix/)

#### fix-testing-panel.js
- **用途**：自动修复TestingPanel数据加载问题
- **使用**：
  ```javascript
  // 在浏览器控制台粘贴全部内容并执行
  // 脚本会自动诊断并修复问题
  ```
- **适用场景**：TestingPanel页面无法正常显示数据

### 配置文件

#### example-config.json
- **用途**：提供标准的配置文件模板
- **内容**：包含API配置、模型配置的示例格式
- **使用**：参考格式创建自己的配置## 🚀 快速开始

### 新用户首次使用
1. 运行 `test/test-data.html` 创建初始数据
2. 打开主应用验证功能
3. 如有问题，使用 `debug/debug-data-flow.html` 诊断

### 遇到问题时
1. **数据丢失**：使用 `debug/debug-storage.html` 检查存储
2. **功能异常**：使用 `fix/fix-testing-panel.js` 修复
3. **API问题**：使用 `test/test-api-fix.html` 测试

### 验证新功能
1. 打开 `test/test-new-features.html` 查看功能说明
2. 在控制台运行 `test/test-new-features-demo.js`
3. 在主应用中实际测试功能

## 📝 维护说明

### 添加新工具
1. 将工具文件放入对应的子目录
2. 更新此README文档
3. 在主README中添加引用

### 文件命名规范
- 调试工具：`debug-*.html`
- 测试工具：`test-*.html` 或 `test-*.js`
- 修复工具：`fix-*.js`
- 配置文件：`*.json`

## 🔗 相关文档

- 📖 [主要使用指南](../docs/使用指南.md)
- 🔧 [快速修复指南](../docs/快速修复指南.md)
- 🚀 [新功能使用指南](../docs/新功能使用指南.md)
- 🐛 [故障排除指南](../docs/TROUBLESHOOTING.md)

## ⚠️ 注意事项

1. **浏览器兼容性**：建议使用Chrome、Firefox等现代浏览器
2. **安全性**：工具中的API Key仅用于测试，请勿使用真实密钥
3. **数据备份**：使用工具前建议备份重要数据
4. **权限要求**：某些工具需要剪贴板权限或文件访问权限

有问题请查看 `../docs/` 目录下的相关文档或提交issue。