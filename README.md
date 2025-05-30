# API Testing Tool - 接口测试工具

一款专注于验证不同提示词 (Prompts) 对大语言模型 (LLM) 多次调用同一内容时输出结果差异的辅助工具，旨在帮助用户优化和筛选最佳提示词。

## 🎯 产品目标

- **核心目标：** 方便用户通过批量测试，直观对比不同提示词在相同用户输入下，多次请求大语言模型后输出结果的一致性、多样性及质量差异。
- **辅助目标：**
  - 提高提示词工程 (Prompt Engineering) 的效率
  - 简化 API 密钥和模型配置的管理
  - 提供美观易用的跨平台用户体验

## 🌟 核心功能

### 测试执行与配置
- ✅ 支持单个或批量用户输入
- ✅ 提示词选择和管理
- ✅ 模型选择和配置
- ✅ 可配置的测试参数（重复次数、发送间隔）
- ✅ 实时结果展示
- ✅ 测试进度跟踪

### 数据管理与导出
- ✅ 提示词管理（增删改查）
- ✅ API 配置管理（支持 OpenAI 兼容接口）
- ✅ 模型管理
- ✅ 结果导出（Excel/CSV）
- ✅ 结果复制到剪贴板

### 用户体验
- ✅ 现代化界面设计
- ✅ 跨平台支持（Windows/macOS）
- ✅ 清晰的状态反馈
- ✅ 错误处理和提示

## 🚀 快速开始

### 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

这将同时启动 React 开发服务器和 Electron 应用。

### 构建应用

```bash
npm run build
```

### 打包桌面应用

```bash
npm run dist
```

打包后的应用将在 `release` 目录中。

## 📖 使用指南

### 1. 配置 API

1. 打开应用，切换到"API配置"标签页
2. 点击"新建API配置"
3. 填写配置信息：
   - 配置名称：便于识别的名称
   - API Key：您的 API 密钥
   - 请求地址：API 服务地址（如：https://api.openai.com/v1）
4. 点击"测试"按钮验证配置是否正确
5. 保存配置

### 2. 创建模型

1. 切换到"模型管理"标签页
2. 点击"新建模型"
3. 填写模型信息：
   - 模型名称：如 gpt-3.5-turbo、gpt-4 等
   - 关联API配置：选择之前创建的 API 配置
4. 保存模型

### 3. 管理提示词

1. 切换到"提示词管理"标签页
2. 点击"新建提示词"
3. 填写提示词信息：
   - 提示词名称：便于识别的名称
   - 提示词内容：具体的提示词文本
4. 保存提示词

### 4. 执行测试

1. 切换到"接口测试"标签页
2. 在"用户输入"区域输入测试内容（每行一个输入）
3. 选择要使用的提示词和模型
4. 设置测试参数：
   - 重复次数：每个输入重复测试的次数
   - 间隔时间：每次请求之间的延迟（秒）
5. 点击"开始测试"
6. 查看实时测试结果

### 5. 导出结果

测试完成后，您可以：
- 点击"导出Excel"将结果保存为 Excel 文件
- 点击"导出CSV"将结果保存为 CSV 文件
- 点击"复制结果"将结果复制到剪贴板
- 点击表格中的"查看"按钮查看详细结果

## 🛠️ 技术栈

- **前端框架：** React 18 + TypeScript
- **桌面应用：** Electron
- **UI 组件库：** Ant Design
- **样式框架：** Tailwind CSS
- **本地存储：** Electron Store
- **HTTP 客户端：** Axios
- **Excel 导出：** xlsx

## 📁 项目结构

```
api_res_tools/
├── electron/                 # Electron 主进程代码
│   └── main.ts              # 主进程入口文件
├── src/                     # React 应用源代码
│   ├── components/          # React 组件
│   │   ├── TestingPanel.tsx # 测试面板组件
│   │   ├── PromptsManagement.tsx # 提示词管理组件
│   │   ├── ApiConfigManagement.tsx # API配置管理组件
│   │   └── ModelsManagement.tsx # 模型管理组件
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   ├── storage.ts       # 本地存储工具
│   │   ├── api.ts          # API 调用工具
│   │   └── export.ts       # 导出工具
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 应用样式
│   └── index.tsx           # React 入口文件
├── public/                  # 静态资源
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── tsconfig.electron.json  # Electron TypeScript 配置
└── tailwind.config.js      # Tailwind CSS 配置
```

## 🧑‍💻 用户画像

- **提示词工程师：** 需要测试和迭代不同提示词的效果
- **AI 应用开发者：** 在应用中集成 LLM，需要验证提示词的稳定性和效果
- **内容创作者/营销人员：** 使用 LLM 生成内容，希望找到最优的提示词组合
- **研究人员：** 研究 LLM 行为，需要工具进行可复现的实验

