# 📋 版本更新操作指南

> **重要提醒**: 每次新增功能或发布版本时，必须按照此指南更新所有相关文件！

## 🎯 版本更新检查清单

### 1. 版本号更新 📊

#### 必须修改的文件：
- [ ] `package.json` - 主版本号
- [ ] `src/constants/version.ts` - 应用内版本号
- [ ] `dev-management/development-checklist.md` - 项目概览中的当前版本
- [ ] `RELEASE-NOTES.md` - 新增版本条目

#### 版本号规则：
- **主版本号 (X.0.0)**: 重大架构变更、不兼容更新
- **次版本号 (x.Y.0)**: 新功能添加、向后兼容
- **修订版本号 (x.y.Z)**: 问题修复、小优化

### 2. 更新日志文档 📝

#### 必须创建/更新的文件：
- [ ] `dev-management/changelog/YYYY-MM-DD-vX.X.X-feature-name.md` - 详细技术日志
- [ ] `RELEASE-NOTES.md` - 用户发布说明（在顶部添加新版本）
- [ ] `dev-management/development-checklist.md` - 开发清单更新

#### 文档命名规则：
```
changelog文件命名: YYYY-MM-DD-vX.X.X-功能描述.md
例如: 2025-05-29-v1.2.3-ui-optimization.md
```

### 3. 开发清单更新 ✅

#### 在 `dev-management/development-checklist.md` 中：
- [ ] 将完成的功能从"开发中"移至"已完成"
- [ ] 更新项目概览中的版本号和最后更新时间
- [ ] 在"已修复问题"部分添加新版本条目
- [ ] 更新开发统计数据

### 4. 发布说明更新 📢

#### 在 `RELEASE-NOTES.md` 中：
- [ ] 在顶部添加新版本条目
- [ ] 包含版本号、发布日期、更新类型
- [ ] 列出主要新功能和改进
- [ ] 记录修复的问题
- [ ] 更新文档底部的发布日期

## 📁 文件组织结构与管理规范

### 🚫 禁止行为 - 避免根目录污染
```
❌ 禁止在根目录创建临时总结文件：
- ❌ UI优化总结.md
- ❌ 功能完成总结.md
- ❌ 开发总结.md
- ❌ 项目更新总结.md
- ❌ 任何xxx总结.md文件

❌ 禁止在根目录创建临时文档：
- ❌ 临时测试文件
- ❌ 工作笔记文件  
- ❌ 调试信息文件
- ❌ 开发临时文档
```

### ✅ 标准文件结构
```
api_res_tools/                     # 根目录 - 仅保留核心文件
├── package.json                   # 项目配置
├── README.md                      # 项目说明
├── RELEASE-NOTES.md              # 用户发布说明
├── VERSION-UPDATE-GUIDE.md       # 版本更新指南(本文件)
├── PROJECT_OVERVIEW.md           # 项目概览
├── 快速开始指南.md               # 用户快速开始指南
├── .env                          # 环境配置
├── tsconfig.json                 # TypeScript配置
├── tailwind.config.js           # Tailwind配置
├── src/                          # 源代码目录
├── public/                       # 静态资源
├── build/                        # 构建产物
├── dist/                         # 编译产物
├── electron/                     # Electron相关
├── scripts/                      # 构建脚本
├── tools/                        # 开发工具
├── docs/                         # 正式文档
├── userData/                     # 用户数据
└── dev-management/               # 开发管理文档(重要!)
    ├── README.md                 # 文档管理说明  
    ├── development-checklist.md  # 开发清单和进度
    ├── project-analysis.md       # 项目分析报告
    ├── api-documentation.md      # API接口文档
    ├── user-guide.md            # 用户使用指南
    ├── deployment-guide.md       # 部署指南
    ├── troubleshooting.md        # 故障排除指南
    ├── changelog/                # 版本更新日志
    │   ├── templates/            # 文档模板
    │   ├── YYYY-MM-DD-vX.X.X-feature.md
    │   └── archive/              # 历史版本归档
    ├── summaries/                # 总结文档专用目录
    │   ├── ui-optimization-summary.md      # UI优化总结
    │   ├── version-management-summary.md   # 版本管理总结
    │   ├── documentation-summary.md        # 文档整理总结
    │   └── project-development-summary.md  # 项目开发总结
    └── working-notes/            # 工作笔记和临时文档
        ├── daily-notes/          # 每日工作笔记
        ├── testing-notes/        # 测试记录
        ├── debug-logs/           # 调试日志
        └── temp-files/           # 临时文件(定期清理)
```

### 📂 文档分类规则

#### 🏠 根目录文件 (最少化原则)
仅保留以下核心文件：
- **项目配置**: package.json, tsconfig.json, tailwind.config.js, .env
- **项目说明**: README.md, PROJECT_OVERVIEW.md
- **用户文档**: RELEASE-NOTES.md, 快速开始指南.md
- **管理文档**: VERSION-UPDATE-GUIDE.md (本文件)

#### 🔧 开发管理目录 (dev-management/)
所有开发相关文档统一存放：

**📋 正式文档** (`dev-management/`)：
- `development-checklist.md` - 开发进度清单
- `project-analysis.md` - 项目技术分析  
- `api-documentation.md` - API接口文档
- `user-guide.md` - 详细用户指南
- `deployment-guide.md` - 部署操作指南
- `troubleshooting.md` - 问题解决指南

**📝 版本日志** (`dev-management/changelog/`)：
- 按日期命名的版本更新日志
- 模板文件和归档文件

**📊 总结文档** (`dev-management/summaries/`)：
- 各类功能开发总结
- 重要里程碑总结
- 技术决策总结

