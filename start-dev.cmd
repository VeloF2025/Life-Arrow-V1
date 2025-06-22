@echo off
echo Starting Life Arrow V1 Development Server...
echo.

REM Kill any existing Vite processes
taskkill /F /IM node.exe 2>nul

REM Start the development server
start "Vite Dev Server" cmd /k "npm run dev"

REM Wait a moment for the server to start
timeout /t 5 /nobreak >nul

REM Try to open the browser to the development server
echo Opening browser...
start http://localhost:5173

echo.
echo Development server should be starting...
echo If port 5173 is busy, check the console for the actual port being used.
echo.
pause 