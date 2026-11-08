@echo off
setlocal
title MedShelf - Smart Medicine Expiry Tracker

echo ============================================================
echo   MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
echo   Full-Stack Node.js, Express & Database Application
echo ============================================================
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Check for standard Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
    goto START_SERVER
)

REM Check for Antigravity Node CLI wrapper (recommended)
if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
    set "NODE_CMD=%APPDATA%\Antigravity\bin\agy-node.cmd"
    goto START_SERVER
)

REM Check for Antigravity executable with node flag
if exist "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" (
    set "ELECTRON_RUN_AS_NODE=1"
    set "NODE_CMD=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
    goto START_SERVER
)

echo [ERROR] Node.js executable was not detected on your system.
echo Please install Node.js from https://nodejs.org or run inside your IDE.
pause
exit /b 1

:START_SERVER
echo [1/2] Starting MedShelf Backend Server on port 5000...
echo [2/2] Opening application in your default web browser...
echo.

start "" "http://localhost:5000"
"%NODE_CMD%" backend/server.js

pause
