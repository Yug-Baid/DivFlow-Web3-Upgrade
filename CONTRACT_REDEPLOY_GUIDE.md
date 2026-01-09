# 🔄 Contract Redeployment Guide

**Date**: 2026-01-09  
**Purpose**: Redeploy smart contracts to local Anvil blockchain

---

## 🚀 **Quick Start (3 Methods)**

### **Method 1: PowerShell Script (Windows)** ⭐ RECOMMENDED
```powershell
cd contracts
.\redeploy.ps1
```

### **Method 2: Bash Script (Linux/Mac/Git Bash)**
```bash
cd contracts
bash redeploy.sh
```

### **Method 3: Existing Setup Script**
```bash
cd contracts
bash setup_and_deploy.sh
```

---

## 📋 **Prerequisites**

Before redeploying, make sure:

1. ✅ **Anvil is running** in a separate terminal
   ```bash
   cd contracts
   anvil
   ```

2. ✅ **Node.js is installed** (for updating frontend config)
   ```bash
   node --version  # Should show v18+
   ```

3. ✅ **Forge is installed** (Foundry)
   ```bash
   forge --version  # Should show foundry version
   ```

---

## 🎯 **What the Scripts Do**

### **Step-by-Step Process**:

1. **Check Anvil Connection** 🔍
   - Verifies Anvil is running on `http://127.0.0.1:8545`
   - Exits with error if not running

2. **Build Contracts** 🔨
   - Compiles all Solidity files
   - Generates ABIs and bytecode
   - Location: `contracts/out/`

3. **Deploy to Anvil** 🚀
   - Runs deployment script
   - Uses Account #0 private key
   - Deploys in order:
     1. Users.sol
     2. Properties.sol
     3. LandRegistry.sol
     4. TransferOfOwnership.sol

4. **Update Frontend** ⚙️
   - Extracts deployed addresses
   - Updates `frontend/src/lib/contracts.ts`
   - No manual editing needed!

---

## 📝 **Manual Deployment (If Scripts Fail)**

If the automated scripts don't work, follow these manual steps:

### **Step 1: Start Anvil**
```bash
# Terminal 1
cd contracts
anvil
```

Keep this running! You should see:
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

### **Step 2: Build**
```bash
# Terminal 2
cd contracts
forge build
```

Expected output:
```
[⠊] Compiling...
[⠒] Compiling 4 files with 0.8.20
[⠑] Solc 0.8.20 finished in 2.34s
Compiler run successful!
```

### **Step 3: Deploy**
```bash
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Expected output:
```
Script ran successfully.
✅ Users deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ Properties deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ LandRegistry deployed at: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
✅ TransferOfOwnership deployed at: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### **Step 4: Update Frontend**
```bash
node update_frontend_config.js
```

Expected output:
```
✓ Frontend configuration updated!
Contract addresses written to: ../frontend/src/lib/contracts.ts
```

---

## 🔍 **Verify Deployment**

### **Check Contract Addresses**

Open `frontend/src/lib/contracts.ts`:

```typescript
export const USERS_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
export const LAND_REGISTRY_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
export const TRANSFER_OWNERSHIP_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
```

### **Test with Cast**

```bash
# Check if contract exists
cast code 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://127.0.0.1:8545

# Should return bytecode (long hex string)
# Empty = contract not deployed
```

---

## 🔄 **After Redeployment**

### **Required Steps**:

1. **Restart Frontend** 🔄
   ```bash
   # Stop frontend (Ctrl+C)
   cd frontend
   npm run dev
   ```

2. **Refresh Browser** 🌐
   - Hard refresh: `Ctrl + Shift + R` (Windows/Linux)
   - Or: `Cmd + Shift + R` (Mac)

3. **Reconnect MetaMask** 🦊
   - MetaMask → Switch to different network
   - Switch back to "Anvil Local (31337)"
   - Wallet should reconnect automatically

4. **Clear State** (If Issues)
   ```bash
   # Clear MetaMask activity
   MetaMask → Settings → Advanced → Clear activity tab data
   
   # Clear browser cache
   Ctrl + Shift + Delete → Clear cached images and files
   ```

---

## ⚠️ **Common Issues & Solutions**

### **Issue 1: "Anvil is not running"**

**Solution**:
```bash
# Terminal 1
cd contracts
anvil
```

Wait for:
```
Listening on 127.0.0.1:8545
```

### **Issue 2: "RPC URL unreachable"**

**Causes**:
- Anvil crashed
- Port 8545 in use
- Firewall blocking

**Solution**:
```bash
# Check if port is in use
netstat -ano | findstr :8545   # Windows
lsof -i :8545                  # Linux/Mac

# Kill process and restart Anvil
```

