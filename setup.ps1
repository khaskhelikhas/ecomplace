# EcomPlace - One-time Setup (SQLite build, no database server needed)

Write-Host "EcomPlace - Setup" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

# Check Node.js
$node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $node) {
    Write-Host "Node.js not found. Install Node 20+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $(node --version)" -ForegroundColor Green

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\src\backend"
npm install --no-audit --no-fund

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\src\frontend"
npm install --no-audit --no-fund

Set-Location $PSScriptRoot

Write-Host "`n=================================" -ForegroundColor Green
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "`nStart the app with:" -ForegroundColor Yellow
Write-Host "  .\start.ps1" -ForegroundColor Cyan
Write-Host "`nThe database is a local SQLite file - no PostgreSQL needed." -ForegroundColor Gray
Write-Host "It is created automatically at: src\backend\data\ecomplace.sqlite" -ForegroundColor Gray
