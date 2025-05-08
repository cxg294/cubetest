@echo off
echo 魔法特效互动项目启动脚本
echo ===========================
echo 正在尝试启动HTTP服务器...

REM 尝试使用Python启动服务器
echo 尝试使用Python启动服务器...
python -m http.server 8000
if %ERRORLEVEL% EQU 0 goto :end

REM 尝试使用Python3启动服务器
echo 尝试使用Python3启动服务器...
python3 -m http.server 8000
if %ERRORLEVEL% EQU 0 goto :end

REM 尝试使用Node.js启动服务器
echo 尝试使用Node.js的http-server启动服务器...
npx http-server -p 8000
if %ERRORLEVEL% EQU 0 goto :end

REM 如果所有尝试都失败
echo 无法自动启动服务器。请手动启动HTTP服务器。
echo 您可以:
echo 1. 安装Python并运行: python -m http.server 8000
echo 2. 安装Node.js并运行: npx http-server
echo 3. 在VS Code中安装Live Server插件并使用它启动服务器
echo.
echo 服务器启动后，请在浏览器中访问: http://localhost:8000
pause

:end
echo.
echo 服务器已启动，请在浏览器中访问: http://localhost:8000
echo 按Ctrl+C可停止服务器
pause 