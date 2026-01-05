#!/bin/bash

# Exit on error
set -e

echo "1. Installing forge-std library..."
# Check if lib/forge-std exists, if not install it
if [ ! -d "lib/forge-std" ]; then
    forge install foundry-rs/forge-std --no-git --no-commit
else
    echo "forge-std already exists."
fi

echo "2. Building contracts..."
forge build

echo "3. Deploying contracts to local Anvil node..."
# Check if Anvil is running (simple check)
if ! curl -s http://127.0.0.1:8545 > /dev/null; then
    echo "Error: Anvil is not running at http://127.0.0.1:8545"
    echo "Please open a new terminal and run 'anvil' first."
    exit 1
fi

forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "4. Updating frontend configuration..."
node update_frontend_config.js

echo "--------------------------------------------------"
echo "SUCCESS! Setup complete."
echo "Frontend is running at http://localhost:3000"
echo "Contracts are deployed and linked."
echo "--------------------------------------------------"