## 📝 用户故事示例

**角色：** AI 应用产品经理

**需求：** 我有十个不同的英文用户咨询案例，我想针对这些案例测试我预设的一个"客服机器人v2"提示词的效果。我希望每个案例都能在 `gpt-4` 模型上重复测试5遍，每次测试之间间隔3秒，以便观察输出的稳定性和多样性。

**解决方案：**
1. 在工具中输入或粘贴十个英文案例
2. 从预存的提示词列表中选择"客服机器人v2"
3. 选择配置好的 `gpt-4` 模型
4. 设置每个案例重复测试5遍，间隔3秒
5. 点击"开始测试"，实时查看每个案例、每次测试的输出结果
6. 测试完成后，复制所有结果或导出为 Excel 表格进行分析

## 🔒 安全性

- API Key 等敏感信息使用 Electron Store 安全存储在本地
- 不会将敏感信息传输到不必要的外部服务
- 支持密码输入框隐藏 API Key 显示

## 🚀 未来扩展方向

- [ ] 支持更多类型的 LLM API（不仅仅是 OpenAI 兼容的）
- [ ] 结果对比视图：更直观地对比不同提示词/模型对同一输入的输出
- [ ] 测试结果的统计分析：计算输出文本的相似度、长度等指标
- [ ] 模板变量功能：在用户输入或提示词中使用变量，进行组合测试
- [ ] 测试会话保存与加载：保存当前的测试配置和结果

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看本 README 文档
2. 检查控制台错误信息
3. 提交 Issue 描述问题详情 ## 📁 项目目录结构

```
api_res_tools/
├── README.md                    # 主说明文档
├── package.json                 # 项目配置和依赖
├── src/                         # 源代码目录
│   ├── components/              # React组件
│   ├── types/                   # TypeScript类型定义
│   ├── utils/                   # 工具函数
│   └── App.tsx                  # 主应用组件
├── electron/                    # Electron主进程代码
├── public/                      # 静态资源
├── scripts/                     # 构建脚本
│   ├── build-and-package.bat   # Windows构建脚本
│   └── build-and-package.sh    # Linux/macOS构建脚本
├── docs/                        # 📚 文档目录
│   ├── README.md                # 文档目录说明
│   ├── 使用指南.md              # 详细使用指南
│   ├── 新功能使用指南.md        # 新功能说明
│   ├── 快速修复指南.md          # 问题修复指南
│   ├── TROUBLESHOOTING.md       # 故障排除
│   ├── 解决方案指南.md          # 解决方案汇总
│   ├── 项目总结.md              # 项目开发总结
│   └── 修复总结.md              # 问题修复总结
└── tools/                       # 🛠️ 工具目录
    ├── README.md                # 工具使用说明
    ├── example-config.json      # 配置示例
    ├── debug/                   # 调试工具
    │   ├── debug-data-flow.html # 数据流调试
    │   └── debug-storage.html   # 存储调试
    ├── test/                    # 测试工具
    │   ├── test-new-features.html     # 新功能测试
    │   ├── test-new-features-demo.js  # 新功能演示
    │   ├── test-api-fix.html          # API修复测试
    │   ├── quick-test.html            # 快速测试
    │   ├── test-data.html             # 测试数据
    │   └── test-persistence.js        # 持久化测试
    └── fix/                     # 修复工具
        └── fix-testing-panel.js # TestingPanel修复
```

## 📖 文档和工具说明

### 📚 文档目录 (docs/)
包含完整的使用指南、故障排除、新功能说明等文档：

- **新用户**：先阅读 `docs/使用指南.md`
- **新功能**：查看 `docs/新功能使用指南.md` 了解最新功能
- **遇到问题**：参考 `docs/快速修复指南.md` 和 `docs/TROUBLESHOOTING.md`

### 🛠️ 工具目录 (tools/)
包含各种调试、测试和修复工具：

- **调试问题**：使用 `tools/debug/` 目录下的工具
- **测试功能**：运行 `tools/test/` 目录下的测试脚本
- **修复问题**：使用 `tools/fix/` 目录下的修复脚本

### 🚀 快速开始
1. 如果是新用户，先查看 [docs/使用指南.md](docs/使用指南.md)
2. 如果遇到问题，参考 [docs/快速修复指南.md](docs/快速修复指南.md)
3. 了解新功能，阅读 [docs/新功能使用指南.md](docs/新功能使用指南.md)
4. 如需调试，使用 [tools/](tools/) 目录下的相关工具

## 🚀 未来扩展方向