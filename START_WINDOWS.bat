@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 exit /b 1
set "MATHPHYSICS_APP=%~dp0."
if exist "%~dp0app\server\cli.mjs" set "MATHPHYSICS_APP=%~dp0app"
set "MATHPHYSICS_NODE=node"
if exist "%~dp0..\node\node.exe" set "MATHPHYSICS_NODE=%~dp0..\node\node.exe"
if exist "%~dp0node\node.exe" set "MATHPHYSICS_NODE=%~dp0node\node.exe"
"%MATHPHYSICS_NODE%" --version >nul 2>nul
if errorlevel 1 (
  echo Node.js 24.14.0 was not found. Extract the entire Windows package,
  echo or install Node.js 24.14.0 and add it to PATH.
  popd
  pause
  exit /b 1
)
"%MATHPHYSICS_NODE%" "%MATHPHYSICS_APP%\server\cli.mjs" start --open %*
set "launch_exit=%errorlevel%"
popd
if not "%launch_exit%"=="0" pause
exit /b %launch_exit%
