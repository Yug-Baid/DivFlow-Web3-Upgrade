# 🚀 DivFlow-Web3 Local Setup Guide

Complete step-by-step guide to run the DivFlow land registry website locally.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
2. ✅ **Git** - [Download here](https://git-scm.com/)
3. ✅ **Foundry** - Install using the command below
4. ✅ **MetaMask** - [Browser Extension](https://metamask.io/)

---

## 🔨 Step 1: Install Foundry (Smart Contract Tools)

Foundry provides the local blockchain (`anvil`) and deployment tools (`forge`).

### On Windows:
```powershell
# Open PowerShell as Administrator
irm get.scoop.sh | iex
scoop install foundry
```

### On macOS/Linux:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Verify Installation:
```bash
anvil --version
forge --version
```

---

## 🚀 Step 2: Start Local Blockchain

Open a **NEW terminal** and keep it running:

```bash
cd contracts
anvil
```

**What this does:**
- Starts a local Ethereum blockchain on `http://localhost:8545`
- Creates 10 test accounts with 10,000 ETH each
- Chain ID: 31337

⚠️ **IMPORTANT**: Keep this terminal running! Don't close it.

---

## 📝 Step 3: Deploy Smart Contracts

Open a **SECOND terminal** (keep the first one running):

### Option A: Automated Deployment (Recommended)
```bash
cd contracts
bash setup_and_deploy.sh
```

This script will:
1. Compile all smart contracts
2. Deploy them to your local Anvil blockchain
3. Save contract addresses
4. Automatically update frontend configuration

### Option B: Manual Deployment
If the script doesn't work on Windows:

```bash
cd contracts

# Compile contracts
forge build

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Update frontend config (Node.js required)
node update_frontend_config.js
```

---

## 🎨 Step 4: Setup Frontend Environment

### 4.1 Install Dependencies
```bash
cd frontend
npm install
```

### 4.2 Configure Environment Variables (Optional)

For IPFS document uploads, create a `.env.local` file:

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local` and add your Pinata credentials:
```env
PINATA_JWT=your_jwt_token_here
```

**Get Pinata JWT:** Sign up at [Pinata Cloud](https://app.pinata.cloud/) → Developers → API Keys

⚠️ The app will work without this, but document uploads will fail.

---

## ▶️ Step 5: Run the Frontend

```bash
cd frontend
npm run dev
```

The website will be available at: **http://localhost:3000**

---

## 🦊 Step 6: Setup MetaMask

### 6.1 Add Local Network to MetaMask

1. Open MetaMask extension
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter these details:
   ```
   Network Name: Anvil Local
   RPC URL: http://localhost:8545
   Chain ID: 31337
   Currency Symbol: ETH
   ```
4. Click "Save"

### 6.2 Import Test Accounts

From the Anvil terminal output, copy private keys and import them:

**Account 0 (Admin/Deployer):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Role: Contract deployer, can add inspectors and revenue staff

**Account 1 (Land Inspector):**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Role: Verifies property registrations

**Account 2 (Revenue Employee):**
- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Role: Approves properties for marketplace

**Accounts 3-9 (Citizens):**
- Use for testing registration and marketplace features

**How to Import:**
1. MetaMask → Account icon → "Import Account"
2. Paste private key from Anvil terminal
3. Click "Import"

---

## 🎯 Step 7: Test the Application

### As a Citizen (Account 3+):
1. Connect wallet to the site
2. Register as a user
3. Register a property
4. Wait for inspector verification
5. List property for sale
6. Make offers on other properties

### As Land Inspector (Account 1):
1. Connect with inspector account
2. Navigate to Inspector dashboard
3. Verify pending properties

### As Revenue Employee (Account 2):
1. Connect with revenue account
2. Navigate to Revenue dashboard
3. Approve properties for marketplace

### As Admin (Account 0):
1. Connect with admin account
2. Navigate to Admin dashboard
3. Add inspectors and revenue employees

---

## 🛠️ Troubleshooting

### Issue: "Cannot connect to blockchain"
**Solution:** Ensure Anvil is running in a separate terminal

### Issue: "Transaction failed"
**Solution:** 
- Make sure you're connected to the Anvil Local network in MetaMask
- Check that you have enough ETH (all test accounts start with 10,000 ETH)

### Issue: "Contract not deployed"
**Solution:** 
- Re-run the deployment script
- Check contracts terminal for errors

### Issue: Frontend won't start
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: "Document upload failed"
**Solution:** Add Pinata credentials to `.env.local` file

---

## 🔄 Restart Everything

If you need to start fresh:

1. **Stop all running terminals** (Ctrl+C)
2. **Restart Anvil** (this resets the blockchain):
   ```bash
   cd contracts
   anvil
   ```
3. **Redeploy contracts**:
   ```bash
   cd contracts
   bash setup_and_deploy.sh
   ```
4. **Restart frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 📚 Additional Resources

- **Full Documentation:** See [README.md](./README.md)
- **Development Guide:** See [.agent/workflows/divflow-development.md](./.agent/workflows/divflow-development.md)
- **Bug Tracking:** See [.agent/workflows/divflow-bugs.md](./.agent/workflows/divflow-bugs.md)
- **Deployment Guide:** See [.agent/workflows/deployment-guide.md](./.agent/workflows/deployment-guide.md)

---

## 🎉 You're Ready!

Once everything is running, you should have:
- ✅ Local blockchain running on port 8545
- ✅ Smart contracts deployed
- ✅ Frontend running on http://localhost:3000
- ✅ MetaMask connected to local network

**Happy Testing! 🚀**
