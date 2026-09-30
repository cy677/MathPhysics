@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3 and retry.
  pause
  exit /b 1
)
python scripts\sync_phet.py
if errorlevel 1 (
  echo.
  echo PhET download failed. Check network access to phet.colorado.edu.
  pause
  exit /b 1
)
echo.
echo PhET modules downloaded to vendor\phet.
pause
