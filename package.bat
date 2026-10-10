@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未找到 npm，请先安装 Node.js。
  exit /b 1
)

if not exist "node_modules\@halo-dev\theme-package-cli" (
  echo [INFO] 正在安装打包依赖...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install 失败。
    exit /b 1
  )
)

echo [INFO] 递增 theme.yaml 补丁版本...
node scripts\bump-theme-version.mjs
if errorlevel 1 (
  echo [ERROR] 版本号递增失败。
  exit /b 1
)

echo [INFO] 正在打包主题 zip...
call npm run package
if errorlevel 1 (
  echo [ERROR] 打包失败。
  exit /b 1
)

echo.
echo [OK] 打包完成，产物在 dist\ 目录。
exit /b 0
