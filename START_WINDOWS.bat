@echo off
setlocal
cd /d "%~dp0"
node --version >nul 2>nul
if errorlevel 1 (
  echo Node.js 24.14.0 was not found. Install it and add it to PATH.
  pause
  exit /b 1
)
node server\cli.mjs start --open %*
set "launch_exit=%errorlevel%"
if not "%launch_exit%"=="0" pause
exit /b %launch_exit%
