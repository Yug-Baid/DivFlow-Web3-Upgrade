# DivFlow-Web3 Development Workflow

> **Purpose**: Comprehensive guide for continuing development across chat sessions.
> **Last Updated**: 2026-01-03
> **Hackathon Deadline**: 20 days remaining

---

## 📁 Project Structure

```
DivFlow-Web3-Upgrade/
├── contracts/                 # Foundry/Solidity contracts
│   ├── src/
│   │   ├── Users.sol          # User registration (hashed identity) ✅ MODIFIED
│   │   ├── LandRegistry.sol   # Land registration + duplicate prevention ✅ MODIFIED
│   │   ├── Properties.sol     # Property state management + access control ✅ MODIFIED
│   │   └── TransferOfOwnership.sol  # Marketplace + sale logic ✅ MODIFIED
│   ├── test/
│   │   └── FullFlow.t.sol     # End-to-end test ✅ MODIFIED
│   └── script/
│       └── Deploy.s.sol       # Deployment script
├── frontend/                  # Next.js 14 + wagmi frontend
│   └── src/
│       ├── app/
│       │   ├── register/page.tsx      # User registration ✅ MODIFIED
│       │   ├── register-land/page.tsx # Land registration (file upload) ✅ MODIFIED
│       │   ├── dashboard/page.tsx     # Dashboard (registration guard) ✅ MODIFIED
│       │   ├── admin/page.tsx         # Admin panel 🔴 NEEDS FIX
│       │   └── providers.tsx          # Network auto-switch ✅ MODIFIED
│       └── lib/
│           ├── config.ts      # Anvil-only wagmi config ✅ MODIFIED
│           └── contracts.ts   # Contract addresses + ABIs ✅ MODIFIED
└── .agent/workflows/
    ├── divflow-development.md # This file
    └── bottleneck_analysis.md # Full analysis document
```

---

## 🔗 Related Documents

1. **Bottleneck Analysis**: `.agent/workflows/bottleneck_analysis.md`
   - Contains ALL identified bugs, security issues, and proposed solutions
   - Industry comparisons (Chromia, Propy, MahaRERA)
   - ERC-721 migration proposal
   - Privacy solutions (hash storage, ZK proofs)

---

## ✅ PHASE 1: Critical Security Fixes (COMPLETED)

### 1.1 ✅ Duplicate Property Prevention
- **File**: `contracts/src/LandRegistry.sol`
- **Change**: Added `registeredProperties` mapping with key `keccak256(locationId, revenueDeptId, surveyNumber)`
- **Added**: `registeredDocuments` mapping to prevent IPFS hash reuse
- **Error Message**: "Property already registered" / "This document (IPFS hash) is already registered"

### 1.2 ✅ Access Control on Properties.sol
- **File**: `contracts/src/Properties.sol`
- **Change**: Added `onlyAuthorized` modifier to 8 state-changing functions
- **Logic**: 
  - Constructor auto-authorizes LandRegistry (msg.sender)
  - `setTransferOwnershipAddress()` called by LandRegistry to authorize TransferOwnership
- **Protected Functions**: addLand, removeLand, updateLand, changeStateToVerified, changeStateToRejected, changeStateToOnSale, changeStateBackToVerified, updateOwner

### 1.3 ✅ Verified-Before-Sale Check
- **File**: `contracts/src/TransferOfOwnership.sol`
- **Change**: Added require check in `addPropertyOnSale()` - property must be `Verified` state
- **Error Message**: "Property must be verified before listing for sale"

### 1.4 ✅ Hashed Identity for Privacy
- **File**: `contracts/src/Users.sol`
- **Change**: 
  - Replaced `string firstName, lastName, dob, aadhar` with `bytes32 identityHash, aadharHash`
  - Function signature: `registerUser(bytes32 _identityHash, bytes32 _aadharHash)`
  - Added `verifyIdentity()` function for off-chain verification
- **Frontend Update**: `frontend/src/app/register/page.tsx` uses `keccak256(encodePacked(...))` from viem

### Phase 1 Frontend Updates:
- **Network Config** (`lib/config.ts`): Anvil-only chain (removed mainnet/sepolia)
- **Auto Network Switch** (`providers.tsx`): useEffect auto-switches MetaMask to Anvil (31337)
- **USERS_ABI** (`contracts.ts`): Updated for new `registerUser(bytes32, bytes32)` signature
- **Register User** (`register/page.tsx`): Hashes identity client-side with keccak256
- **Register Land** (`register-land/page.tsx`): 
  - File upload auto-generates IPFS-like hash
  - Registration guard (redirects unregistered users)
  - Better error message parsing
- **Dashboard** (`dashboard/page.tsx`): Registration guard added

---

## ✅ PHASE 1.5: Marketplace Bug Fixes (COMPLETED 2026-01-04)

- **marketplace/page.tsx**: Only shows if `property.state === 4` (Revenue approved)
- **requested/page.tsx**: Deduplicates sales, shows all bids (Accepted/Declined/Pending)
- **my-sales/page.tsx**: Shows accepted buyer, price, and payment deadline
- **track/page.tsx**: Shows BOTH Land Inspector and Revenue Employee contacts
- **TransferOfOwnership.sol**: Extended deadline to 1 hour, fixed buyer lookup

---

## 🔴 CURRENT BUGS TO FIX (Priority Order)

