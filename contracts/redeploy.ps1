# PowerShell Script: Redeploy Contracts
# Usage: .\redeploy.ps1

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  DivFlow Contract Redeployment Script" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the contracts directory
if (-not (Test-Path "foundry.toml")) {
    Write-Host "Error: Please run this script from the contracts directory" -ForegroundColor Red
    Write-Host "Run: cd contracts" -ForegroundColor Yellow
    exit 1
}

# Check if Anvil is running
Write-Host "1. Checking Anvil connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 2
    Write-Host "   ✓ Anvil is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Anvil is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Anvil in a separate terminal:" -ForegroundColor Yellow
    Write-Host "   cd contracts" -ForegroundColor Cyan
    Write-Host "   anvil" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "2. Building contracts..." -ForegroundColor Yellow
forge build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Build successful" -ForegroundColor Green

Write-Host ""
Write-Host "3. Deploying contracts to Anvil..." -ForegroundColor Yellow
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ✗ Deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Deployment successful" -ForegroundColor Green

Write-Host ""
Write-Host "4. Updating frontend configuration..." -ForegroundColor Yellow
node update_frontend_config.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ✗ Frontend update failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Frontend configuration updated" -ForegroundColor Green

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  ✓ REDEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Contract Addresses Updated In:" -ForegroundColor Cyan
Write-Host "  frontend/src/lib/contracts.ts" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart frontend: npm run dev" -ForegroundColor White
Write-Host "  2. Refresh browser page" -ForegroundColor White
Write-Host "  3. Reconnect MetaMask wallet" -ForegroundColor White
Write-Host ""
