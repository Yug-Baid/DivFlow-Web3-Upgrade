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

## DEFERRED FEATURES

### Staff History Page
- Track which officer approved which property
- Can use blockchain events without database
- Event logs: PropertyVerified, SaleApproved, etc.

### Chat System
- Address-to-address messaging
- Complex feature for later

---

## CONTRACT CHANGES MADE (NEED REDEPLOY)

### TransferOfOwnership.sol (Updated 2026-01-04)
1. `addPropertyOnSale()` - now calls `changeStateToSalePending()` instead of `changeStateToOnSale()`
2. `acceptBuyerRequest()` - loop now matches BOTH buyer address AND price
3. `acceptBuyerRequest()` - deadline extended from 5 minutes to 1 HOUR
4. `transferOwnerShip()` - fixed buyer lookup to match BOTH address AND acceptedPrice

---

## KEY CONTRACT STRUCTURES

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

## PROMPT FOR NEW CHAT

Copy this prompt to start a new chat:

```
I'm continuing work on DivFlow-Web3 land registry project. 

FIRST: Read ALL workflow files in .agent/workflows/ folder:
1. bottleneck_analysis.md - Architecture overview and workflow understanding
2. divflow-development.md - Development setup and previous work done  
3. divflow-bugs.md - Current bugs with root cause analysis

After reading, focus on fixing:
1. BUG-1: Marketplace showing before Revenue approval - need to check property.state === 4 (OnSale)
2. BUG-2: My Requests showing wrong offer - need to fetch buyer's actual offer from getRequestedUsers()

Test commands:
- cd contracts && bash setup_and_deploy.sh
- npm run dev (in frontend folder)
```