### Bug 1: Cannot Register Second Land
- **Location**: `frontend/src/app/register-land/page.tsx`
- **Symptom**: After registering first property, form doesn't reset, same hash used
- **Root Cause**: `generatedHash` state persists after successful transaction
- **Fix**: Reset form and hash after `isConfirmed` in useEffect
```typescript
### Bug 4: Revenue Portal Access Control
- **Location**: `frontend/src/app/revenue/page.tsx`
- **Symptom**: Should only be accessible by assigned revenue employees
- **Fix**: Similar to admin - check if wallet is mapped as employee

---

## ✅ BUGS FIXED (2026-01-03)

### Bug 1: ✅ Form Resets After Registration
- **Location**: `register-land/page.tsx`
- **Fix**: Added form reset in useEffect when `isConfirmed` is true
- **Behavior**: Clears formData, documentFile, and generatedHash after success

### Bug 2: ✅ Error Messages Now Display Properly
- **Location**: `register-land/page.tsx`
- **Fix**: Improved `getErrorMessage()` to parse wagmi/viem errors (shortMessage, cause.reason, etc.)

### Bug 3: ✅ Admin Page Now Restricted to Owner
- **Location**: `admin/page.tsx`
- **Fix**: Added `ADMIN_ADDRESS` check (Anvil account 0: `0xf39Fd...92266`)
- **UI**: Non-admin users see "Access Denied" with their wallet address displayed

---

## 📋 REMAINING PHASES

### Phase 2: Demo Data & Seeding (3 days)
- [ ] 2.1 Download property dataset (Kaggle House Price India - 14,620 records)
- [ ] 2.2 Create seeding script (`contracts/script/Seed.s.sol`)
- [ ] 2.3 Run seeder with realistic Indian property data
- [ ] 2.4 Verify data appears correctly in frontend

### Phase 3: Frontend Polish (4 days)
- [ ] 3.1 Fix React hydration errors
- [ ] 3.2 Add proper loading states/skeletons
- [ ] 3.3 Role-based navbar (hide admin/revenue links for non-privileged users)
- [ ] 3.4 Add toast notifications for all contract interactions
- [ ] 3.5 Fix "Total Value" stat (shows wallet balance, should show property value sum)

### Phase 4: Marketplace Features (4 days)
- [ ] 4.1 Fix property state after sale completion
- [ ] 4.2 Prevent duplicate purchase requests
- [ ] 4.3 Fix "Reject" button (currently does nothing)
- [ ] 4.4 Implement proper buyer request flow
- [ ] 4.5 Add transaction history page

### Phase 5: Verification Flow (3 days)
- [ ] 5.1 Revenue employee scheduling
- [ ] 5.2 Physical verification status updates
- [ ] 5.3 Rejection reason display and handling
- [ ] 5.4 Multi-sig verification (2-of-3 verifiers)

### Phase 6: Testing & Demo Prep (3 days)
- [ ] 6.1 Write comprehensive Foundry tests
- [ ] 6.2 Create user documentation
- [ ] 6.3 Hackathon demo script
- [ ] 6.4 Record demo video

---

## 🚀 Quick Setup Commands

```bash
# Terminal 1: Start Anvil blockchain
cd contracts
anvil

# Terminal 2: Deploy contracts (in bash/git-bash, NOT PowerShell)
cd contracts
bash setup_and_deploy.sh
# OR manually:
forge build
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
node update_frontend_config.js

# Terminal 3: Run frontend
cd frontend
npm run dev
```

---

## 🔑 Test Accounts (Anvil)

| Account | Address | Private Key | Role |
|---------|---------|-------------|------|
| Account 0 (Admin) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac09...ff80` | Contract Owner |
| Account 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6...690d` | Revenue Employee |
| Account 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4...65a` | Regular User |

**MetaMask Network Settings**:
- Network Name: Anvil Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH

---

## 📝 Files Modified in This Session

| File | Changes Made |
|------|--------------|
| `contracts/src/Users.sol` | Hashed identity storage (bytes32) |
| `contracts/src/LandRegistry.sol` | Duplicate property + IPFS prevention |
| `contracts/src/Properties.sol` | onlyAuthorized modifier, access control |
| `contracts/src/TransferOfOwnership.sol` | Verified-before-sale check |
| `contracts/test/FullFlow.t.sol` | Updated for new registerUser signature |
| `frontend/src/lib/config.ts` | Anvil-only config |
| `frontend/src/lib/contracts.ts` | Updated USERS_ABI |
| `frontend/src/app/providers.tsx` | Auto network switch to Anvil |
| `frontend/src/app/register/page.tsx` | Hashed identity + useEffect fix |
| `frontend/src/app/register-land/page.tsx` | File upload, registration guard, error display |
| `frontend/src/app/dashboard/page.tsx` | Registration guard |

---

## 🎯 Prompt for New Chat

Copy and paste this to start a fresh chat:

```
I'm continuing work on the DivFlow-Web3 decentralized land registry hackathon project.

Please read:
1. `.agent/workflows/divflow-development.md` - Development status and remaining work
2. `.agent/workflows/bottleneck_analysis.md` - Full analysis of all bugs and proposed solutions

Current status:
- Phase 1 (Security Fixes) is complete but has 4 bugs to fix:
  1. Cannot register second land after first (form doesn't reset)
  2. Error messages not displaying on registration failure
  3. Admin page accessible without admin wallet check
  4. Revenue portal needs access control

Priority: Fix these 4 bugs, then continue to Phase 2 (Demo Data Setup)

Project location: C:\Users\Lenovo\Desktop\Udbhav\DivFlow-Web3-Upgrade
Tech stack: Foundry/Anvil + Next.js 14 + wagmi + viem
Hackathon deadline: 20 days
```
