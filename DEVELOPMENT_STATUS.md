# DivFlow-Web3 Bug Tracker & Development Status

**Last Updated**: 2026-01-06 17:03 IST
**Project**: `c:\Users\Lenovo\Desktop\Udbhav\DivFlow-Web3-Upgrade`

---

## 📋 Quick Overview

| Status | Count |
|--------|-------|
| ✅ Fixed | 11 |
| 🔴 Remaining | 6 |
| **Total** | **17** |

---

## ✅ COMPLETED ISSUES

### Phase 0: Quick Wins

| Issue | Description | Files Modified |
|-------|-------------|----------------|
| ISSUE-4 | Remove Land Type dropdown - hardcoded to "WithPapers" | `register-land/page.tsx` |
| ISSUE-7 | Revenue Portal reject button with reason input | `LandRegistry.sol`, `contracts.ts`, `revenue/page.tsx` |
| ISSUE-11 | Seller reject offer button on My Sales page | `TransferOfOwnership.sol`, `contracts.ts`, `my-sales/page.tsx` |

### Phase 1: Sales Page Fixes

| Issue | Description | Files Modified |
|-------|-------------|----------------|
| ISSUE-10/13 | Fix offer acceptance UI updates - added `lastAction` state tracking | `my-sales/page.tsx` |
| ISSUE-12 | Fix rejected buyer status display - shows "Outbid"/"Rejected"/"Purchased!" | `requested/page.tsx` |

### Critical Bugs from User Testing

| Issue | Description | Files Modified |
|-------|-------------|----------------|
| ISSUE-15 | Duplicate marketplace listings - frontend deduplication | `marketplace/page.tsx` |
| ISSUE-16 | Revenue rejection flow - store rejection reason | `Properties.sol`, `LandRegistry.sol`, `track/page.tsx` |
| ISSUE-17 | Remove "pending approval" text from marketplace | `marketplace/page.tsx` |
| ISSUE-18 | Remove XCircle icon from revenue reject button | `revenue/page.tsx` |
| ISSUE-19 | Info button on property cards (Inspector, Revenue, Marketplace) | `UserInfoModal.tsx` (new), `inspector/page.tsx`, `revenue/page.tsx`, `marketplace/page.tsx` |

### Phase 2: Security & Access Control

| Issue | Description | Files Modified |
|-------|-------------|----------------|
| ISSUE-1 | Duplicate staff assignment prevention - live check with refetch | `admin/page.tsx` |

---

## 🔴 REMAINING ISSUES

### Phase 2: Security (Completed)

#### ISSUE-2: Registration Guard for Protected Pages
**Priority**: 🟠 HIGH
**Status**: ✅ COMPLETED

### Phase 3: Marketplace UX (Completed)

#### ISSUE-8: Marketplace Photo Rendering
**Priority**: 🟡 MEDIUM
**Status**: ✅ COMPLETED

**Files**: `marketplace/page.tsx`

---

### Phase 4: Register Land Redesign

#### ISSUE-3: Remove Manual ID Entry + Auto-Assignment
**Priority**: 🟠 HIGH
**Status**: NOT STARTED

**Requirements**:
- Auto-generate property IDs instead of manual entry
- Remove redundant ID fields

**Files**: `register-land/page.tsx`, `LandRegistry.sol`

---

#### ISSUE-5: Property Photo/Blueprint Upload
**Priority**: 🟡 MEDIUM
**Status**: NOT STARTED

**Requirements**:
- Add file upload for property photos/blueprints
- Store in IPFS

**Files**: `register-land/page.tsx`

---

#### ISSUE-9: Google Maps Integration
**Priority**: 🟡 MEDIUM
**Status**: NOT STARTED

**Requirements**:
- Add Google Maps picker for property location
- Store coordinates with property

**Files**: `register-land/page.tsx`

---

### Features (Not Bugs)

#### ISSUE-20: Property Ownership History
**Priority**: 🟠 HIGH
**Status**: NOT STARTED

**Requirements**:
- Track complete ownership history per property
- Show: first owner → second owner → etc.
- Display transfer dates and prices

**Files**: `Properties.sol` (may need contract changes), `track/page.tsx`

---

#### ISSUE-21: Staff Action History
**Priority**: 🟠 HIGH
**Status**: NOT STARTED

**Requirements**:
- Land Inspectors see their approval/rejection history
- Revenue Employees see their approval/rejection history
- Build from contract events

**Files**: `inspector/page.tsx`, `revenue/page.tsx`

---

#### ISSUE-22: Re-submit Rejected Land Registration
**Priority**: 🟠 HIGH
**Status**: ✅ COMPLETED

**Files**: `LandRegistry.sol`

---

## 🛠️ Technical Notes

### Contract Deployment
Contracts may need redeployment after modifications:
```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### Running Locally
```bash
# Terminal 1: Start local blockchain
cd contracts
anvil

# Terminal 2: Deploy contracts (after anvil is running)
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Terminal 3: Start frontend
cd frontend
npm run dev
```

### Key Files
- **Contracts**: `contracts/src/` - Solidity smart contracts
- **Contract ABIs**: `frontend/src/lib/contracts.ts`
- **Config**: `frontend/src/lib/config.ts`
- **Pages**: `frontend/src/app/` - Next.js app router pages

### Test Wallets (Anvil)
- Account 0 (Admin): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Other accounts available from Anvil output

---

## 📝 Code Patterns Used

### Contract Read with Refetch
```typescript
const { data, refetch } = useReadContract({...});

useEffect(() => {
    if (condition) refetch();
}, [dependency, refetch]);
```

### Auto-Clear Errors
```typescript
useEffect(() => {
    if (error) {
        const timer = setTimeout(() => clearError(), 5000);
        return () => clearTimeout(timer);
    }
}, [error]);
```

### User Info Modal
Import and use `UserInfoModal` component for showing user details:
```typescript
import { UserInfoModal } from "@/components/UserInfoModal";

<UserInfoModal
    isOpen={!!selectedUserAddress}
    onClose={() => setSelectedUserAddress(null)}
    userAddress={selectedUserAddress || ""}
/>
```
