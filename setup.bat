@echo off
REM marronMerge Setup Script for Windows

echo.
echo ╔════════════════════════════════════╗
echo ║   marronMerge Setup Script         ║
echo ║   PDF Merger Build Setup           ║
echo ╚════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

echo.
echo ⏳ Installing backend dependencies...
cd backend
call npm install

if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo ✅ Installation complete!
echo.
echo 📋 Next steps:
echo.
echo   1. Run the server:
echo      npm start
echo.
echo   2. Open in browser:
echo      http://localhost:3000
echo.
echo   3. See QUICKSTART.md for more info
echo.
pause
