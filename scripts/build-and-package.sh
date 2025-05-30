#!/bin/bash

echo "================================"
echo "接口测试工具 - 构建和打包脚本"
echo "================================"
echo

echo "1. 安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "依赖安装失败！"
    exit 1
fi

echo
echo "2. 构建React应用..."
npm run build
if [ $? -ne 0 ]; then
    echo "React应用构建失败！"
    exit 1
fi

echo
echo "3. 打包Electron应用..."
npm run dist
if [ $? -ne 0 ]; then
    echo "Electron应用打包失败！"
    exit 1
fi

echo
echo "================================"
echo "构建完成！"
echo "可执行文件位置: dist/"
echo "================================" 