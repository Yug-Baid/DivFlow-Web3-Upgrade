#!/bin/bash

# Contract Redeployment Script
# Usage: bash redeploy.sh

set -e  # Exit on error

echo "==============================================="
echo "  DivFlow Contract Redeployment Script"
echo "==============================================="
echo ""

# Check if we're in the contracts directory
if [ ! -f "foundry.toml" ]; then
    echo "❌ Error: Please run this script from the contracts directory"
    echo "Run: cd contracts"
    exit 1
fi

# Check if Anvil is running
echo "1. Checking Anvil connection..."
if curl -s -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo "   ✓ Anvil is running"
else
    echo "   ❌ Anvil is not running!"
    echo ""
    echo "Please start Anvil in a separate terminal:"
    echo "   cd contracts"
    echo "   anvil"
    echo ""
    exit 1
fi

echo ""
echo "2. Building contracts..."
forge build
echo "   ✓ Build successful"

echo ""
echo "3. Deploying contracts to Anvil..."
forge script script/Deploy.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --broadcast \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo "   ✓ Deployment successful"

echo ""
echo "4. Updating frontend configuration..."
node update_frontend_config.js
echo "   ✓ Frontend configuration updated"

echo ""
echo "==============================================="
echo "  ✓ REDEPLOYMENT COMPLETE!"
echo "==============================================="
echo ""
echo "Contract Addresses Updated In:"
echo "  frontend/src/lib/contracts.ts"
echo ""
echo "Next Steps:"
echo "  1. Restart frontend: npm run dev"
echo "  2. Refresh browser page"
echo "  3. Reconnect MetaMask wallet"
echo ""
