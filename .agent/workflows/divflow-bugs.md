# DivFlow-Web3 Bug Documentation

## Project Context

- **Directory**: `C:\Users\Lenovo\Desktop\Udbhav\DivFlow-Web3-Upgrade`
- **Stack**: Next.js frontend, Solidity contracts (Foundry)
- **Local Setup**: Anvil on `127.0.0.1:8545`, Frontend on `localhost:3000`
- **Deploy Script**: `cd contracts && bash setup_and_deploy.sh`

---

## CRITICAL BUGS (Unfixed)

### BUG-1: Marketplace Shows Before Revenue Approval
**Status**: ✅ FIXED  
**Priority**: CRITICAL

**Description**: Properties appear in marketplace immediately after seller lists them, bypassing Revenue Department Employee approval.

**Expected Behavior**: 
1. Seller clicks "Sell" → Property goes to "SalePending" state
2. Revenue Employee must approve → Property goes to "OnSale" state
3. Only THEN should property appear in marketplace

**Root Cause Analysis**:
- Contract `addPropertyOnSale()` was fixed to call `changeStateToSalePending()` instead of `changeStateToOnSale()`
- BUT frontend `marketplace/page.tsx` filters by `sale.state === 0` (Active)
- The Sale object is created with state Active immediately
- Frontend needs to ALSO check Property.state === 4 (OnSale)

**Files Involved**:
- `contracts/src/TransferOfOwnership.sol` - addPropertyOnSale() (line 148)
- `contracts/src/Properties.sol` - StateOfProperty enum, changeStateToSalePending()
- `frontend/src/app/marketplace/page.tsx` - needs property state check

**Fix Required**:
1. For each sale in marketplace, fetch property details using `getPropertyDetails(propertyId)`
2. Only show if `property.state === 4` (OnSale)

---

### BUG-2: My Requests Shows Wrong "Your Offer"
**Status**: ✅ FIXED  
**Priority**: HIGH

**Description**: The "My Requests" page shows the seller's listed price (100 ETH) instead of the buyer's actual offer (105 ETH or 106 ETH).

**Screenshots Reference**: Image shows "Your Offer: 100 ETH" but "Accepted Price: 105 ETH" - contradictory

