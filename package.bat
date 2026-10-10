@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js first.
  exit /b 1
)

if not exist "node_modules\@halo-dev\theme-package-cli" (
  echo [INFO] Installing package dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    exit /b 1
  )
)

echo [INFO] Bumping theme.yaml patch version...
node scripts\bump-theme-version.mjs
if errorlevel 1 (
  echo [ERROR] Version bump failed.
  exit /b 1
)

echo [INFO] Packaging theme zip...
call npm run package
if errorlevel 1 (
  echo [ERROR] Package failed.
  exit /b 1
)

echo.
echo [OK] Done. Output is in dist\
exit /b 0
