@echo off
setlocal
cd /d "%~dp0"
python -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" >nul 2>nul
if not errorlevel 1 goto run_python
py -3 -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" >nul 2>nul
if not errorlevel 1 goto run_py
python3 -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" >nul 2>nul
if not errorlevel 1 goto run_python3
echo Python 3 was not found. Install Python 3 and add it to PATH.
set "launch_exit=1"
goto done

:run_python
python scripts\serve.py --open %*
set "launch_exit=%errorlevel%"
goto done

:run_py
py -3 scripts\serve.py --open %*
set "launch_exit=%errorlevel%"
goto done

:run_python3
python3 scripts\serve.py --open %*
set "launch_exit=%errorlevel%"

:done
pause
exit /b %launch_exit%
