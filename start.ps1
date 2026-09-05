# EcomPlace - Start both servers (backend + frontend)

Write-Host "Starting EcomPlace..." -ForegroundColor Cyan

$backend = Join-Path $PSScriptRoot "src\backend"
$frontend = Join-Path $PSScriptRoot "src\frontend"

# Free ports if something is already listening
foreach ($port in 5000, 5173) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object {
            try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop } catch {}
        }
}

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; npm run dev"

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev"

Start-Sleep -Seconds 4

Write-Host "`n=================================" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Green
Write-Host "`nOpen http://localhost:5173 in your browser, then Register an account." -ForegroundColor Yellow
Write-Host "Two PowerShell windows opened - close them to stop the servers." -ForegroundColor Gray

Start-Process "http://localhost:5173"
