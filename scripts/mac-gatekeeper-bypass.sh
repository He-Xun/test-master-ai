#!/bin/bash

# macOS Gatekeeper 绕过脚本 - TestMaster AI
# 此脚本帮助绕过 macOS 的 Gatekeeper 安全检查，允许运行未签名的应用程序

echo "===== TestMaster AI - macOS Gatekeeper 绕过工具 ====="
echo "此脚本将帮助您运行未签名的 TestMaster AI 应用程序"
echo ""

# 检测应用程序路径
APP_NAME="test-master-ai.app"
DEFAULT_PATHS=(
    "/Applications/$APP_NAME"
    "$HOME/Applications/$APP_NAME"
    "$HOME/Downloads/$APP_NAME"
    "./release/mac/$APP_NAME"
)

FOUND_APP=""

# 检查默认路径
for path in "${DEFAULT_PATHS[@]}"; do
    if [ -d "$path" ]; then
        FOUND_APP="$path"
        break
    fi
done

# 如果没找到，让用户手动输入
if [ -z "$FOUND_APP" ]; then
    echo "未在常见位置找到 $APP_NAME"
    echo "请输入 test-master-ai.app 的完整路径，或将其拖放到此窗口："
    read -r CUSTOM_PATH
    CUSTOM_PATH="${CUSTOM_PATH%% *}" # 去除拖放产生的额外字符
    CUSTOM_PATH="${CUSTOM_PATH//\\/ }" # 替换反斜杠和空格
    
    if [ -d "$CUSTOM_PATH" ]; then
        FOUND_APP="$CUSTOM_PATH"
    else
        echo "错误: 无法找到 $CUSTOM_PATH"
        echo "请确保路径正确，并且应用程序已下载解压"
        exit 1
    fi
fi

echo "找到应用: $FOUND_APP"
echo ""

# 运行 xattr 命令移除隔离属性
echo "正在移除隔离属性..."
xattr -rd com.apple.quarantine "$FOUND_APP"

# 检查结果
if [ $? -eq 0 ]; then
    echo "✅ 成功移除隔离属性"
    echo ""
    echo "现在您可以正常打开 TestMaster AI 应用程序了"
    echo "如果仍然无法打开，请尝试在「系统偏好设置 > 安全性与隐私」中允许打开"
else
    echo "❌ 无法移除隔离属性，可能需要管理员权限"
    echo ""
    echo "请尝试使用管理员权限运行此脚本:"
    echo "sudo $0"
fi

echo ""
echo "===== 操作完成 =====" 