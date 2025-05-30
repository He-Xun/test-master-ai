@echo off
echo ================================
echo 接口测试工具 - 构建和打包脚本
echo ================================
echo.

echo 1. 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 2. 构建React应用...
call npm run build
if %errorlevel% neq 0 (
    echo React应用构建失败！
    pause
    exit /b 1
)

echo.
echo 3. 打包Electron应用...
call npm run dist
if %errorlevel% neq 0 (
    echo Electron应用打包失败！
    pause
    exit /b 1
)

echo.
echo ================================
echo 构建完成！
echo 可执行文件位置: dist/
echo ================================
pause 