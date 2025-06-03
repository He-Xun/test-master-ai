# 📋 版本更新指南

> 简洁实用的版本管理和文档更新指南

## 🎯 版本更新清单

### 核心文件更新
- [ ] `package.json` - 更新version字段
- [ ] `README.md` - 更新版本信息和发布时间
- [ ] `RELEASE-NOTES.md` - 添加新版本条目
- [ ] `PROJECT_OVERVIEW.md` - 更新产品信息中的版本号

### 版本号规则
- **主版本 (X.0.0)**: 重大功能变更或不兼容更新
- **次版本 (x.Y.0)**: 新功能添加，向后兼容
- **修订版 (x.y.Z)**: 问题修复和小优化

## 📁 项目文件结构

### ✅ 标准目录结构
```
test-master-ai/
├── README.md                    # 项目说明
├── RELEASE-NOTES.md              # 发布说明
├── PROJECT_OVERVIEW.md           # 项目概述
├── VERSION-UPDATE-GUIDE.md       # 本文档
├── package.json                 # 项目配置
├── LICENSE                      # 许可证
├── .gitignore                   # Git忽略文件
├── src/                         # 源代码
├── electron/                    # Electron主进程
├── public/                      # 静态资源
├── release/                     # 打包输出
├── scripts/                     # 构建脚本
├── tools/                       # 开发工具
├── docs/                        # 项目文档
└── dev-management/              # 开发管理
    ├── changelog/               # 版本更新日志
    ├── summaries/               # 总结文档
    ├── templates/               # 文档模板
    └── working-notes/           # 工作笔记
```

### 🚫 保持根目录整洁
**禁止在根目录创建：**
- 临时总结文件 (xxx总结.md)
- 工作笔记文件
- 调试记录文件
- 测试文档文件

## 🔄 版本更新流程

### 1. 准备阶段
```bash
# 确定新版本号
NEW_VERSION="1.x.x"

# 获取当前时间
RELEASE_DATE=$(date +"%Y-%m-%d")
```

### 2. 更新版本号
```json
// package.json
{
  "version": "1.x.x"
}
```

### 3. 更新文档
```markdown
// README.md - 版本信息部分
- **当前版本**: v1.x.x
- **发布时间**: 2025年x月x日

// PROJECT_OVERVIEW.md - 产品信息部分
- **当前版本**: v1.x.x
```

### 4. 创建发布说明
在`RELEASE-NOTES.md`顶部添加：
```markdown
## v1.x.x - 版本描述 (2025-xx-xx)

### 🌟 新增功能
- 功能1描述
- 功能2描述

### 🐛 问题修复
- 修复问题1
- 修复问题2

### 🛠️ 技术改进
- 技术改进1
- 技术改进2
```

### 5. 创建详细日志 (可选)
```bash
# 在changelog目录创建
dev-management/changelog/2025-xx-xx-v1.x.x-功能描述.md
```

## 📝 文档管理规范

### 文档分类
- **根目录**: 仅保留核心项目文档
- **docs/**: 用户文档和指南
- **dev-management/**: 开发相关文档
  - **changelog/**: 版本更新记录
  - **summaries/**: 功能总结文档
  - **working-notes/**: 开发笔记和临时文档

### 文档命名规范
```bash
# 版本日志
2025-01-19-v1.0.0-initial-release.md

# 功能总结
feature-name-summary.md

# 工作笔记
YYYY-MM-DD-work-notes.md
```

## ⚡ 快速更新脚本

### 基本更新命令
```bash
# 更新package.json版本
npm version patch  # 修订版本 +0.0.1
npm version minor  # 次版本 +0.1.0
npm version major  # 主版本 +1.0.0
```

### 构建和发布
```bash
# 构建应用
npm run build

# 打包桌面应用
npm run dist

# 打包完成后检查release目录
ls -la release/
```

## ✅ 发布前检查

- [ ] 所有文件中版本号一致
- [ ] 发布日期准确
- [ ] 功能描述清晰
- [ ] 文档链接有效
- [ ] 根目录整洁
- [ ] 构建成功
- [ ] 打包正常

## 🎯 最佳实践

### 版本发布
1. **小步快跑**: 频繁发布小版本，保持稳定
2. **文档同步**: 每次更新必须同步更新文档
3. **测试验证**: 发布前充分测试新功能
4. **用户友好**: 发布说明面向用户，简洁明了

### 文档管理
1. **分类清晰**: 不同类型文档放在对应目录
2. **命名规范**: 统一的文件命名格式
3. **定期清理**: 及时清理过时和临时文档
4. **保持简洁**: 避免冗余和过度复杂的文档

## 📞 常见问题

### Q: 如何处理开发过程中的临时文档？
A: 统一放在`dev-management/working-notes/`目录，定期整理

### Q: 版本号更新后还需要做什么？
A: 确保README、RELEASE-NOTES、PROJECT_OVERVIEW中的版本信息都已更新

### Q: 是否需要为每个版本创建详细的changelog？
A: 重大版本需要，小修复版本可选

## v1.0.5
- 新增本地万能代理，支持页面动态配置API地址，开发环境无障碍请求任意OpenAI兼容API。
- 修复API配置管理表单动态渲染、模型获取等相关问题。

---

**📝 文档版本**: v1.0.0  
**最后更新**: 2025-01-19  
**适用版本**: Test Master AI v1.0.0+