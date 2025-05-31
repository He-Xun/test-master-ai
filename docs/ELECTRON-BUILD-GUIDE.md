# Electron应用构建技术指南

## 简介

本文档总结了在GitHub Actions上构建Electron应用的经验和最佳实践，特别是针对跨平台(Windows/macOS)构建过程中的常见问题和解决方案。

## 目录

1. [依赖管理策略](#依赖管理策略)
2. [跨平台构建注意事项](#跨平台构建注意事项)
3. [GitHub Actions配置](#github-actions配置)
4. [代码签名处理](#代码签名处理)
5. [构建性能优化](#构建性能优化)
6. [常见问题排查](#常见问题排查)
7. [构建流程清单](#构建流程清单)

## 依赖管理策略

### Windows依赖安装优化

Windows环境中npm安装大量依赖时容易出现网络超时问题，推荐采用分批安装策略:

```yaml
# Windows分批安装策略
- name: Install dependencies for Windows
  if: runner.os == 'Windows'
  timeout-minutes: 45
  shell: pwsh
  run: |
    # 第一批：核心构建工具
    npm install --no-audit --progress=false --no-fund --silent --maxsockets=1 --ignore-scripts electron@25.0.0 electron-builder@24.0.0 @electron/rebuild@3.2.13
    
    # 第二批：前端框架
    npm install --no-audit --progress=false --no-fund --silent --maxsockets=1 --ignore-scripts react@18.2.0 react-dom@18.2.0 antd@5.21.6
    
    # 第三批：构建工具
    npm install --no-audit --progress=false --no-fund --silent --maxsockets=1 --ignore-scripts vite@5.2.0 typescript@5.6.3
    
    # 第四批：剩余依赖
    npm install --no-audit --progress=false --no-fund --silent --maxsockets=1 --ignore-scripts --ignore-optional
```

关键优化参数:
- `--maxsockets=1`: 限制并发连接数，减少网络压力
- `--ignore-scripts`: 跳过postinstall脚本，避免安装过程中断
- `timeout-minutes: 45`: 设置足够长的超时时间
- `--progress=false`: 减少日志输出
- `--no-fund --silent`: 抑制非必要信息

### 版本锁定

为关键构建依赖固定版本号，避免新版本引入不兼容变更:

```json
"devDependencies": {
  "electron": "25.0.0",
  "electron-builder": "24.0.0",
  "@electron/rebuild": "3.2.13",
  // 其他依赖...
}
```

### 依赖完整性验证

在构建前验证关键依赖是否完整安装:

```powershell
# 验证关键依赖
if (!(Test-Path "node_modules/electron")) { 
  Write-Host "重新安装 electron..."
  npm install --no-audit --progress=false electron@25.0.0
}
if (!(Test-Path "node_modules/electron-builder")) { 
  Write-Host "重新安装 electron-builder..."
  npm install --no-audit --progress=false electron-builder@24.0.0
}
```

## 跨平台构建注意事项

### 平台特定Shell语法

为不同操作系统提供专用脚本，尊重平台间的语法差异:

```yaml
# Windows环境使用PowerShell语法
- name: Verify build (Windows)
  if: runner.os == 'Windows'
  shell: pwsh
  run: |
    if (Test-Path "dist/main.js") { 
      Write-Host "✅ dist/main.js exists" 
    } else { 
      Write-Host "❌ dist/main.js missing" 
    }

# Unix环境使用Bash语法
- name: Verify build (Unix)
  if: runner.os != 'Windows'
  run: |
    [ -f dist/main.js ] && echo "✅ dist/main.js exists" || echo "❌ dist/main.js missing"
```

### Windows批处理文件注意事项

Windows批处理脚本有特定语法要求:

```cmd
@echo off
          
REM 使用REM作为注释，不要使用#
set VAR_NAME=value
```

## GitHub Actions配置

### 基本配置结构

```yaml
name: Build and Release Electron App

on:
  push:
    branches:
      - main
  release:
    types: [published]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
            icon-ext: 'icns'
          - os: windows-latest
            platform: win
            icon-ext: 'ico'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      # 其他步骤...
```

### 环境变量优化

设置合理的环境变量优化构建性能:

```yaml
env:
  npm_config_timeout: 600000  # 10分钟超时
  npm_config_maxsockets: 2    # 降低并发
  npm_config_fetch_timeout: 300000
  npm_config_fetch_retry_mintimeout: 30000
  npm_config_fetch_retry_maxtimeout: 120000
  npm_config_cache: .npm
  npm_config_prefer-offline: true
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: true
```

## 代码签名处理

### 禁用代码签名(CI环境)

在CI环境中通常需要禁用代码签名:

```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
  CSC_LINK: ""
  CSC_KEY_PASSWORD: ""
  WIN_CSC_LINK: ""
  SKIP_NOTARIZATION: true
```

### electron-builder配置

在package.json中配置electron-builder:

```json
"build": {
  "appId": "com.example.app",
  "productName": "MyApp",
  "npmRebuild": false,
  "mac": {
    "category": "public.app-category.developer-tools",
    "icon": "electron/icon.icns",
    "hardenedRuntime": false,
    "gatekeeperAssess": false,
    "identity": null,
    "signIgnore": ".*"
  },
  "win": {
    "target": [{"target": "nsis", "arch": ["x64"]}],
    "icon": "electron/icon.ico",
    "requestedExecutionLevel": "asInvoker"
  }
}
```

## 构建性能优化

### 清理大型依赖

构建前清理不必要的大型文件:

```yaml
- name: Clean up large development dependencies
  run: |
    # 只删除明确不需要的大文件，保留electron和electron-builder
    rm -rf node_modules/playwright
    rm -rf node_modules/puppeteer
    rm -rf node_modules/@playwright
    # 清理文档和测试文件
    find node_modules -name "*.d.ts" -delete
    find node_modules -name "README*" -delete
    find node_modules -name "CHANGELOG*" -delete
```

### 保护关键构建文件

在清理脚本中保护构建工具的关键文件:

```javascript
// 严格保护的构建关键目录
const protectedDirs = [
  'node_modules/electron-builder',
  'node_modules/builder-util',
  'node_modules/app-builder-lib',
];

// 递归删除函数 - 增加保护检查
function removeRecursive(dirPath) {
  // 检查是否在保护目录中且是.js文件
  const isProtected = protectedDirs.some(protectedDir => {
    return dirPath.startsWith(fullProtectedPath) && 
           (dirPath.endsWith('.js') || dirPath.endsWith('.js.map'));
  });
  
  if (isProtected) {
    console.log(`🛡️  保护文件跳过删除: ${dirPath}`);
    return;
  }
  // 执行删除...
}
```

### 禁用不必要的压缩

对于CI构建，可以禁用压缩以加快构建速度:

```json
"build": {
  "compression": "store",
  // 其他配置...
}
```

## 常见问题排查

### @electron/rebuild模块问题

@electron/rebuild模块常见问题的解决方案:

1. **文件缺失问题**:
```powershell
if (!(Test-Path "node_modules/@electron/rebuild/lib/src/search-module.js")) { 
  # 创建目录
  New-Item -Path "node_modules/@electron/rebuild/lib/src" -ItemType Directory -Force
  
  # 写入空实现
  Set-Content -Path "node_modules/@electron/rebuild/lib/src/search-module.js" -Value "'use strict';"
  Add-Content -Path "node_modules/@electron/rebuild/lib/src/search-module.js" -Value "Object.defineProperty(exports, '__esModule', { value: true });"
  Add-Content -Path "node_modules/@electron/rebuild/lib/src/search-module.js" -Value "exports.searchForModule = async function(moduleName) { return null; };"
  Add-Content -Path "node_modules/@electron/rebuild/lib/src/search-module.js" -Value "exports.getProjectRootPath = function() { return process.cwd(); };"
}
```

2. **禁用npm rebuild**:
```json
"build": {
  "npmRebuild": false,
  // 其他配置...
}
```

### electron-builder postinstall脚本错误

禁用postinstall脚本:

```json
"postinstall": "echo \"Skipping postinstall scripts\" || electron-builder install-app-deps",
```

## 构建流程清单

构建Electron应用的完整流程清单:

1. **环境准备**
   - [x] 配置Node.js版本
   - [x] 设置npm环境变量
   - [x] 配置缓存策略

2. **依赖安装**
   - [x] 安装核心构建工具
   - [x] 安装前端框架
   - [x] 安装构建工具
   - [x] 安装剩余依赖
   - [x] 验证关键依赖完整性

3. **构建应用**
   - [x] 构建渲染进程(Vite)
   - [x] 构建主进程(TypeScript)
   - [x] 清理开发依赖
   - [x] 优化构建输出

4. **打包应用**
   - [x] 验证electron-builder配置
   - [x] 验证构建文件完整性
   - [x] 执行electron-builder打包
   - [x] 收集构建产物

5. **发布应用**
   - [x] 上传构建产物
   - [x] 创建GitHub Release
   - [x] 附加产物到Release

## 最佳实践总结

1. **渐进式修复策略**
   - 先确保有一个可工作的基准版本
   - 每次只修改一个方面
   - 修改后立即验证效果

2. **依赖管理策略**
   - 固定关键依赖版本
   - 分批安装大型依赖
   - 跳过不必要的脚本执行
   - 保持package.json和package-lock.json同步

3. **跨平台兼容**
   - 为Windows和macOS提供不同的脚本
   - 使用平台特定的Shell语法
   - 验证两个平台特有的问题

4. **构建优化**
   - 保护关键构建文件
   - 只清理确定不需要的文件
   - 禁用不必要的压缩和重建
   - 提供完整的错误处理

5. **CI/CD集成**
   - 自动化版本管理
   - 提供详细的构建日志
   - 自动发布预发布版本
   - 手动确认正式版本发布 