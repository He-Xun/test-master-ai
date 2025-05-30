# API Testing Tool - 接口测试工具

一款专注于验证不同提示词 (Prompts) 对大语言模型 (LLM) 多次调用同一内容时输出结果差异的辅助工具，帮助用户优化和筛选最佳提示词。

## 🎯 产品目标
- 方便用户通过批量测试，直观对比不同提示词在相同输入下多次请求大语言模型后的输出差异。
- 提高提示词工程效率，简化API密钥和模型配置管理。
- 提供美观易用的跨平台桌面体验。

## 🌟 主要功能
- 批量输入测试、提示词和模型选择、可配置重复次数与间隔、实时结果展示
- 提示词和API配置管理，支持OpenAI兼容接口
- 结果导出（Excel/CSV）、复制、历史记录管理
- 现代化UI，支持中英文切换，API Key安全隐藏
- 本地用户数据隔离，默认头像本地化

## 🚀 快速开始

### 环境要求
- Node.js 16+，npm/yarn

### 安装依赖
```bash
npm install
```

### 启动开发环境
```bash
npm run dev
```

### 构建与打包
```bash
npm run build
npm run dist
```
打包产物在release目录。

## 📖 基本使用
1. 配置API：在"API配置"页面添加API Key和Base URL，获取并选择模型。
2. 管理提示词：在"提示词管理"页面添加和编辑提示词。
3. 执行测试：在"接口测试"页面选择提示词、模型，输入内容，设置参数后开始测试。
4. 查看与导出结果：支持Excel/CSV导出和复制。

## 🛠️ 技术栈
- React 18 + TypeScript
- Electron
- Ant Design + Tailwind CSS
- Axios, xlsx

## 📁 目录结构
- electron/ 主进程
- src/ 前端源码
- public/ 静态资源
- release/ 打包产物
- dev-management/ 文档与日志

## 🔒 安全性
- API Key等敏感信息本地安全存储，输入框默认隐藏
- 用户数据隔离，支持多用户

## 📝 版本
- 当前版本：1.3.2
- 详细更新日志见 RELEASE-NOTES.md

## 📄 许可证
GPL

## 🤝 贡献
欢迎提交 Issue 和 Pull Request 改进本项目。

## 📞 支持
如有问题请查阅文档或提交 Issue。
