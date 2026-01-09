# 🎯 DivFlow Quick Reference Card

## 🔑 Test Accounts (Anvil Local)

```
Account 0 (Admin):        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account 1 (Inspector):    0x70997970C51812dc3A010C7d01b50e0d17dc79C8  
Account 2 (Revenue):      0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Account 3-9 (Citizens):   0x90F79bf6EB2c4f870365E785982E1f101E93b906...
```

## 📍 Key URLs

```
Landing:        http://localhost:3000
Dashboard:      http://localhost:3000/dashboard
Admin:          http://localhost:3000/admin
Inspector:      http://localhost:3000/inspector
Revenue:        http://localhost:3000/revenue
Register Land:  http://localhost:3000/register-land
Marketplace:    http://localhost:3000/marketplace
```

## 🔄 Property States Flow

```
Created → Verified → SalePending → OnSale → Bought
   ↓         ↓            ↓
Rejected  (stays)    (back to Verified if rejected)
```

## 🎬 5-Minute Test Flow

### 1️⃣ Admin (Account 0) - 1 min
```bash
1. Connect wallet
2. /admin → Assign Inspector to Location 1 (Account 1)
3. /admin → Assign Revenue to Dept 1 (Account 2)
```

### 2️⃣ Citizen (Account 3) - 2 min
```bash
1. /register → Register user
2. /register-land → Submit property:
   - Location: 1
   - Revenue Dept: 1
   - Survey: 101
   - Area: 5000
```

### 3️⃣ Inspector (Account 1) - 30 sec
```bash
1. /inspector → Verify property #1
```

### 4️⃣ Citizen Sells (Account 3) - 30 sec
```bash
1. /dashboard → List property for 2 ETH
```

### 5️⃣ Revenue (Account 2) - 30 sec
```bash
1. /revenue → Approve sale
```

### 6️⃣ Buyer (Account 4) - 30 sec
```bash
1. /register → Register user
2. /marketplace → Make offer 2.5 ETH
```

### 7️⃣ Seller Accepts (Account 3) - 30 sec
```bash
1. /marketplace/my-sales → Accept 2.5 ETH offer
```

### 8️⃣ Buyer Pays (Account 4) - 30 sec
```bash
1. /marketplace/requested → Complete Purchase (send 2.5 ETH)
```

✅ **Done!** Property transferred, ETH received.

## 🔧 Common Commands

### Start Everything
```bash
# Terminal 1: Blockchain
cd contracts && anvil

# Terminal 2: Deploy (one time)
cd contracts && bash setup_and_deploy.sh

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Restart From Scratch
```bash
# Stop all (Ctrl+C)
# Restart Anvil (resets blockchain)
cd contracts && anvil

# Redeploy contracts
cd contracts && bash setup_and_deploy.sh

# Restart frontend
cd frontend && npm run dev
```

## 📦 Pinata Setup (30 seconds)

```bash
# 1. Get JWT from https://app.pinata.cloud/developers/api-keys
# 2. Create .env.local in frontend/:
echo "PINATA_JWT=eyJhbGc..." > frontend/.env.local

# 3. Restart frontend
cd frontend && npm run dev
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "User not registered" | Go to `/register` first |
| "Wrong network" | MetaMask → Anvil Local (Chain ID 31337) |
| "Contract not found" | Redeploy: `cd contracts && bash setup_and_deploy.sh` |
| "IPFS upload failed" | Check Pinata keys in `.env.local` |
| "Inspector can't verify" | Admin must assign inspector first |
| "Not on marketplace" | Revenue must approve sale first |

## 💡 Pro Tips

- **Multiple Bids**: Buyer can make multiple offers at different prices
- **Payment Deadline**: 1 hour after seller accepts
- **Gas Fees**: ~0.002 ETH for registration, ~0.0003 ETH for transfers
- **IPFS Optional**: Can use dummy hash for testing without Pinata
- **Rejection Reasons**: Always stored on-chain for transparency
- **Re-registration**: Allowed after rejection (duplicate prevention cleared)

## 🎨 Role Detection

Website auto-detects your role:
- **Admin**: Contract deployer address
- **Inspector**: Assigned via `assignLandInspector()`
- **Revenue**: Assigned via `mapRevenueDeptIdToEmployee()`
- **Citizen**: Any other registered user

## 📊 Dashboard Quick View

| Role | Dashboard Shows |
|------|----------------|
| Admin | Assign staff + System overview |
| Inspector | Properties in assigned location |
| Revenue | Properties in assigned department |
| Citizen | Personal properties + Marketplace access |

---

**Need detailed explanations?** See `COMPLETE_WORKFLOW_GUIDE.md`
