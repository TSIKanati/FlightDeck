# TSI FlightDeck Startup Script
# Run this script to start the FlightDeck system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TSI FlightDeck Startup Script       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Navigate to FlightDeck directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
}

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created. Please update with your settings." -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting FlightDeck services..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  - Alpha FlightDeck: http://localhost:3000" -ForegroundColor Green
Write-Host "  - API Gateway:      http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor White
Write-Host "  - Email:    kanati@translatorseries.com" -ForegroundColor Yellow
Write-Host "  - Password: TSI-Admin-2026!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start development servers
npm run dev
