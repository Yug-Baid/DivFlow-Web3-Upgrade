# 🏗️ DivFlow-Web3 Complete Workflow & Testing Guide

> **Purpose**: Comprehensive guide to understand the website's architecture, user flows, and how to test each feature
> 
> **Last Updated**: 2026-01-08

---

## 📋 Table of Contents

1. [System Architecture](#-system-architecture)
2. [Smart Contracts Overview](#-smart-contracts-overview)
3. [User Roles & Permissions](#-user-roles--permissions)
4. [Property Lifecycle](#-property-lifecycle)
5. [Pinata IPFS Configuration](#-pinata-ipfs-configuration)
6. [Complete Testing Walkthrough](#-complete-testing-walkthrough)
7. [Page-by-Page Guide](#-page-by-page-guide)

---

## 🏛️ System Architecture

### Tech Stack

| **Layer** | **Technology** | **Purpose** |
|-----------|---------------|-------------|
| **Frontend** | Next.js 14 (App Router) | React-based UI with server/client components |
| **Blockchain** | Solidity 0.8.20 + Foundry | Smart contracts on local Anvil network |
| **State Management** | wagmi + viem | Ethereum wallet integration & contract calls |
| **File Storage** | Pinata (IPFS) | Decentralized document storage |
| **Styling** | Tailwind CSS + Framer Motion | Modern UI with animations |
| **Maps** | Leaflet + React Leaflet | Property location visualization |

### Architecture Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │ ───▶ │   MetaMask   │ ───▶ │  Anvil (Local)  │
│  (Next.js)  │      │   (Wallet)   │      │   Blockchain    │
└─────────────┘      └──────────────┘      └─────────────────┘
       │                                             │
       │                                             ▼
       │                                    ┌─────────────────┐
       │                                    │ Smart Contracts │
       │                                    │  - Users.sol    │
       │                                    │  - LandRegistry │
       │                                    │  - Properties   │
       │                                    │  - Transfer     │
       │                                    └─────────────────┘
       ▼
┌─────────────┐
│  Pinata     │
│  (IPFS)     │
│  Documents  │
└─────────────┘
```

---

## 📜 Smart Contracts Overview

### 1. **Users.sol** - User Management

**Purpose**: Manage user registration with privacy-first approach

**Key Features**:
- ✅ **Privacy**: Stores hashed identity (keccak256) instead of plaintext data
- ✅ **Duplicate Prevention**: One Aadhar per address
- ✅ **Pre-check**: Gas-free check before registration

**Main Functions**:
```solidity
registerUser(identityHash, aadharHash)  // Register new user
isUserRegistered(address)               // Check if user exists
isAadharRegistered(aadharHash)         // Check duplicate before registration
```

**Frontend Integration**:
```javascript
// Hash the data client-side before sending
const identityHash = keccak256(encodePacked(firstName, lastName, dob, aadhar))
const aadharHash = keccak256(encodePacked(aadhar))
```

---

### 2. **LandRegistry.sol** - Central Registry

**Purpose**: Main contract for property registration and verification workflow

**Key Features**:
- ✅ **Role Management**: Admin assigns inspectors & revenue employees
- ✅ **Duplicate Prevention**: Prevents same property from being registered twice
- ✅ **Document Security**: Prevents same IPFS hash from being used twice
- ✅ **Location-based**: Properties organized by location ID

**Admin Functions**:
```solidity
assignLandInspector(locationId, inspector)     // Assign inspector to location
mapRevenueDeptIdToEmployee(deptId, employee)   // Assign revenue employee
```

**Citizen Functions**:
```solidity
addLand(locationId, revenueDeptId, surveyNumber, area, ipfsHash, landType)
```

**Inspector Functions**:
```solidity
verifyPropertyByInspector(propertyId)         // Approve registration
rejectPropertyByInspector(propertyId, reason) // Reject with reason
```

**Revenue Employee Functions**:
```solidity
approveSaleRequest(propertyId)                // Approve marketplace listing
rejectSaleRequest(propertyId, reason)         // Reject sale request
```

**View Functions**:
```solidity
getPropertiesOfOwner(address)                 // Get all properties of owner
getPropertiesByLocation(locationId)           // Get all properties in location
getPropertiesByRevenueDeptId(deptId)          // Get all properties in dept
```

---

### 3. **Properties.sol** - Property State Management

**Purpose**: Store and manage property data and state transitions

**Property States**:
```
┌──────────┐
│ Created  │ ──── Initial state when property registered
└──────────┘
     │
     ▼
┌──────────┐
│ Verified │ ──── Inspector approved
└──────────┘
     │
     ▼
┌──────────────┐
│ SalePending  │ ──── Owner requested to sell
└──────────────┘
     │
     ▼
┌──────────┐
│ OnSale   │ ──── Revenue approved, visible on marketplace
└──────────┘
     │
     ▼
┌──────────┐
│ Bought   │ ──── Ownership transferred
└──────────┘

Alternative path:
┌──────────┐
│ Rejected │ ──── Inspector/Revenue rejected
└──────────┘
```

**Property Data Structure**:
```solidity
struct Land {
    uint256 propertyId;
    uint256 locationId;
    uint256 revenueDepartmentId;
    uint256 surveyNumber;
    address owner;
    uint256 area;
    uint256 price;
    uint256 registeredTime;
    address employeeId;         // Who verified/rejected
    string scheduledDate;
    string rejectedReason;
    string ipfsHash;            // IPFS document hash
    StateOfProperty state;
    uint8 landType;             // 0=WithPapers, 1=WithoutPapers
}
```

---

### 4. **TransferOfOwnership.sol** - Marketplace & Sales

**Purpose**: Handle property sales, bids, and ownership transfers

**Sale States**:
```
Active                          ──── Property accepting bids
AcceptedToABuyer               ──── Seller accepted a bid
Success                        ──── Payment completed, ownership transferred
CancelSaleBySeller             ──── Seller cancelled listing
DeadlineOverForPayment         ──── Buyer missed payment deadline
```

**Key Features**:
- ✅ **Multi-Bid System**: Multiple buyers can bid on same property
- ✅ **Revenue Approval Gate**: Properties only appear after revenue approval
- ✅ **Payment Deadline**: 1 hour to complete payment after acceptance
- ✅ **Direct Transfer**: ETH sent directly to seller on payment

**Buyer Functions**:
```solidity
sendPurchaseRequest(saleId, priceOffered)     // Make an offer
transferOwnerShip(saleId) payable             // Pay and complete purchase
```

**Seller Functions**:
```solidity
addPropertyOnSale(propertyId, price)          // List property
acceptBuyerRequest(saleId, buyer, price)      // Accept an offer
rejectBuyerRequest(saleId, buyer, price)      // Reject an offer
```

**Payment Flow**:
1. Buyer sends `transferOwnerShip()` with exact ETH amount
2. Contract validates: correct buyer, correct amount, before deadline
3. ETH transferred to seller immediately
4. Ownership changed on-chain
5. Property state → `Bought`

---

## 👥 User Roles & Permissions

### 1. **Admin** (Account 0)
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Permissions**:
  - ✅ Assign Land Inspectors to locations
  - ✅ Assign Revenue Employees to departments
  - ✅ View all system data
- **Cannot**: Register properties, approve/reject (must assign staff first)

### 2. **Land Inspector** (Account 1)
- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Assigned To**: Location ID (set by admin)
- **Permissions**:
  - ✅ View all properties in their location
  - ✅ Verify property registrations (Created → Verified)
  - ✅ Reject property registrations with reason
- **Workflow**: Physical verification of land claims

### 3. **Revenue Employee** (Account 2)
- **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Assigned To**: Revenue Department ID (set by admin)
- **Permissions**:
  - ✅ View all properties in their department
  - ✅ Approve sale requests (SalePending → OnSale)
  - ✅ Reject sale requests with reason
- **Workflow**: Government approval before marketplace listing

### 4. **Citizen** (Accounts 3-9)
- **Any Address**: Not admin/inspector/revenue
- **Permissions**:
  - ✅ Register as user
  - ✅ Register properties
  - ✅ List properties for sale (after verification)
  - ✅ Make offers on marketplace properties
  - ✅ Accept/reject purchase offers
  - ✅ Complete purchases
- **Workflow**: Property owners and buyers

---

## 🔄 Property Lifecycle

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROPERTY REGISTRATION                        │
└─────────────────────────────────────────────────────────────────────┘

1. CITIZEN REGISTERS PROPERTY
   ├─ Fills form with location, survey number, area
   ├─ Uploads documents to IPFS (Pinata)
   ├─ Calls: LandRegistry.addLand()
   └─ State: Created (Pending Review)

         │
         ▼

2. LAND INSPECTOR VERIFICATION
   ├─ Views properties in their location
   ├─ Physically verifies the claim
   ├─ Options:
   │   ├─ Approve → verifyPropertyByInspector()
   │   │            State: Verified ✓
   │   │
   │   └─ Reject → rejectPropertyByInspector(reason)
   │                State: Rejected ✗
   │                (Owner can re-register with corrections)
   └─ Inspector contact info shown to owner

         │ (if verified)
         ▼

┌─────────────────────────────────────────────────────────────────────┐
│                         MARKETPLACE LISTING                         │
└─────────────────────────────────────────────────────────────────────┘

3. OWNER LISTS FOR SALE
   ├─ Property must be in "Verified" state
   ├─ Sets asking price
   ├─ Calls: TransferOwnership.addPropertyOnSale()
   └─ State: SalePending (Awaiting Revenue Approval)

         │
         ▼

4. REVENUE EMPLOYEE APPROVAL
   ├─ Views sale requests in their department
   ├─ Checks government records
   ├─ Options:
   │   ├─ Approve → approveSaleRequest()
   │   │            State: OnSale ✓
   │   │            (Now visible on marketplace)
   │   │
   │   └─ Reject → rejectSaleRequest(reason)
   │                State: Verified (back to verified)
   │                (Owner can try listing again)
   └─ Revenue contact info shown to owner

         │ (if approved)
         ▼

┌─────────────────────────────────────────────────────────────────────┐
│                        SALE & TRANSFER                              │
└─────────────────────────────────────────────────────────────────────┘

5. BUYERS MAKE OFFERS
   ├─ Browse marketplace (OnSale properties only)
   ├─ Can make multiple bids at different prices
   ├─ Calls: sendPurchaseRequest(saleId, offer)
   └─ Seller sees all offers with buyer addresses

         │
         ▼

6. SELLER ACCEPTS OFFER
   ├─ Reviews all offers
   ├─ Selects buyer + specific price
   ├─ Calls: acceptBuyerRequest(saleId, buyer, price)
   ├─ Sets 1-hour payment deadline
   └─ Buyer notified

         │
         ▼

7. BUYER COMPLETES PAYMENT
   ├─ Must pay within 1 hour
   ├─ Exact amount (in wei) required
   ├─ Calls: transferOwnerShip(saleId) {value: amount}
   ├─ ETH sent directly to seller
   ├─ Ownership transferred on-chain
   └─ State: Bought ✓

┌─────────────────────────────────────────────────────────────────────┐
│                         POST-TRANSFER                               │
└─────────────────────────────────────────────────────────────────────┘

8. NEW OWNER CAN:
   ├─ View property in their dashboard
   ├─ List it for resale (Bought → SalePending again)
   └─ Property history preserved on blockchain
```

---

## 🌐 Pinata IPFS Configuration

### Why IPFS?
- **Decentralized Storage**: Documents stored across IPFS network, not a single server
- **Immutable**: Once uploaded, content can't be changed (content-addressed)
- **Censorship Resistant**: No single point of failure
- **Cost Effective**: Pay only for pinning service (Pinata)

### Setup Steps

#### 1. Create Pinata Account
1. Go to [https://app.pinata.cloud](https://app.pinata.cloud)
2. Sign up for free account
3. Free tier: **100 MB storage** + **100 GB bandwidth/month**

#### 2. Generate API Key

**For Server-Side Upload (RECOMMENDED - More Secure)**:

1. Go to **Developers** → **API Keys**
2. Click **New Key**
3. Select **Admin** key (gives full access)
4. **Important**: Copy the **JWT** token (starts with `eyJ...`)
5. Name it: `DivFlow-Web3-Dev`
6. Click **Create Key**

#### 3. Add to Environment Variables

Create `.env.local` in `frontend/` directory:

```bash
# RECOMMENDED: Server-side upload using JWT
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_jwt_here

# Optional: Group ID to organize uploads
PINATA_GROUP_ID=your_group_id_here
```

**Alternative: Legacy Client-Side Keys** (Less Secure):
```bash
NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
NEXT_PUBLIC_PINATA_SECRET=your_api_secret_here
```

⚠️ **Security Note**: 
- `PINATA_JWT` (server-side) is **never** exposed to browser
- `NEXT_PUBLIC_*` keys are exposed to browser (use only if needed)

#### 4. Restart Next.js Server

```bash
cd frontend
# Stop the dev server (Ctrl+C)
npm run dev
```

#### 5. Test Upload

1. Register a property
2. Upload a PDF/image document
3. Check Pinata dashboard → **Files** to see your upload
4. Property IPFS hash will be visible in blockchain

### How It Works in the App

```javascript
// frontend/src/lib/ipfs.ts

// 1. User selects file in browser
const file = event.target.files[0];

// 2. Upload to IPFS (server-side preferred)
const result = await uploadToIPFS(file);

// 3. Get IPFS CID (Content Identifier)
// Example: QmX8j7kw9fq3K4mN5pQ7rT2sV1uW3xY6zA9bC8dE4fG5hH
const ipfsHash = result.cid;

// 4. Store in smart contract
await landRegistry.addLand(..., ipfsHash, ...);

// 5. Retrieve file URL
const fileUrl = getIPFSUrl(ipfsHash);
// https://gateway.pinata.cloud/ipfs/QmX8j...
```

### Pinata Dashboard Features

**View Uploaded Files**:
- Go to **Files** tab
- See all uploaded documents
- View file metadata (name, size, upload date)
- Get shareable IPFS links

**Monitor Usage**:
- **Account** → **Billing** → View storage & bandwidth
- Track how much of free tier is used

**Manage Files**:
- Pin/Unpin files (unpinning removes from Pinata but not IPFS)
- Add custom metadata
- Organize into groups

### Alternative IPFS Gateways

If Pinata gateway is slow, the app auto-tries these:
- `https://ipfs.io/ipfs/{cid}`
- `https://cloudflare-ipfs.com/ipfs/{cid}`
- `https://dweb.link/ipfs/{cid}`

---

## 🧪 Complete Testing Walkthrough

### Prerequisites
- ✅ Anvil running
- ✅ Contracts deployed
- ✅ Frontend running on http://localhost:3000
- ✅ MetaMask connected to Anvil Local network
- ✅ Pinata configured (optional but recommended)

### Test Accounts Reference

| Account | Address | Private Key (Anvil) | Role |
|---------|---------|---------------------|------|
| 0 | `0xf39Fd...2266` | `0xac0974bec...` | Admin |
| 1 | `0x70997...79C8` | `0x59c6995e...` | Land Inspector |
| 2 | `0x3C44C...93BC` | `0x5de4111a...` | Revenue Employee |
| 3 | `0x90F79...b061` | `0x7c852118...` | Citizen |
| 4-9 | (See Anvil output) | (See Anvil output) | Citizens |

---

### 🎬 **SCENARIO 1: Admin Setup** (5 minutes)

**Account**: Admin (Account 0)

#### Step 1: Connect Wallet
1. Open http://localhost:3000
2. Click **"Connect Wallet"**
3. MetaMask → Select Account 0
4. Approve connection

#### Step 2: Navigate to Admin Dashboard
1. Click **"Get Started"** or **"Launch App"**
2. You'll be auto-redirected to `/admin` page
3. See admin interface with two sections:
   - Assign Land Inspectors
   - Assign Revenue Employees

#### Step 3: Assign Land Inspector
1. **Location ID**: `1` (e.g., Mumbai)
2. **Inspector Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
3. Click **"Assign Inspector"**
4. MetaMask → Confirm transaction
5. Wait for success message

#### Step 4: Assign Revenue Employee
1. **Revenue Dept ID**: `1` (e.g., Maharashtra Revenue Dept)
2. **Employee Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
3. Click **"Assign Employee"**
4. MetaMask → Confirm
5. Success!

**✅ Result**: Staff assigned and ready to verify properties

---

### 🎬 **SCENARIO 2: Citizen Registration & Property Submission** (10 minutes)

**Account**: Citizen (Account 3)

#### Step 1: Switch Account
1. MetaMask → Switch to Account 3
2. Refresh page or disconnect/reconnect

#### Step 2: Register as User
1. Go to http://localhost:3000
2. Click **"Get Started"**
3. You'll be redirected to `/register` page
4. Fill the form:
   - **First Name**: `Raj`
   - **Last Name**: `Sharma`
   - **Date of Birth**: `1990-01-15`
   - **Aadhar Number**: `123456789012`
5. Click **"Register"**
6. MetaMask → Confirm (gas fee ~0.0003 ETH)
7. Wait for "Registration successful!" message
8. Auto-redirect to `/dashboard`

#### Step 3: Register Property
1. From dashboard, click **"Register Land"** button
2. Or navigate to `/register-land`
3. Fill the property form:

**Property Details**:
- **Location ID**: `1` (must match inspector's location)
- **Revenue Department ID**: `1` (must match revenue employee's dept)
- **Survey Number**: `101` (unique identifier)
- **Area** (in sq ft): `5000`
- **Land Type**: `With Papers` (existing registered land)

**Documents** (if Pinata configured):
- Click **"Choose File"**
- Select a PDF, image, or document (< 10 MB recommended)
- Wait for "Uploading to IPFS..." indicator
- You'll see IPFS hash once uploaded (e.g., `QmX8j...`)

**Alternative** (if no Pinata):
- Use sample IPFS hash: `QmSampleHash123456` (for testing only)

4. Click **"Register Property"**
5. MetaMask → Confirm (gas fee ~0.002 ETH)
6. Wait for success message
7. Property ID will be displayed (e.g., "Property #1")

#### Step 4: View Property Status
1. Return to `/dashboard`
2. See your property card with:
   - Status: **"Created"** (Pending Review)
   - Survey Number: 101
   - Area: 5000 sq ft
   - Message: "Awaiting Inspector Verification"

**✅ Result**: Property registered and waiting for inspector approval

---

### 🎬 **SCENARIO 3: Land Inspector Verification** (5 minutes)

**Account**: Land Inspector (Account 1)

#### Step 1: Switch to Inspector Account
1. MetaMask → Switch to Account 1
2. Refresh page

#### Step 2: View Inspector Dashboard
1. Navigate to `/inspector`
2. See all properties in Location ID 1
3. Find the property registered by Citizen (Survey #101)
4. Property card shows:
   - Status: **Created**
   - Owner: `0x90F79...` (Account 3)
   - Documents: IPFS link (click to view)

#### Step 3: Verify Property
1. Click **"Verify"** button on the property card
2. MetaMask → Confirm
3. Success message: "Property verified successfully!"

**Alternative: Reject Property**:
1. Click **"Reject"** instead
2. Enter reason: "Boundary mismatch with survey records"
3. Confirm
4. Property state → Rejected (owner can re-register)

#### Step 4: Verify Status
1. Property card now shows:
   - Status: **Verified** ✓
   - Verified by: Your address
   - Green checkmark icon

**✅ Result**: Property approved and ready for owner to list for sale

---

### 🎬 **SCENARIO 4: List Property for Sale** (7 minutes)

**Account**: Citizen (Account 3 - property owner)

#### Step 1: Switch Back to Owner
1. MetaMask → Switch to Account 3
2. Go to `/dashboard`

#### Step 2: Initiate Sale
1. Find your verified property (Survey #101)
2. Status should show: **Verified** ✓
3. Click **"Sell Property"** button
4. Modal/form appears

#### Step 3: Set Price
1. **Asking Price**: `2` ETH (this is in ETH, will be converted to wei)
2. Click **"List for Sale"**
3. MetaMask → Confirm
4. Success: "Sale request submitted!"

#### Step 4: Check Status
1. Property card updated:
   - Status: **Sale Pending**
   - Price: 2 ETH
   - Message: "Awaiting Revenue Department Approval"

**✅ Result**: Sale request submitted, waiting for revenue employee

---

### 🎬 **SCENARIO 5: Revenue Employee Approval** (5 minutes)

**Account**: Revenue Employee (Account 2)

#### Step 1: Switch to Revenue Account
1. MetaMask → Switch to Account 2
2. Navigate to `/revenue`

#### Step 2: View Sale Requests
1. See all properties in Revenue Dept ID 1
2. Filter: **"Sale Pending"** tab
3. Find property Survey #101
4. Property card shows:
   - Owner: Account 3
   - Price: 2 ETH
   - Status: Sale Pending

#### Step 3: Approve Sale
1. Click **"Approve Sale"** button
2. MetaMask → Confirm
3. Success: "Sale approved for marketplace!"

**Alternative: Reject Sale**:
1. Click **"Reject"** instead
2. Enter reason: "Property tax not paid"
3. Confirm
4. Status → Back to Verified (owner can try again)

#### Step 4: Verify Marketplace
1. Navigate to `/marketplace`
2. Property now visible to all users!
3. Shows:
   - Listed Price: 2 ETH
   - Owner: Account 3
   - Survey Number: 101
   - **"Make Offer"** button visible

**✅ Result**: Property live on marketplace!

---

### 🎬 **SCENARIO 6: Buyer Makes Offer** (7 minutes)

**Account**: Buyer (Account 4)

#### Step 1: Switch to Buyer Account
1. MetaMask → Switch to Account 4
2. **First time?** Register as user first (see Scenario 2, Step 2)

#### Step 2: Browse Marketplace
1. Navigate to `/marketplace`
2. See property Survey #101
3. Click on property card for details
4. View:
   - Property details
   - Document links (IPFS)
   - Map location
   - Current price: 2 ETH

#### Step 3: Make First Offer
1. Click **"Make Offer"** button
2. **Offer Amount**: `1.8` ETH
3. Click **"Submit Offer"**
4. MetaMask → Confirm (no ETH transferred yet, just small gas fee)
5. Success: "Offer submitted!"

#### Step 4: Make Additional Offers
1. Same property, click **"Make Offer"** again
2. **Offer Amount**: `2.5` ETH (higher offer)
3. Submit
4. Confirm
5. Now you have **2 active offers** on same property

#### Step 5: View Your Offers
1. Navigate to `/marketplace/requested`
2. See all your purchase requests
3. Each shows:
   - Property: Survey #101
   - Your offer: 1.8 ETH and 2.5 ETH (separate entries)
   - Status: **Pending Seller Response**

**✅ Result**: Buyer offers submitted, seller will see both

---

### 🎬 **SCENARIO 7: Seller Accepts Offer** (10 minutes)

**Account**: Seller (Account 3)

#### Step 1: Switch to Seller
1. MetaMask → Switch to Account 3
2. Navigate to `/marketplace/my-sales`

#### Step 2: View Offers
1. Find your property (Survey #101)
2. Click **"View Offers"** or expand card
3. See all offers:
   - Buyer: `0x15d34...` (Account 4)
   - Offer 1: 1.8 ETH
   - Offer 2: 2.5 ETH
4. Each has **Accept** and **Reject** buttons

#### Step 3: Accept Higher Offer
1. Click **"Accept"** on the 2.5 ETH offer
2. Confirm modal showing:
   - Buyer: Account 4
   - Price: 2.5 ETH
   - Payment deadline: 1 hour from now
3. Click **"Confirm Acceptance"**
4. MetaMask → Confirm transaction
5. Success: "Offer accepted! Buyer has 1 hour to pay."

#### Step 4: Check Acceptance Status
1. Property card updated:
   - Status: **Accepted to Buyer**
   - Accepted Price: 2.5 ETH
   - Deadline: (timestamp)
   - Buyer can now complete payment

**⚠️ Important**: 
- Only the **specific offer** (buyer + price combo) is accepted
- Buyer must pay exactly 2.5 ETH, not more, not less
- If deadline passes, sale auto-fails

**✅ Result**: Offer accepted, waiting for buyer payment

---

### 🎬 **SCENARIO 8: Complete Purchase** (Final Step - 10 minutes)

**Account**: Buyer (Account 4)

#### Step 1: Switch to Buyer
1. MetaMask → Switch to Account 4
2. Navigate to `/marketplace/requested`

#### Step 2: View Accepted Offer
1. Find property Survey #101
2. Status: **Seller Accepted Your Offer!**
3. Card shows:
   - Accepted Price: 2.5 ETH
   - Payment deadline: (countdown timer)
   - **"Complete Purchase"** button is now active

#### Step 3: Check Your Balance
1. MetaMask → Check you have at least 2.5 ETH
2. (Anvil accounts start with 10,000 ETH, so you're good!)

#### Step 4: Complete Payment
1. Click **"Complete Purchase"** button
2. Modal shows:
   - Property: Survey #101
   - Amount due: 2.5 ETH
   - Recipient: Account 3 (seller)
   - Gas fee: ~0.005 ETH
3. Click **"Pay Now"**
4. MetaMask → **READ CAREFULLY**:
   - Value: 2.5 ETH (+ gas)
   - This will transfer real ETH to seller!
5. Confirm transaction
6. Wait for blockchain confirmation (~2 seconds on Anvil)
7. Success: "Property purchased! Ownership transferred."

#### Step 5: Verify Ownership Transfer

**As Buyer (Account 4)**:
1. Go to `/dashboard`
2. See property Survey #101 now in **"My Properties"**
3. Status: **Bought** ✓
4. You are now the owner!

**As Seller (Account 3)**:
1. Switch to Account 3
2. Check MetaMask balance → +2.5 ETH received!
3. Go to `/dashboard`
4. Property Survey #101 no longer in your list (transferred out)

**On Blockchain**:
1. Open Anvil terminal
2. See transaction logs:
   ```
   eth_sendRawTransaction
   Transaction: 0xabc123...
   From: 0x15d34... (Account 4)
   To: TransferOwnership contract
   Value: 2,500,000,000,000,000,000 wei (2.5 ETH)
   Gas used: 234,567
   Status: Success ✓
   ```

**✅ Result**: 
- Buyer owns property
- Seller received 2.5 ETH
- Ownership recorded on blockchain
- Property can be resold by new owner!

---

## 📱 Page-by-Page Guide

### `/` - Landing Page
**Components**:
- Navbar with Connect Wallet
- Hero section with animated background
- Features showcase
- How it works timeline
- Security features
- Call-to-action
- Footer with social links

**Actions**:
- Click "Get Started" → Redirects based on role
- Connect wallet → Auto-detects role

---

### `/register` - User Registration
**Who**: New users (not yet registered)

**Fields**:
- First Name
- Last Name
- Date of Birth
- Aadhar Number (12 digits)

**Validation**:
- Checks if Aadhar already registered (before transaction)
- Checks if wallet already registered
- Hashes data before sending to blockchain

**Next**: Auto-redirect to `/dashboard` on success

---

### `/dashboard` - Universal Dashboard
**Smart Routing**:
- Admin → Shows admin controls
- Inspector → Shows inspector tools + properties
- Revenue → Shows revenue tools + properties
- Citizen → Shows personal properties + actions

**Features**:
- Role detection badge
- Quick stats (properties owned, pending, etc.)
- Property cards with status
- Quick actions (Register Land, View Marketplace)

---

### `/admin` - Admin Panel
**Who**: Contract owner only

**Features**:
- Assign Land Inspectors form
- Assign Revenue Employees form
- View assigned staff list
- System overview

**Validations**:
- Prevents duplicate assignments
- Shows existing assignments

---

### `/inspector` - Inspector Dashboard
**Who**: Assigned land inspectors only

**Features**:
- View all properties in assigned location
- Filter by status (Created, Verified, Rejected)
- Property cards with:
  - Owner info
  - Document links
  - Map location
  - Verify/Reject buttons

**Actions**:
- Verify property → Changes state to Verified
- Reject property → Requires reason, allows re-registration

---

### `/revenue` - Revenue Dashboard
**Who**: Assigned revenue employees only

**Features**:
- View all properties in assigned department
- Tabs:
  - Sale Pending (needs approval)
  - On Sale (approved)
  - All Properties
- Property cards with sale info

**Actions**:
- Approve sale → Property visible on marketplace
- Reject sale → Back to Verified state with reason

---

### `/register-land` - Property Registration
**Who**: Registered citizens only

**Form Fields**:
- Location ID (number)
- Revenue Department ID (number)
- Survey Number (unique ID)
- Area (in sq ft)
- Land Type (With/Without Papers)
- Document Upload (PDF/Image to IPFS)

**Process**:
1. Fill form
2. Upload document to Pinata IPFS
3. Get IPFS hash (CID)
4. Submit transaction with hash
5. Property created with "Created" status

**Map Integration**:
- Click on map to set location
- Coordinates stored in frontend (future: on-chain)

---

### `/marketplace` - Property Marketplace
**Who**: All registered users

**Shows**: Only properties with **OnSale** status (revenue approved)

**Features**:
- Property grid/list view
- Filters:
  - Price range
  - Location
  - Area size
- Search by survey number
- Property cards show:
  - Price
  - Location
  - Area
  - Owner (anonymized)
  - "Make Offer" button

**Click Property**:
- Goes to `/marketplace/[id]` for details

---

### `/marketplace/[id]` - Property Details
**Dynamic Route**: `/marketplace/123` (property ID)

**Shows**:
- Full property information
- All uploaded documents (IPFS links)
- Map with location marker
- Owner information
- Current price
- Property history (registration date, verifications)

**Actions**:
- Make Offer (if buyer)
- View Document (opens IPFS gateway)
- Share property link

---

### `/marketplace/my-sales` - Seller Dashboard
**Who**: Users who listed properties

**Features**:
- All your listed properties
- Active sales status
- **Offers received** section:
  - Buyer address
  - Offered price
  - Accept/Reject buttons
- Accepted offer details:
  - Payment deadline
  - Accepted buyer
  - Waiting for payment status

**Actions**:
- Accept offer → Sets deadline for buyer
- Reject offer → Buyer can re-offer
- Cancel sale → Remove from marketplace

---

### `/marketplace/requested` - Buyer Dashboard
**Who**: Users who made offers

**Shows**:
- All properties you made offers on
- Your offer status:
  - Pending (waiting for seller)
  - Accepted (ready to pay)
  - Rejected (can re-offer)
  - Completed (you bought it)

**Actions**:
- Complete Purchase (if accepted)
- Make another offer
- Cancel offer

---

### `/track` - Property Tracking
**Who**: All users

**Features**:
- Search property by ID or survey number
- View complete property history:
  - Registration timestamp
  - Inspector verification
  - Revenue approvals
  - Sale history
  - Ownership transfers
- Timeline view with all events

---

## 🎯 Testing Checklist

### ✅ Admin Flow
- [ ] Assign Land Inspector to Location 1
- [ ] Assign Revenue Employee to Dept 1
- [ ] Verify assignments show in dashboard
- [ ] Try reassigning to different location (should work)
- [ ] Try assigning same wallet to multiple locations (should fail)

### ✅ Citizen Flow
- [ ] Register as user with unique Aadhar
- [ ] Try registering with same Aadhar (should fail)
- [ ] Register property with documents
- [ ] View property in dashboard (status: Created)
- [ ] Try registering duplicate property (should fail)

### ✅ Inspector Flow
- [ ] View properties in assigned location
- [ ] Verify a property
- [ ] Reject a property with reason
- [ ] Verify rejection reason is stored
- [ ] Check inspector ID is recorded on property

### ✅ Revenue Flow
- [ ] View sale requests (SalePending)
- [ ] Approve a sale request
- [ ] Reject a sale request with reason
- [ ] Verify property appears on marketplace after approval

### ✅ Marketplace Flow
- [ ] List verified property for sale
- [ ] Property shows in "Sale Pending" (not marketplace yet)
- [ ] After revenue approval, property shows on marketplace
- [ ] Make offer as buyer
- [ ] Make multiple offers (different prices)
- [ ] View offers as seller
- [ ] Accept specific offer
- [ ] Reject an offer
- [ ] Complete payment within deadline
- [ ] Verify ownership transfer
- [ ] Verify ETH transfer to seller
- [ ] Try paying after deadline (should fail)
- [ ] Try paying wrong amount (should fail)

### ✅ IPFS Flow
- [ ] Upload PDF document
- [ ] Upload image
- [ ] View document via IPFS gateway
- [ ] Verify IPFS hash stored on-chain
- [ ] Try uploading same document twice (should fail - duplicate prevention)

### ✅ Edge Cases
- [ ] Unregistered user tries to register property (should fail)
- [ ] User tries to list unverified property (should fail)
- [ ] Non-owner tries to list property (should fail)
- [ ] User tries to buy their own property (should fail)
- [ ] Inspector tries to verify property in different location (should fail)
- [ ] Revenue tries to approve property in different dept (should fail)

---

## 🐛 Common Issues & Solutions

### Issue: "User not registered"
**Solution**: Go to `/register` and register first

### Issue: "Only assigned Land Inspector can call this function"
**Solution**: Admin must assign inspector to correct location ID

### Issue: "Property must be Verified before listing for sale"
**Solution**: Wait for inspector verification first

### Issue: "Property not visible on marketplace"
**Solution**: Revenue employee must approve sale request first

### Issue: "Transaction failed: insufficient funds"
**Solution**: Make sure you have enough ETH (check MetaMask balance)

### Issue: "IPFS upload failed"
**Solution**: 
1. Check Pinata API keys in `.env.local`
2. Verify keys are correct
3. Check Pinata account limits (free tier: 100 MB)
4. Try uploading smaller file (< 10 MB)

### Issue: "Wrong network"
**Solution**: 
1. MetaMask → Switch to "Anvil Local" network
2. RPC: http://localhost:8545
3. Chain ID: 31337

### Issue: "Contract not deployed"
**Solution**:
1. Make sure Anvil is running
2. Redeploy contracts: `cd contracts && bash setup_and_deploy.sh`

---

## 🚀 Next Steps

Now that you understand the complete workflow, you're ready to:

1. ✅ Test all scenarios with different accounts
2. ✅ Explore the codebase and modify features
3. ✅ Add new features (suggestions welcome!)
4. ✅ Deploy to testnet (Sepolia) for public testing
5. ✅ Optimize gas costs
6. ✅ Add more UI enhancements

**Ready to add features?** Let me know what you'd like to build next! 🎉
