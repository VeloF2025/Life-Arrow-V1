Write-Host "Starting Life Arrow V1 Development Server..." -ForegroundColor Green
Write-Host ""

# Kill any existing Node processes (optional, uncomment if needed)
# Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Navigate to project directory
Set-Location "C:\Jarvis\life-arrow-v1"

# Start the development server
Write-Host "Starting Vite development server..." -ForegroundColor Yellow
npm run dev

Write-Host ""
Write-Host "Development server started!" -ForegroundColor Green
Write-Host "If the browser doesn't open automatically, try:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor White
Write-Host "  http://localhost:5174" -ForegroundColor White
Write-Host "  http://localhost:5175" -ForegroundColor White 