@echo off
REM DivFlow Base Sepolia Deployment Script for Windows
REM Run this from the contracts folder

echo ============================================
echo    DivFlow Base Sepolia Deployment
echo ============================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please create .env file with:
    echo   PRIVATE_KEY=your_private_key_here
    echo   ALCHEMY_API_KEY=your_alchemy_api_key_here
    exit /b 1
)

REM Load environment variables from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set "%%a=%%b"
)

echo Using Alchemy RPC: https://base-sepolia.g.alchemy.com/v2/%ALCHEMY_API_KEY:~0,8%...
echo.
echo Deploying contracts to Base Sepolia...
echo.

forge script script/Deploy.s.sol ^
    --rpc-url "https://base-sepolia.g.alchemy.com/v2/%ALCHEMY_API_KEY%" ^
    --broadcast ^
    --private-key %PRIVATE_KEY% ^
    -vvvv

echo.
echo ============================================
echo    IMPORTANT: Save the contract addresses!
echo ============================================
echo.
echo Update frontend/src/lib/contracts.ts with the deployed addresses.
echo.
pause