### **Issue 3: "Build failed"**

**Solution**:
```bash
# Clean and rebuild
forge clean
forge build
```

### **Issue 4: "Deployment failed - nonce too low"**

**Cause**: Anvil state out of sync

**Solution**:
```bash
# Restart Anvil (Terminal 1)
Ctrl+C
anvil

# Then redeploy
bash redeploy.sh
```

### **Issue 5: "Frontend still shows old addresses"**

**Solution**:
```bash
# Manually update
node update_frontend_config.js

# Verify
cat ../frontend/src/lib/contracts.ts

# Restart frontend
cd frontend
npm run dev
```

---

## 🎯 **When to Redeploy**

### **You NEED to redeploy when**:
✅ Smart contract code changes (`.sol` files)  
✅ Anvil restarted (blockchain resets)  
✅ Adding new contract functions  
✅ Modifying existing functions  

### **You DON'T need to redeploy for**:
❌ Frontend changes (UI/React)  
❌ API route changes  
❌ CSS/styling updates  
❌ Adding new components  

---

## 📊 **Deployment Flow Diagram**

```
┌─────────────┐
│ Start Anvil │
│ (Terminal 1)│
└─────┬───────┘
      │
      v
┌─────────────────┐
│  forge build    │
│  (Compile)      │
└─────┬───────────┘
      │
      v
┌─────────────────┐
│ forge script    │
│  (Deploy)       │
└─────┬───────────┘
      │
      ├─> Users.sol deployed
      ├─> Properties.sol deployed
      ├─> LandRegistry.sol deployed
      └─> TransferOfOwnership.sol deployed
      │
      v
┌─────────────────────┐
│ update_frontend     │
│ _config.js          │
│ (Extract addresses) │
└─────┬───────────────┘
      │
      v
┌─────────────────────┐
│ frontend/src/lib/   │
│ contracts.ts        │
│ (Updated!)          │
└─────────────────────┘
```

---

## 🛠️ **Advanced Options**

### **Deploy to Different Network**

```bash
# Testnet (e.g., Sepolia)
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY \
  --broadcast \
  --private-key YOUR_PRIVATE_KEY \
  --verify
```

### **Deploy Specific Contract**

```bash
# Deploy only LandRegistry
forge create src/LandRegistry.sol:LandRegistry \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --constructor-args "0x..." "0x..."  # Previous contract addresses
```

### **Verify Deployment Cost**

```bash
# Estimate gas
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545

# Without --broadcast (dry run)
```

---

## 📦 **Files Involved**

### **Contracts Directory**:
```
contracts/
├── script/
│   └── Deploy.s.sol           # Deployment script
├── src/
│   ├── Users.sol              # User registry
│   ├── Properties.sol         # Property state
│   ├── LandRegistry.sol       # Main registry
│   └── TransferOfOwnership.sol # Marketplace
├── foundry.toml               # Foundry config
├── setup_and_deploy.sh        # Original script
├── redeploy.sh                # New bash script
└── redeploy.ps1               # New PowerShell script
```

### **Generated Files**:
```
contracts/
├── out/                       # Compiled contracts
│   ├── Users.sol/
│   ├── LandRegistry.sol/
│   └── ...
└── broadcast/                 # Deployment logs
    └── Deploy.s.sol/
        └── 31337/
            └── run-latest.json
```

### **Frontend Update**:
```
frontend/
└── src/
    └── lib/
        └── contracts.ts       # Auto-updated addresses & ABIs
```

---

## ✅ **Quick Checklist**

Before redeploying:
- [ ] Anvil is running
- [ ] No pending frontend changes
- [ ] Contracts compile without errors
- [ ] You understand what changed
- [ ] Backed up any important state (if needed)

After redeploying:
- [ ] Frontend config updated
- [ ] Frontend restarted
- [ ] Browser refreshed
- [ ] MetaMask reconnected
- [ ] Tested basic functionality

---

## 🎯 **Summary**

### **Simplest Way**:
```bash
cd contracts
.\redeploy.ps1          # Windows
bash redeploy.sh        # Linux/Mac
```

### **What It Does**:
1. ✅ Compiles contracts
2. ✅ Deploys to Anvil
3. ✅ Updates frontend
4. ✅ Shows new addresses

### **Time Required**: ~30 seconds

### **Success Indicators**:
- ✅ All contracts deployed
- ✅ New addresses in `contracts.ts`
- ✅ Frontend connects successfully
- ✅ Can interact with contracts

---

**Created**: 2026-01-09  
**Scripts**: `redeploy.ps1`, `redeploy.sh`  
**Original**: `setup_and_deploy.sh`