**Root Cause**:
- `getRequestedSales()` returns Sales objects, which contain `sale.price` (seller's listing price)
- It does NOT include the buyer's actual offer amount
- Need to call `getRequestedUsers(saleId)` to find the current user's specific offer

**Files Involved**:
- `frontend/src/app/marketplace/requested/page.tsx` - line 112 shows `sale.price` instead of buyer's offer
- `contracts/src/TransferOfOwnership.sol` - getRequestedSales(), getRequestedUsers()

**Fix Required**:
1. For each sale, also fetch `getRequestedUsers(saleId)`
2. Find the entry where `req.user === currentAddress`
3. Display `req.priceOffered` instead of `sale.price`

---

### BUG-3: My Sales Not Showing Accepted Price
**Status**: ✅ FIXED  
**Priority**: MEDIUM

**Description**: After accepting an offer, the "My Sales" page should show which price was accepted, but it only shows "Listed Price".

**Files Involved**:
- `frontend/src/app/marketplace/my-sales/page.tsx`
- Sale object has `acceptedPrice` and `acceptedFor` fields

**Fix Required**:
- When `sale.state === 1` (AcceptedToABuyer), display `sale.acceptedPrice` and `sale.acceptedFor`

---

### BUG-4: Accept Button Shows Wrong Accepted Offer (UI Race Condition)
**Status**: PARTIALLY FIXED  
**Priority**: MEDIUM

**Description**: When accepting 105 ETH, UI briefly shows 106 ETH as accepted before correcting.

**Root Cause**: 
- Contract loop was fixed to match buyer AND price
- UI `isAccepting` state applies to all buttons, not tracking which specific offer was clicked

**Files Involved**:
- `frontend/src/app/marketplace/my-sales/page.tsx`

---

### BUG-5: Track Page Shows Wrong Staff Contact
**Status**: ✅ FIXED  
**Priority**: LOW

**Description**: During SalePending state, track page shows Land Inspector wallet instead of Revenue Employee.

**Expected**: Should show BOTH contacts, or the relevant one for current state.

**Files Involved**:
- `frontend/src/app/track/page.tsx` - uses `property.employeeId` which only stores one address

---

## ✅ COMPLETED FIXES (2026-01-04 to 2026-01-05)

### Summary of All Bug Fixes Applied:
| Bug | Status | Files Changed |
|-----|--------|---------------|
| BUG-1: Marketplace before Revenue approval | ✅ FIXED | `marketplace/page.tsx` - checks `property.state === 4` |
| BUG-2: Wrong offer shown | ✅ FIXED | `requested/page.tsx` - fetches `getRequestedUsers()` |
| BUG-3: My Sales not showing accepted info | ✅ FIXED | `my-sales/page.tsx` - shows acceptedPrice, buyer, deadline |
| BUG-4: Accept button UI race condition | ⚠️ PARTIAL | Needs active property ID tracking |
| BUG-5: Track page contacts | ✅ FIXED | `track/page.tsx` - shows both Inspector + Revenue employee |

### Contract Changes (Already Deployed):
- `addPropertyOnSale()` → calls `changeStateToSalePending()` not `changeStateToOnSale()`
- `acceptBuyerRequest()` → matches BOTH buyer address AND price
- `acceptBuyerRequest()` → deadline extended from 5 min to 1 HOUR
- `transferOwnerShip()` → fixed buyer lookup

---

## 🔴 NEW PENDING BUGS (Reported 2026-01-05)

### BUG-7: Transfer to Address Not Working
**Status**: ✅ REVIEWED (2026-01-05)  
**Priority**: CRITICAL  
**Reported**: 2026-01-05

**Description**: Land transfer functionality reported as broken.

**Analysis Result**: Code reviewed - `transferOwnerShip()` logic appears correct. Likely causes:
- Payment deadline passed
- Exact ETH amount not matching `acceptedPrice`
- Caller not the `acceptedFor` buyer

**Recommendation**: Test manually to identify specific failure cause.

**Files Investigated**:
- `contracts/src/TransferOfOwnership.sol` - `transferOwnerShip()` function
- `frontend/src/app/marketplace/requested/page.tsx` - payment flow

---

### BUG-8: Transfer Should Go Through Land Registry Officer
**Status**: ✅ FIXED (2026-01-05)  
**Priority**: HIGH  
**Reported**: 2026-01-05

**Description**: Transfer requests now route through Land Inspector for approval before completion.

**New Flow**:
1. Buyer pays → ETH held in contract, sale state → `TransferPending`
2. Land Inspector views pending transfers in dashboard
3. Land Inspector approves → ETH sent to seller, ownership transfers

**Files Changed**:
- `contracts/src/TransferOfOwnership.sol`
  - Added `TransferPending` state (enum index 7)
  - Added `PendingTransfer` struct and mapping
  - Modified `transferOwnerShip()` to hold ETH in contract
  - Added `approveTransfer()` function for Land Inspector
  - Added `getPendingTransfersByLocation()` getter
- `frontend/src/lib/contracts.ts` - Updated ABI
- `frontend/src/app/inspector/page.tsx` - Added pending transfer approval UI

---

### BUG-9: Get Started Button for Staff
**Status**: ✅ FIXED (2026-01-05)  
**Priority**: MEDIUM  
**Reported**: 2026-01-05

**Description**: Home page "Get Started" button now shows "Launch App" for connected staff wallets.

**Staff Detection**:
- Admin: hardcoded `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Land Inspector: `getInspectorLocation(address) > 0`
- Revenue Employee: `getEmployeeRevenueDept(address) > 0`

**Files Changed**:
- `frontend/src/components/landing/HeroSection.tsx`
  - Added LAND_REGISTRY imports
  - Added ADMIN_ADDRESS constant
  - Added hooks for `getInspectorLocation` and `getEmployeeRevenueDept`
  - Button shows "Launch App" if `isRegistered || isStaff`

---

## 📋 DEFERRED FEATURES

### Staff History Page
- Track which officer approved which property
- Can use blockchain events without database
- Event logs: PropertyVerified, SaleApproved, etc.

### Chat System
- Address-to-address messaging (XMTP recommended)
- Complex feature for post-hackathon

---

## 🔑 KEY CONTRACT STRUCTURES

```solidity
// Property States (Properties.sol)
enum StateOfProperty {
    Created,      // 0 - Initial
    Scheduled,    // 1 - Reserved
    Verified,     // 2 - Inspector approved
    Rejected,     // 3 - Inspector rejected
    OnSale,       // 4 - Revenue approved, IN MARKETPLACE
    Bought,       // 5 - Sold
    SalePending   // 6 - Waiting Revenue approval, NOT IN MARKETPLACE
}

// Sale States (TransferOfOwnership.sol)  
enum SaleState {
    Active,                  // 0
    AcceptedToABuyer,        // 1
    CancelSaleBySeller,      // 2
    Success,                 // 3
    ...
}
```

---

## 🎯 PROMPT FOR NEW CHAT

Copy this to continue work in a new conversation:

```
# Continue DivFlow-Web3 Development

## FIRST: Read ALL workflow files in `.agent/workflows/`:
1. `bottleneck_analysis.md` - Architecture, security analysis
2. `divflow-development.md` - Development roadmap
3. `divflow-bugs.md` - Bug tracking (READ THIS CAREFULLY)
4. `coderabbit-suggestions.md` - Security improvements
5. `deployment-guide.md` - Deployment research
6. `india-land-registry-research.md` - Real India system comparison (NEW)

## CRITICAL: Revert BUG-8 Changes First
The previous session INCORRECTLY added Land Inspector approval AFTER buyer payment.
This is WRONG. The correct flow is:
1. Land Inspector approves registration ✅
2. Seller lists → Revenue approves ✅
3. Buyer pays → Ownership transfers DIRECTLY (no inspector)

Files to revert:
- `contracts/src/TransferOfOwnership.sol` - Remove TransferPending state, approveTransfer()
- `frontend/src/lib/contracts.ts` - Remove new ABI entries
- `frontend/src/app/inspector/page.tsx` - Remove pending transfer UI

## NEW BUGS TO FIX (discovered 2026-01-05):

### BUG-10: Wallet Connection Required
- Users can access Dashboard without connecting wallet
- Should warn/redirect to connect first

### BUG-11: Offer Acceptance UI Delay
- After accepting offer, shows wrong price briefly before correcting
- Need immediate UI update after acceptance

### BUG-12: Duplicate Staff Assignments 🔴 MAJOR
- Same wallet can be assigned to multiple Location IDs or Revenue IDs
- Add checks in `assignLandInspector()` and `mapRevenueDeptIdToEmployee()`

### BUG-7: Dashboard Transfer Button (CLARIFICATION)
- The "Transfer" button in Dashboard (direct address transfer) doesn't work
- This is a DIFFERENT feature from marketplace payment
- Decision: Skip for hackathon, hide/disable the button

## ALREADY COMPLETED (2026-01-05):
- ✅ Pinata server-side upload API (`api/ipfs/upload/route.ts`)
- ✅ BUG-9 fixed: Staff wallets see "Launch App" in HeroSection
- ✅ India land registry research documented

## Tech Stack:
- Next.js 14, Solidity (Foundry), wagmi, viem
- Local: Anvil (31337) on 127.0.0.1:8545, Frontend on localhost:3000

## Start Local Dev:
```bash
cd contracts && anvil                    # Terminal 1
cd contracts && bash setup_and_deploy.sh # Terminal 2  
cd frontend && npm run dev               # Terminal 3
```

## GitHub:
https://github.com/Yug-Baid/DivFlow-Web3-Upgrade
Branch: feature/marketplace-fixes-and-cleanup
```