**📔 工作笔记** (`dev-management/working-notes/`)：
- 日常开发笔记
- 测试记录和调试日志
- 临时文档和草稿

### 🎯 文档创建标准流程

#### 1. 版本更新时
```bash
# ✅ 正确做法 - 在指定位置创建文档
dev-management/changelog/2025-05-29-v1.2.3-ui-optimization.md

# ❌ 错误做法 - 在根目录创建
UI优化总结.md  # 这样会污染根目录
```

#### 2. 功能总结时  
```bash
# ✅ 正确做法 - 使用专用总结目录
dev-management/summaries/ui-optimization-summary.md
dev-management/summaries/api-enhancement-summary.md

# ❌ 错误做法 - 在根目录创建
功能完成总结.md  # 禁止在根目录
```

#### 3. 临时文档时
```bash
# ✅ 正确做法 - 使用工作笔记目录
dev-management/working-notes/temp-files/debug-session-notes.md
dev-management/working-notes/daily-notes/2025-05-29-development.md

# ❌ 错误做法 - 在根目录创建  
调试记录.md  # 禁止在根目录
```

### 🧹 文件清理规则

#### 定期清理 (每个版本发布后)
- [ ] 删除根目录所有临时文件
- [ ] 整理 `dev-management/working-notes/temp-files/` 
- [ ] 归档重要的工作笔记到合适位置
- [ ] 检查文件命名是否符合规范

#### 长期归档 (每个大版本后)
- [ ] 将旧版本changelog移至archive目录
- [ ] 整理summaries目录，合并相关总结
- [ ] 清理过期的临时文件
- [ ] 更新文档索引和链接

## 🔄 标准更新流程

### 步骤1: 准备工作
1. 使用MCP时间工具获取当前准确时间
2. 确定新版本号（遵循语义化版本规范）
3. 准备功能描述和更新内容

### 步骤2: 更新版本号
```bash
# 1. 更新 package.json
"version": "1.X.X"

# 2. 更新 src/constants/version.ts
export const APP_VERSION = '1.X.X';
export const BUILD_DATE = '2025-MM-DD';

# 3. 更新开发清单中的版本号
- **当前版本**: v1.X.X
```

### 步骤3: 创建详细日志
```bash
# ✅ 在指定位置创建技术日志文件
dev-management/changelog/2025-MM-DD-v1.X.X-功能描述.md

# 内容模板：
- 版本信息
- 开发背景  
- 技术实现
- 测试验证
- 问题修复
```

### 步骤4: 更新发布说明
```markdown
# 在 RELEASE-NOTES.md 顶部添加
### vX.X.X - 功能描述版 (2025-MM-DD)

#### 🎯 重大更新
- 功能1描述
- 功能2描述

#### ✨ 新增功能
- 详细功能列表

#### 🐛 问题修复
- 修复的问题列表
```

### 步骤5: 更新开发清单
```markdown
# 在 development-checklist.md 中：
1. 更新项目概览版本号
2. 移动完成功能到"已完成"部分
3. 添加版本修复问题记录
4. 更新统计数据
```

### 步骤6: 创建功能总结 (如需要)
```bash
# ✅ 在专用目录创建总结文档
dev-management/summaries/功能名称-summary.md

# 包含内容：
- 功能概述
- 技术实现要点
- 测试结果
- 已知问题和后续计划
```

## ⚠️ 重要注意事项

### 时间管理
- **必须使用MCP时间工具**: `mcp_time_get_current_time`
- **统一时区**: Asia/Shanghai
- **格式标准**: YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss

### 文档一致性
- **版本号**: 所有文件中的版本号必须一致
- **日期**: 所有文件中的发布日期必须一致
- **描述**: 功能描述在不同文档中保持一致

### 质量检查
- [ ] 所有版本号已更新
- [ ] 所有日期使用MCP工具获取
- [ ] 文档格式符合标准
- [ ] 链接和引用正确
- [ ] 无重复或冲突信息
- [ ] 文件放置在正确位置
- [ ] 根目录保持整洁

## 🚨 常见错误避免

### ❌ 错误做法
1. 手动写入时间（容易出错）
2. 只更新部分文件（信息不一致）
3. 版本号不统一
4. 文档放错位置 - **在根目录创建临时文件**
5. 忘记更新开发清单
6. 文件命名不规范
7. 不按文档分类存放

### ✅ 正确做法
1. 使用MCP时间工具获取准确时间
2. 按清单逐一检查所有文件
3. 保持版本号在所有文件中一致
4. 遵循文档命名和位置规范
5. 及时更新开发进度
6. 使用标准化的文件命名
7. 按功能和类型正确分类文档
8. 定期清理临时文件

## 📞 快速参考

### 版本号位置
- `package.json` → version字段
- `src/constants/version.ts` → APP_VERSION常量
- `dev-management/development-checklist.md` → 项目概览
- `RELEASE-NOTES.md` → 版本标题

### 日期位置
- 所有changelog文件名
- 所有changelog文件内容
- RELEASE-NOTES.md版本条目
- development-checklist.md最后更新时间

### 必创建文件位置
- ✅ `dev-management/changelog/日期-版本-功能.md` 
- ✅ 在RELEASE-NOTES.md中添加版本条目
- ✅ 更新development-checklist.md
- ✅ 可选：`dev-management/summaries/功能总结.md`

### 禁止创建位置
- ❌ 根目录任何总结文件
- ❌ 根目录任何临时文件
- ❌ src/目录下的文档文件

---

**创建时间**: 2025-05-29 10:30:00  
**最后更新**: 2025-05-29 11:44:46  
**适用版本**: v1.2.3+  
**维护者**: Claude Sonnet 4  
**重要性**: 🔥 极高 - 每次更新必读！