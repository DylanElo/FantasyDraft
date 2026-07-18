@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title JJK Arena - Local Server

if not defined JJK_BATTLE_SYSTEM set "JJK_BATTLE_SYSTEM=v2"
if /I not "%JJK_BATTLE_SYSTEM%"=="v2" goto unsupported_battle_system
if not defined JJK_HOST set "JJK_HOST=127.0.0.1"
if not defined JJK_PORT set "JJK_PORT=5000"
if not defined JJK_SOCKETIO_ASYNC_MODE set "JJK_SOCKETIO_ASYNC_MODE=threading"

set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"
set "REQUIREMENTS_FILE=%CD%\requirements.txt"
set "REQUIREMENTS_STAMP=%CD%\.venv\.requirements.sha256"

if not exist "%REQUIREMENTS_FILE%" goto missing_requirements
if exist "%PYTHON_EXE%" goto python_ready

echo Creating local Python environment...
where py >nul 2>nul
if errorlevel 1 goto create_with_python
py -3 -m venv "%CD%\.venv"
if errorlevel 1 goto fail
goto python_ready

:create_with_python
where python >nul 2>nul
if errorlevel 1 goto missing_python
python -m venv "%CD%\.venv"
if errorlevel 1 goto fail

:python_ready
if not exist "%PYTHON_EXE%" goto fail

set "REQUIREMENTS_HASH="
for /f "usebackq delims=" %%H in (`powershell.exe -NoProfile -NonInteractive -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath $env:REQUIREMENTS_FILE).Hash"`) do set "REQUIREMENTS_HASH=%%H"
if not defined REQUIREMENTS_HASH goto hash_failed

set "INSTALLED_REQUIREMENTS_HASH="
if not exist "%REQUIREMENTS_STAMP%" goto install_dependencies
set /p "INSTALLED_REQUIREMENTS_HASH="<"%REQUIREMENTS_STAMP%"
if /I not "%INSTALLED_REQUIREMENTS_HASH%"=="%REQUIREMENTS_HASH%" goto install_dependencies

"%PYTHON_EXE%" -c "import flask, flask_socketio, simple_websocket" >nul 2>nul
if errorlevel 1 goto install_dependencies
"%PYTHON_EXE%" -m pip check >nul 2>nul
if errorlevel 1 goto install_dependencies
goto dependencies_ready

:install_dependencies
echo Synchronizing server dependencies...
"%PYTHON_EXE%" -m pip install --disable-pip-version-check -r "%REQUIREMENTS_FILE%"
if errorlevel 1 goto fail
"%PYTHON_EXE%" -c "import flask, flask_socketio, simple_websocket" >nul 2>nul
if errorlevel 1 goto dependency_failed
"%PYTHON_EXE%" -m pip check >nul 2>nul
if errorlevel 1 goto dependency_failed
>"%REQUIREMENTS_STAMP%" echo %REQUIREMENTS_HASH%

:dependencies_ready
"%PYTHON_EXE%" -c "import os; port=int(os.environ['JJK_PORT']); assert 1 <= port <= 65535" >nul 2>nul
if errorlevel 1 goto invalid_port

set "JJK_BROWSER_HOST=%JJK_HOST%"
if "%JJK_BROWSER_HOST%"=="0.0.0.0" set "JJK_BROWSER_HOST=127.0.0.1"
if "%JJK_BROWSER_HOST%"=="::" set "JJK_BROWSER_HOST=127.0.0.1"
set "JJK_BROWSER_URL=http://%JJK_BROWSER_HOST%:%JJK_PORT%"
if not defined JJK_CORS_ORIGINS set "JJK_CORS_ORIGINS=http://127.0.0.1:%JJK_PORT%,http://localhost:%JJK_PORT%,%JJK_BROWSER_URL%"

"%PYTHON_EXE%" -c "import os, socket; sock=socket.socket(); sock.bind((os.environ['JJK_HOST'], int(os.environ['JJK_PORT']))); sock.close()" >nul 2>nul
if errorlevel 1 goto port_unavailable

if /I "%JJK_NO_BROWSER%"=="1" goto start_server
start "" /b powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "$url=$env:JJK_BROWSER_URL; for ($attempt=0; $attempt -lt 80; $attempt++) { try { $response=Invoke-WebRequest -UseBasicParsing -Uri ($url + '/readyz') -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }; exit 1"

:start_server
echo Starting JJK Arena on %JJK_BROWSER_URL%...
echo Press Ctrl+C to stop the server.
"%PYTHON_EXE%" run_server.py
if errorlevel 1 goto fail
exit /b 0

:unsupported_battle_system
echo This launcher supports the maintained Battle v2 runtime only.
goto fail

:missing_requirements
echo requirements.txt was not found beside start_server.bat.
goto fail

:missing_python
echo Python 3 was not found. Install Python 3, then run this launcher again.
goto fail

:hash_failed
echo Could not fingerprint requirements.txt with Windows PowerShell.
goto fail

:dependency_failed
echo The current server dependencies did not validate after installation.
goto fail

:invalid_port
echo JJK_PORT must be a number from 1 through 65535.
goto fail

:port_unavailable
echo Port %JJK_PORT% on %JJK_HOST% is already in use or unavailable.
goto fail

:fail
echo.
echo Failed to start the server. See the error above.
pause
exit /b 1
