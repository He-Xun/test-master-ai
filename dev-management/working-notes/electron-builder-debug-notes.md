# electron-builder files 字段无效问题排查与最终解决记录

## 过程概述

1. 多次尝试将 sql-wasm.wasm 放在 public、dist、根目录，并在 package.json 的 build.files 中分别配置：
   - "public/sql-wasm.wasm"
   - "public/**/*"
   - "dist/sql-wasm.wasm"
   - "./sql-wasm.wasm"
   - "sql-wasm2.wasm"（重命名测试）
   - "test.txt"（普通文本文件测试）
2. 每次打包后均通过 find/ls 检查 release 目录，发现无论如何都无法将这些单独指定的文件打包进产物。
3. 多次升级 electron-builder 版本，问题依旧。
4. 检查 effective config，确认 files 字段已生效，但产物中依然没有目标文件。
5. 结论：极可能为 electron-builder 的 bug、依赖副作用或本地环境问题。

## 终极解决方案

- 采用 electron-builder 的 extraResources 字段，将 dist/sql-wasm.wasm 拷贝到最终产物的 resources 根目录（sql-wasm.wasm）。
- preload.js/主进程动态判断开发/生产环境，自动拼接正确路径。
- 渲染进程通过 preload 暴露的 API 获取 wasm 路径，传给 sql.js 的 locateFile。
- 彻底解决了“file not found”与 fallback 到 CDN 的问题。

## 关键命令与现象

- npx electron-builder
- find release -name "sql-wasm.wasm"
- ls release/mac/test-master-ai.app/Contents/Resources/sql-wasm.wasm

最终 extraResources 配置生效，wasm 文件被正确打包，Electron 端本地 SQLite wasm 加载彻底修复。

## 建议

- 遇到类似静态资源打包问题，优先考虑 extraResources。
- 运行时路径建议统一用 process.resourcesPath 适配。
- 打包后务必实际检查 release 目录结构。

---

本记录由 AI 自动生成，用于后续问题追踪与团队协作。