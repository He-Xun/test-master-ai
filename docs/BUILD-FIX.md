# 构建问题修复说明

## 问题描述

Windows构建过程中出现以下错误：
```
⨯ Env WIN_CSC_LINK is not correct, cannot resolve: D:\a\test-master-ai\test-master-ai not a file
```

## 问题原因

1. **代码签名配置错误**: electron-builder 检测到 `WIN_CSC_LINK` 环境变量，但该变量指向目录而非证书文件
2. **Node版本不匹配**: react-router@7.6.1 要求 Node.js >= 20.0.0，但CI使用的是 18.20.8
3. **缺少Windows代码签名禁用配置**: 没有明确告诉electron-builder跳过代码签名

## 修复方案

### 1. 更新GitHub Actions配置

在 `.github/workflows/release.yml` 中：

```yaml
env:
  NODE_VERSION: '20'  # 从 '18' 升级到 '20'

# Windows构建步骤
- name: Build Electron app for Windows  
  if: matrix.platform == 'win'
  run: npx electron-builder --win --publish never
  env:
    CSC_LINK: ""
    WIN_CSC_LINK: ""              # 新增：明确设置为空
    CSC_KEY_PASSWORD: ""          # 新增：禁用密码
    CSC_IDENTITY_AUTO_DISCOVERY: false  # 新增：禁用自动发现
    DEBUG: electron-builder
```

### 2. 更新package.json构建配置

在Windows构建配置中添加代码签名禁用选项：

```json
"win": {
  "target": [...],
  "icon": "electron/icon.ico",
  "requestedExecutionLevel": "asInvoker",
  "certificateFile": null,        // 新增
  "certificatePassword": null,    // 新增
  "sign": null,                   // 新增
  "signAndEditExecutable": false, // 新增
  "signDlls": false              // 新增
}
```

### 3. 添加构建测试脚本

创建 `scripts/test-build.js` 用于本地测试构建配置：

```bash
npm run test:build
```

## 修复后的效果

1. ✅ 消除代码签名相关错误
2. ✅ 解决Node版本兼容性警告
3. ✅ Windows和macOS构建都能正常工作
4. ✅ 添加了本地测试工具

## 验证方法

### 本地验证
```bash
# 1. 构建项目
npm run build

# 2. 测试构建配置
npm run test:build

# 3. 手动测试Windows构建（Windows环境）
npx electron-builder --win --dir --publish never
```

### CI/CD验证
推送代码到GitHub，查看Actions构建结果。

## 注意事项

1. **代码签名**: 当前配置完全禁用了代码签名，适用于开发和测试环境
2. **生产环境**: 如需发布到应用商店，需要配置有效的代码签名证书
3. **Node版本**: 确保开发环境也使用Node 20+以保持一致性

## 相关文件

- `.github/workflows/release.yml` - CI/CD配置
- `package.json` - 构建配置
- `scripts/test-build.js` - 测试脚本
- `docs/BUILD-FIX.md` - 本文档 