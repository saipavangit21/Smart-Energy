@echo off
echo.
echo  =========================================
echo   StroomSlim - Belgium Electricity App
echo   Setup Script
echo  =========================================
echo.

:: Check Node.js is installed
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Node.js is not installed!
    echo  Please download it from https://nodejs.org
    echo  Then re-run this script.
    pause
    exit /b 1
)

echo  [1/4] Node.js found:
node --version
echo.

:: Install backend dependencies
echo  [2/4] Installing backend dependencies...
cd backend
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Backend install failed!
    pause
    exit /b 1
)

:: Copy .env if it doesn't exist
IF NOT EXIST .env (
    copy .env.example .env
    echo  Created backend\.env from template
)
cd ..

echo.
echo  [3/4] Installing frontend dependencies...
cd frontend
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo  ERROR: Frontend install failed!
    pause
    exit /b 1
)
cd ..

echo.
echo  [4/4] Setup complete!
echo.
echo  =========================================
echo   HOW TO START:
echo.
echo   Open TWO terminal windows:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     npm run dev
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Then open: http://localhost:5173
echo  =========================================
echo.
pause