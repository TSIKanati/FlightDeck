@echo off
echo ========================================
echo    TSI FlightDeck Startup Script
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Navigate to script directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo Creating .env file from template...
    copy ".env.example" ".env"
    echo .env file created. Please update with your settings.
)

echo.
echo Starting FlightDeck services...
echo.
echo Access Points:
echo   - Alpha FlightDeck: http://localhost:3000
echo   - API Gateway:      http://localhost:4000
echo.
echo Login Credentials:
echo   - Email:    kanati@translatorseries.com
echo   - Password: TSI-Admin-2026!
echo.
echo Press Ctrl+C to stop all services
echo ========================================
echo.

REM Start development servers
call npm run dev
