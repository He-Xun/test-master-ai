#!/bin/bash
APP_NAME="test-master-ai.app"
APP_PATH="/Applications/$APP_NAME"

if [ ! -d "$APP_PATH" ]; then
  echo "请先将 $APP_NAME 拖入 /Applications 文件夹后再运行本脚本！"
  exit 1
fi

echo "正在为 $APP_NAME 解除 Gatekeeper 限制..."
sudo xattr -dr com.apple.quarantine "$APP_PATH"
echo "✅ 已解除 Gatekeeper 限制，可以直接双击打开 $APP_NAME"
