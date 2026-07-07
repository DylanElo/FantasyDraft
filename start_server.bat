@echo off
setlocal
cd /d "%~dp0"

if not defined JJK_BATTLE_SYSTEM set "JJK_BATTLE_SYSTEM=v2"
set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo Creating local Python environment...
    where py >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        py -3 -m venv .venv
    ) else (
        python -m venv .venv
    )
    if errorlevel 1 goto fail
)

"%PYTHON_EXE%" -c "import flask, flask_socketio, eventlet" >nul 2>nul
if errorlevel 1 (
    echo Installing server dependencies...
    "%PYTHON_EXE%" -m pip install --upgrade pip
    if errorlevel 1 goto fail
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if errorlevel 1 goto fail
)

echo Starting JJK Fantasy Draft...
"%PYTHON_EXE%" run_server.py
if errorlevel 1 goto fail
exit /b 0

:fail
echo.
echo Failed to start the server. See the error above.
pause
exit /b 1
