#!/bin/bash
# 操作提示：
# 1. 在 Finder 中，按住 Ctrl 并左键点击本图标
# 2. 选择"打开方式" > "终端"
# 3. 按提示操作即可自动解除 Gatekeeper 限制

APP_NAME="test-master-ai.app"
APP_PATH="/Applications/$APP_NAME"

if [ ! -d "$APP_PATH" ]; then
  echo "请先将 $APP_NAME 拖入 /Applications 文件夹后再运行本脚本！"
  exit 1
fi

echo "正在为 $APP_NAME 解除 Gatekeeper 限制..."
sudo xattr -dr com.apple.quarantine "$APP_PATH"
echo "✅ 已解除 Gatekeeper 限制，可以直接双击打开 $APP_NAME"
