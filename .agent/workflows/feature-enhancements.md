---
description: Implementation workflow for 4 new features - ETH/INR converter, Inspector-Revenue chat, map address autocomplete, enhanced dashboard
---

# 🚀 DivFlow Feature Enhancements - Implementation Workflow

> **Created**: 2026-01-08  
> **Status**: Planning Phase  
> **Total Features**: 4  
> **Estimated Time**: 8-12 hours

---

## 📋 Feature Overview

| # | Feature | Complexity | Priority | Estimated Time |
|---|---------|------------|----------|----------------|
| 1 | ETH to INR Price Converter | 🟢 Low | High | 1-2 hours |
| 2 | Inspector-Revenue Chat System | 🔴 High | Medium | 4-5 hours |
| 3 | Map Address Autocomplete | 🟡 Medium | High | 2-3 hours |
| 4 | Enhanced Dashboard Land Details | 🟢 Low | Medium | 1-2 hours |

**Recommended Implementation Order**: 1 → 4 → 3 → 2

---

## 🎯 FEATURE 1: Real-Time ETH to INR Price Converter

### 📝 Description
Add a live ETH/INR price display so citizens can estimate property prices in INR when listing or buying properties.

### 🎨 UI/UX Design

**Location**: Multiple places
1. **Dashboard** - Top right corner (always visible)
2. **Marketplace** - Near property price
3. **Register Land** - In the price input section
4. **My Sales** - Next to listing price

**Component Design**:
```
┌─────────────────────────────────────┐
│  💱 ETH Price Converter             │
├─────────────────────────────────────┤
│  1 ETH = ₹3,45,678.90               │
│  Last updated: 2 mins ago           │
│                                     │
│  [2.5 ETH] = ₹8,64,197.25          │
│  ↑ Enter amount                     │
└─────────────────────────────────────┘
```

### 🔧 Technical Implementation

#### Step 1: Choose Price API
**Options**:
1. **CoinGecko API** (Free tier: 50 calls/min)
   - Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr`
   - ✅ No API key needed for basic use
   - ✅ Most reliable
   
2. **CryptoCompare** (Free tier: 100k calls/month)
   - Endpoint: `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=INR`
   - ✅ Real-time updates

**Recommended**: CoinGecko (simpler, no auth)

#### Step 2: Create API Route
**File**: `frontend/src/app/api/eth-price/route.ts`

```typescript
// Server-side API to fetch ETH price (avoids CORS)
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr&include_24hr_change=true',
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      price: data.ethereum.inr,
      change24h: data.ethereum.inr_24h_change,
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Create Price Hook
**File**: `frontend/src/hooks/useEthPrice.ts`

```typescript
import { useState, useEffect } from 'react';

interface EthPrice {
  inr: number;
  change24h: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export function useEthPrice(refreshInterval = 60000) {
  const [priceData, setPriceData] = useState<EthPrice>({
    inr: 0,
    change24h: 0,
    loading: true,
    error: null,
    lastUpdated: 0
  });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/eth-price');
        const data = await response.json();
        
        if (data.success) {
          setPriceData({
            inr: data.price,
            change24h: data.change24h,
            loading: false,
            error: null,
            lastUpdated: data.timestamp
          });
        }
      } catch (error) {
        setPriceData(prev => ({ ...prev, loading: false, error: 'Failed to load price' }));
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return priceData;
}
```

#### Step 4: Create Price Display Component
**File**: `frontend/src/components/shared/EthPriceConverter.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useEthPrice } from '@/hooks/useEthPrice';
import { formatDistance } from 'date-fns';

interface Props {
  defaultAmount?: number;
  showConverter?: boolean;
  compact?: boolean;
}

export function EthPriceConverter({ defaultAmount = 1, showConverter = true, compact = false }: Props) {
  const { inr, change24h, loading, error, lastUpdated } = useEthPrice();
  const [amount, setAmount] = useState(defaultAmount.toString());

  const ethAmount = parseFloat(amount) || 0;
  const inrAmount = ethAmount * inr;

  if (loading) return <div className="text-sm text-muted-foreground">Loading price...</div>;
  if (error) return null;

  const isPositive = change24h >= 0;
  const timeAgo = formatDistance(new Date(lastUpdated), new Date(), { addSuffix: true });

  if (compact) {
    return (
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">1 ETH =</span>
          <span className="font-semibold">₹{inr.toLocaleString('en-IN')}</span>
          <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change24h).toFixed(2)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          💱 ETH Price Converter
        </h3>
        <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change24h).toFixed(2)}% (24h)
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">1 ETH =</span>
          <span className="font-bold text-lg">₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Updated {timeAgo}
        </div>
      </div>

      {showConverter && (
        <>
          <div className="border-t pt-3">
            <label className="text-xs text-muted-foreground mb-1 block">Convert Amount</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Enter ETH amount"
                step="0.1"
                min="0"
              />
              <span className="text-sm font-medium">ETH</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">=</span>
            <span className="font-bold text-lg text-primary">
              ₹{inrAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
```

#### Step 5: Integrate in Pages

**A) Dashboard** (`dashboard/page.tsx`):
```typescript
import { EthPriceConverter } from '@/components/shared/EthPriceConverter';

// Add to the top right of dashboard
<div className="flex justify-between items-center mb-6">
  <h1>Dashboard</h1>
  <EthPriceConverter compact showConverter={false} />
</div>
```

**B) Marketplace** (`marketplace/page.tsx`):
```typescript
// Add in sidebar or top section
<EthPriceConverter />
```

**C) Register Land** (`register-land/page.tsx`):
```typescript
// Add near price input (will do in Feature 3)
```

### ✅ Testing Checklist
- [ ] API route returns valid price data
- [ ] Price updates every 60 seconds
- [ ] Converter calculates correctly
- [ ] Shows 24h change indicator
- [ ] Displays relative time
- [ ] Works in all locations (dashboard, marketplace)
- [ ] Handles API failures gracefully

### 📦 Dependencies
```bash
npm install date-fns  # For relative time formatting
```

---

## 🎯 FEATURE 2: Inspector-Revenue Chat System

### 📝 Description
Enable real-time chat between Land Inspectors and Revenue Employees for specific properties, allowing them to discuss verification details before approval.

### 🎨 UI/UX Design

**Location**: Property detail pages for inspectors and revenue employees

**Chat Panel Design**:
```
┌────────────────────────────────────────┐
│  💬 Discussion (Property #123)         │
│  Land Inspector ↔ Revenue Employee     │
├────────────────────────────────────────┤
│  [Inspector] 2 hours ago               │
│  I verified the boundary markers.      │
│  Documents look authentic.             │
│                                        │
│  [Revenue] 1 hour ago                  │
│  Can you confirm the survey number?   │
│  Records show minor discrepancy.       │
│                                        │
│  [Inspector] 30 mins ago               │
│  Survey #101 matches government docs.  │
│                                        │
│  [You (Revenue)] 5 mins ago            │
│  Perfect, approving now. Thanks!       │
├────────────────────────────────────────┤
│  [Type your message here...    ] [Send]│
└────────────────────────────────────────┘
```

### 🔧 Technical Implementation

#### Architecture Decision: On-Chain vs Off-Chain

**Option 1: On-Chain (Simple, No Backend)**
- ✅ Fully decentralized
- ✅ Permanent record
- ❌ Gas fees for each message (~$0.50-$5 depending on network)
- ❌ Not real-time (needs transaction confirmation)

**Option 2: Off-Chain with DB (Complex, Needs Backend)**
- ✅ Free messaging
- ✅ Real-time updates
- ❌ Needs database (PostgreSQL/MongoDB)
- ❌ Needs WebSocket server
- ❌ Centralized storage

**Option 3: Hybrid - IPFS + Event Log (RECOMMENDED)**
- ✅ Low gas (only store IPFS hash)
- ✅ Decentralized storage
- ✅ Moderate cost (~$0.10 per message)
- ✅ Permanent record
- ⚠️ Not real-time (refresh needed)

**Chosen**: Option 3 (Hybrid)

#### Step 1: Update Smart Contract

**File**: `contracts/src/LandRegistry.sol`

Add messaging functionality:

```solidity
// Events
event MessageSent(
    uint256 indexed propertyId,
    address indexed sender,
    string ipfsHash,
    uint256 timestamp
);

// Structures
struct Message {
    address sender;
    string ipfsHash;  // IPFS hash of message content
    uint256 timestamp;
    bool isInspector;  // true if from inspector, false if from revenue
}

// Mappings
mapping(uint256 => Message[]) private propertyMessages;

// Only inspector or revenue employee for this property
modifier onlyAuthorizedForProperty(uint256 _propertyId) {
    uint256 locationId = getLocationId(_propertyId);
    uint256 revenueDeptId = getRevenueDeptId(_propertyId);
    
    bool isInspector = msg.sender == landInspectorByLocation[locationId];
    bool isRevenue = msg.sender == revenueDeptIdToEmployee[revenueDeptId];
    
    require(
        isInspector || isRevenue,
        "Only assigned inspector or revenue employee can message"
    );
    _;
}

// Send message
function sendMessage(
    uint256 _propertyId,
    string memory _ipfsHash
) public onlyAuthorizedForProperty(_propertyId) {
    uint256 locationId = getLocationId(_propertyId);
    bool isInspector = msg.sender == landInspectorByLocation[locationId];
    
    Message memory newMessage = Message({
        sender: msg.sender,
        ipfsHash: _ipfsHash,
        timestamp: block.timestamp,
        isInspector: isInspector
    });
    
    propertyMessages[_propertyId].push(newMessage);
    
    emit MessageSent(_propertyId, msg.sender, _ipfsHash, block.timestamp);
}

// Get all messages for a property
function getPropertyMessages(uint256 _propertyId)
    public
    view
    onlyAuthorizedForProperty(_propertyId)
    returns (Message[] memory)
{
    return propertyMessages[_propertyId];
}

// Get message count
function getMessageCount(uint256 _propertyId) public view returns (uint256) {
    return propertyMessages[_propertyId].length;
}
```

#### Step 2: Redeploy Contract

```bash
cd contracts
forge build
bash setup_and_deploy.sh
```

#### Step 3: Create Message Upload Utility

**File**: `frontend/src/lib/messaging.ts`

```typescript
import { uploadToIPFS } from './ipfs';

export interface ChatMessage {
  content: string;
  sender: string;
  timestamp: number;
  propertyId: number;
}

export async function uploadMessage(message: ChatMessage): Promise<string> {
  const blob = new Blob([JSON.stringify(message)], { type: 'application/json' });
  const file = new File([blob], `message-${Date.now()}.json`, { type: 'application/json' });
  
  const result = await uploadToIPFS(file);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to upload message');
  }
  
  return result.cid!;
}

export async function fetchMessage(ipfsHash: string): Promise<ChatMessage> {
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
  return response.json();
}
```

#### Step 4: Create Chat Component

**File**: `frontend/src/components/PropertyChat.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from '@/lib/contracts';
import { uploadMessage, fetchMessage, ChatMessage } from '@/lib/messaging';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  propertyId: number;
  userRole: 'inspector' | 'revenue';
}

export function PropertyChat({ propertyId, userRole }: Props) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const { writeContract } = useWriteContract();

  // Load messages
  const { data: messageData, refetch } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: 'getPropertyMessages',
    args: [BigInt(propertyId)]
  });

  useEffect(() => {
    if (!messageData) return;
    
    const loadMessages = async () => {
      setLoading(true);
      try {
        const msgs = messageData as any[];
        const loadedMessages = await Promise.all(
          msgs.map(async (msg) => {
            const chatMsg = await fetchMessage(msg.ipfsHash);
            return chatMsg;
          })
        );
        setMessages(loadedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
      setLoading(false);
    };

    loadMessages();
  }, [messageData]);

  const handleSend = async () => {
    if (!newMessage.trim() || !address) return;
    
    setSending(true);
    try {
      // Create message object
      const message: ChatMessage = {
        content: newMessage.trim(),
        sender: address,
        timestamp: Date.now(),
        propertyId
      };

      // Upload to IPFS
      const ipfsHash = await uploadMessage(message);

      // Send transaction
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: 'sendMessage',
        args: [BigInt(propertyId), ipfsHash]
      }, {
        onSuccess: () => {
          setNewMessage('');
          // Refresh messages after a delay
          setTimeout(() => refetch(), 2000);
        },
        onError: (error) => {
          console.error('Send failed:', error);
          alert('Failed to send message');
        }
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to upload message');
    }
    setSending(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h3 className="font-semibold flex items-center gap-2">
          💬 Discussion
          <span className="text-sm text-muted-foreground font-normal">
            (Property #{propertyId})
          </span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Land Inspector ↔ Revenue Employee
        </p>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the discussion!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender.toLowerCase() === address?.toLowerCase();
            return (
              <div
                key={idx}
                className={`rounded-lg p-3 ${
                  isMe
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {isMe ? 'You' : userRole === 'inspector' ? 'Revenue Employee' : 'Land Inspector'}
                  {' • '}
                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </div>
                <div className="text-sm">{msg.content}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message here..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Step 5: Integrate in Inspector & Revenue Pages

**Inspector Page**:
```typescript
// In property detail view
{selectedProperty && (
  <PropertyChat
    propertyId={selectedProperty.propertyId}
    userRole="inspector"
  />
)}
```

**Revenue Page**:
```typescript
// In property detail view
{selectedProperty && (
  <PropertyChat
    propertyId={selectedProperty.propertyId}
    userRole="revenue"
  />
)}
```

### ✅ Testing Checklist
- [ ] Contract compiles and deploys
- [ ] Inspector can send messages
- [ ] Revenue employee can see inspector's messages
- [ ] Messages stored on IPFS
- [ ] IPFS hash stored on-chain
- [ ] Only authorized users can chat
- [ ] Messages display in correct order
- [ ] Refresh shows new messages
- [ ] Gas cost is reasonable (<$0.50 per message on testnet)

### 📦 Dependencies
Already have everything needed!

---

## 🎯 FEATURE 3: Map Address Autocomplete

### 📝 Description
Auto-fill address when user clicks on map, with reverse geocoding to convert coordinates to human-readable address.

### 🎨 UI/UX Design

**Location**: Register Land page

**Workflow**:
```
1. User clicks on map
   ↓
2. Map shows marker at clicked location
   ↓
3. Reverse geocoding API called
   ↓
4. Address field auto-fills:
   "123 Main Street, Andheri West, Mumbai, Maharashtra 400053, India"
   ↓
5. User can edit the address if needed
```

**Component Design**:
```
┌─────────────────────────────────────────┐
│  📍 Property Location                   │
├─────────────────────────────────────────┤
│  Click on map to set location           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │         [MAP VIEW]              │   │
│  │           📍 Marker             │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Address Line:                          │
│  ┌─────────────────────────────────┐   │
│  │ 123 Main St, Andheri, Mumbai... │   │
│  └─────────────────────────────────┘   │
│  ✏️ Edit address if needed              │
│                                         │
│  Coordinates: 19.1234, 72.5678          │
└─────────────────────────────────────────┘
```

### 🔧 Technical Implementation

#### Step 1: Choose Geocoding API

**Options**:

1. **OpenStreetMap Nominatim** (FREE ✅)
   - Endpoint: `https://nominatim.openstreetmap.org/reverse`
   - ✅ Completely free
   - ✅ No API key needed
   - ⚠️ Rate limit: 1 request/second
   - Usage policy: Must set User-Agent

2. **Google Maps Geocoding API**
   - ❌ Requires billing account
   - ✅ Most accurate
   - $5 per 1000 requests after free tier

3. **Mapbox Geocoding API**
   - 100,000 free requests/month
   - Requires API key

**Recommended**: OpenStreetMap Nominatim (free, perfect for hackathon/demo)

#### Step 2: Create Geocoding API Route

**File**: `frontend/src/app/api/geocode/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'Missing coordinates' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'DivFlow-Web3-LandRegistry/1.0'
        }
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Extract address components
    const address = data.address;
    const addressLine = [
      address.house_number || '',
      address.road || address.street || '',
      address.suburb || address.neighbourhood || '',
      address.city || address.town || address.village || '',
      address.state || '',
      address.postcode || '',
      address.country || 'India'
    ]
      .filter(Boolean)
      .join(', ');

    return NextResponse.json({
      success: true,
      address: addressLine,
      formatted: data.display_name,
      components: {
        street: address.road || address.street || '',
        city: address.city || address.town || '',
        state: address.state || '',
        postcode: address.postcode || '',
        country: address.country || 'India'
      }
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch address' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Create Enhanced Map Component

**File**: `frontend/src/components/PropertyLocationPicker.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

interface Props {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialPosition?: [number, number];
}

function LocationMarker({ onLocationSelect }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);

  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setLoading(true);

      try {
        // Fetch address from our API
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        if (data.success) {
          onLocationSelect(lat, lng, data.address);
        } else {
          onLocationSelect(lat, lng, `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        onLocationSelect(lat, lng, `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
      
      setLoading(false);
    }
  });

  return position ? <Marker position={position} /> : null;
}

export function PropertyLocationPicker({ onLocationSelect, initialPosition = [19.0760, 72.8777] }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Property Location</label>
      <p className="text-xs text-muted-foreground mb-2">
        Click on the map to set the property location
      </p>
      
      <div className="rounded-lg overflow-hidden border" style={{ height: '400px' }}>
        <MapContainer
          center={initialPosition}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>
    </div>
  );
}
```

#### Step 4: Update Register Land Page

**File**: `frontend/src/app/register-land/page.tsx`

Add state and handler:

```typescript
const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
const [addressLine, setAddressLine] = useState('');

const handleLocationSelect = (lat: number, lng: number, address: string) => {
  setCoordinates({ lat, lng });
  setAddressLine(address);
};
```

Add to form:

```typescript
{/* Property Location */}
<PropertyLocationPicker
  onLocationSelect={handleLocationSelect}
  initialPosition={[19.0760, 72.8777]} // Mumbai default
/>

{/* Address Line */}
<div className="space-y-2">
  <label className="text-sm font-medium">Address Line</label>
  <input
    type="text"
    value={addressLine}
    onChange={(e) => setAddressLine(e.target.value)}
    placeholder="Address will be auto-filled when you click on the map"
    className="w-full rounded-md border bg-background px-3 py-2"
  />
  <p className="text-xs text-muted-foreground">
    ✏️ You can edit the address after it's auto-filled
  </p>
</div>

{coordinates && (
  <div className="text-xs text-muted-foreground">
    Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
  </div>
)}
```

#### Step 5: Store Coordinates & Address

**Options**:

1. **Frontend only** (coordinates in localStorage, not on-chain)
2. **On-chain** (requires contract update - expensive)
3. **IPFS metadata** (store with property documents - RECOMMENDED)

**Recommended**: Store in IPFS metadata along with documents

Update the property registration to include address:

```typescript
const propertyMetadata = {
  address: addressLine,
  coordinates: coordinates ? {
    lat: coordinates.lat,
    lng: coordinates.lng
  } : null,
  // ... other metadata
};

// Upload metadata to IPFS
const metadataHash = await uploadMetadata(propertyMetadata);
```

### ✅ Testing Checklist
- [ ] Map displays correctly
- [ ] Click on map places marker
- [ ] Address auto-fills after click
- [ ] User can edit address
- [ ] Coordinates are accurate
- [ ] Works for different locations (Mumbai, Delhi, etc.)
- [ ] Address format is readable
- [ ] API respects rate limits (1 req/second)

### 📦 Dependencies
Already have React Leaflet!

---

## 🎯 FEATURE 4: Enhanced Dashboard Land Details

### 📝 Description
Show detailed property view in dashboard similar to marketplace, including all documents, map location, and full property information in an expandable modal or dedicated view.

### 🎨 UI/UX Design

**Current**: Simple card with basic info
**New**: Click to expand or modal with full details

**Enhanced Property Card**:
```
┌────────────────────────────────────────┐
│  🏠 Property #123                      │
│  Survey #101 • 5000 sq ft             │
│  ────────────────────────────────────  │
│  Status: Verified ✓                   │
│  Location: Mumbai, Maharashtra        │
│  ────────────────────────────────────  │
│  [View Details] [Sell Property]       │
└────────────────────────────────────────┘

When clicked:

┌────────────────────────────────────────────┐
│  Property Details - Survey #101       [×]  │
├────────────────────────────────────────────┤
│  📋 Basic Information                      │
│  Property ID: 123                          │
│  Location ID: 1                            │
│  Revenue Dept: 1                           │
│  Survey Number: 101                        │
│  Area: 5000 sq ft                          │
│  Land Type: With Papers                    │
│  Status: Verified ✓                        │
│  Registered: 2 days ago                    │
│                                            │
│  📍 Location                               │
│  Address: 123 Main St, Andheri...         │
│  [Map View]                                │
│                                            │
│  📄 Documents                              │
│  Deed: [View] [Download]                  │
│  Survey: [View] [Download]                │
│                                            │
│  👤 Verification Details                   │
│  Inspected by: 0x7099...79C8              │
│  Revenue Approved by: 0x3C44...93BC       │
│  Verification Date: Jan 5, 2026           │
│                                            │
│  [Sell Property] [Close]                  │
└────────────────────────────────────────────┘
```

### 🔧 Technical Implementation

#### Step 1: Create Property Detail Modal Component

**File**: `frontend/src/components/PropertyDetailModal.tsx`

```typescript
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getIPFSUrl } from '@/lib/ipfs';
import { formatDistanceToNow } from 'date-fns';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./shared/LeafletMap'), { ssr: false });

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any; // Use your Property type
}

export function PropertyDetailModal({ isOpen, onClose, property }: PropertyDetailModalProps) {
  if (!property) return null;

  const getStatusBadge = (state: number) => {
    const states = [
      { label: 'Created', color: 'bg-yellow-500' },
      { label: 'Scheduled', color: 'bg-blue-500' },
      { label: 'Verified', color: 'bg-green-500' },
      { label: 'Rejected', color: 'bg-red-500' },
      { label: 'On Sale', color: 'bg-purple-500' },
      { label: 'Bought', color: 'bg-gray-500' },
      { label: 'Sale Pending', color: 'bg-orange-500' }
    ];
    const status = states[state] || states[0];
    return <span className={`px-2 py-1 rounded text-xs text-white ${status.color}`}>{status.label}</span>;
  };

  const landTypes = ['With Papers', 'Without Papers'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Property Details - Survey #{property.surveyNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              📋 Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Property ID:</span>
                <div className="font-medium">#{property.propertyId.toString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">{getStatusBadge(property.state)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Location ID:</span>
                <div className="font-medium">{property.locationId.toString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue Dept:</span>
                <div className="font-medium">{property.revenueDepartmentId.toString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Survey Number:</span>
                <div className="font-medium">{property.surveyNumber.toString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Area:</span>
                <div className="font-medium">{property.area.toString()} sq ft</div>
              </div>
              <div>
                <span className="text-muted-foreground">Land Type:</span>
                <div className="font-medium">{landTypes[property.landType] || 'Unknown'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Registered:</span>
                <div className="font-medium">
                  {formatDistanceToNow(new Date(Number(property.registeredTime) * 1000), { addSuffix: true })}
                </div>
              </div>
            </div>
          </section>

          {/* Owner Information */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              👤 Owner Information
            </h3>
            <div className="text-sm">
              <span className="text-muted-foreground">Owner Address:</span>
              <div className="font-mono text-xs bg-muted p-2 rounded mt-1">
                {property.owner}
              </div>
            </div>
          </section>

          {/* Price (if on sale) */}
          {property.price > 0 && (
            <section>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                💰 Pricing
              </h3>
              <div className="text-sm">
                <span className="text-muted-foreground">Listed Price:</span>
                <div className="font-bold text-2xl">
                  {(Number(property.price) / 1e18).toFixed(4)} ETH
                </div>
              </div>
            </section>
          )}

          {/* Documents */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              📄 Documents
            </h3>
            {property.ipfsHash ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">Property Documents</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {property.ipfsHash}
                    </div>
                  </div>
                  <a
                    href={getIPFSUrl(property.ipfsHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs"
                  >
                    View
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No documents uploaded</div>
            )}
          </section>

          {/* Verification Details */}
          {property.employeeId && property.employeeId !== '0x0000000000000000000000000000000000000000' && (
            <section>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                ✓ Verification Details
              </h3>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Verified by:</span>
                  <div className="font-mono text-xs bg-muted p-2 rounded mt-1">
                    {property.employeeId}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Rejection Reason (if rejected) */}
          {property.rejectedReason && property.rejectedReason.trim() !== '' && (
            <section>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-500">
                ⚠️ Rejection Reason
              </h3>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
                {property.rejectedReason}
              </div>
            </section>
          )}

          {/* Map placeholder - can be implemented with coordinates from metadata */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              📍 Location
            </h3>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              Map view coming soon (requires coordinates in metadata)
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 2: Add Dialog Component (if not exists)

**File**: `frontend/src/components/ui/dialog.tsx` (using shadcn/ui)

```bash
# If not already installed
npx shadcn-ui@latest add dialog
```

Or create manually (simplified version):

```typescript
// Simple dialog component
export function Dialog({ open, onOpenChange, children }: any) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 bg-background rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }: any) {
  return <div className={className}>{children}</div>;
}

export function DialogHeader({ children }: any) {
  return <div className="p-6 pb-0">{children}</div>;
}

export function DialogTitle({ children }: any) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}
```

#### Step 3: Update Dashboard Page

**File**: `frontend/src/app/dashboard/page.tsx`

Add modal state:

```typescript
const [selectedProperty, setSelectedProperty] = useState<any>(null);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

const handleViewDetails = (property: any) => {
  setSelectedProperty(property);
  setIsDetailModalOpen(true);
};
```

Update property card:

```typescript
{properties.map((property) => (
  <div key={property.propertyId} className="rounded-lg border bg-card p-4">
    {/* ... existing card content ... */}
    
    <button
      onClick={() => handleViewDetails(property)}
      className="w-full mt-3 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"
    >
      View Details
    </button>
  </div>
))}

{/* Add modal */}
<PropertyDetailModal
  isOpen={isDetailModalOpen}
  onClose={() => setIsDetailModalOpen(false)}
  property={selectedProperty}
/>
```

### ✅ Testing Checklist
- [ ] Click "View Details" opens modal
- [ ] All property information displays correctly
- [ ] Documents links work
- [ ] IPFS links open in new tab
- [ ] Status badge shows correct color
- [ ] Timestamps format correctly
- [ ] Modal closes properly
- [ ] Responsive on mobile

### 📦 Dependencies
```bash
npx shadcn-ui@latest add dialog
# OR already have date-fns
```

---

## 📅 Implementation Timeline

### Week 1 (Recommended Order)

**Day 1: Feature 1 - ETH Price Converter** (2 hours)
- Morning: API route + hook
- Afternoon: Component + integration

**Day 2: Feature 4 - Enhanced Dashboard** (2 hours)
- Morning: Modal component
- Afternoon: Integration + testing

**Day 3: Feature 3 - Map Address** (3 hours)
- Morning: Geocoding API
- Afternoon: Map component + integration

**Day 4-5: Feature 2 - Chat System** (5 hours)
- Day 4: Contract updates + deployment
- Day 5: Frontend component + testing

**Day 6: Testing & Polish** (2 hours)
- End-to-end testing
- Bug fixes
- UI polish

**Day 7: Buffer** (spare time)
- Documentation
- Extra features

---

## 🧪 Testing Strategy

### For Each Feature:

1. **Unit Test**: Component works in isolation
2. **Integration Test**: Works with blockchain
3. **User Flow Test**: Complete user journey
4. **Edge Cases**: Error handling
5. **Performance**: Load times, gas costs

### Acceptance Criteria:

Feature ready when:
- ✅ All functionality works
- ✅ No console errors
- ✅ Responsive design
- ✅ Loading states handled
- ✅ Error states handled
- ✅ Gas costs reasonable
- ✅ Documentation updated

---

## 💰 Cost Estimates (Gas Fees)

| Feature | Smart Contract Change | Gas per Action |
|---------|----------------------|----------------|
| ETH Converter | No | Free (external API) |
| Chat System | Yes | ~$0.10-0.50 per message |
| Map Address | No | Free (stored in IPFS metadata) |
| Enhanced Dashboard | No | Free (display only) |

**Total Development Gas Cost**: ~$5-10 for testing chat system

---

## 🎯 Success Metrics

After implementation:

1. **ETH Converter**:
   - Price updates within 60 seconds
   - Conversion accuracy 100%
   - Visible on all key pages

2. **Chat System**:
   - <2 seconds to send message
   - All messages permanently stored
   - Only authorized users can access

3. **Map Address**:
   - <3 seconds to fetch address
   - 90%+ accuracy for Indian addresses
   - User can override if needed

4. **Enhanced Dashboard**:
   - All property details visible
   - <1 second modal load time
   - Responsive on mobile

---

## 📚 Resources

### APIs:
- CoinGecko: https://www.coingecko.com/en/api
- Nominatim: https://nominatim.org/release-docs/develop/api/Reverse/
- Leaflet: https://leafletjs.com/

### Documentation:
- wagmi: https://wagmi.sh/
- Next.js: https://nextjs.org/docs
- Solidity: https://docs.soliditylang.org/

---

## 🚀 Ready to Start?

**Recommended First Step**: Feature 1 (ETH Converter)
- Easiest to implement
- Immediate value to users
- No blockchain changes
- Good warm-up before complex features

**Command to start**:
```bash
# Create the API route
mkdir -p frontend/src/app/api/eth-price
touch frontend/src/app/api/eth-price/route.ts

# Start coding!
```

Let me know when you're ready to begin! 🎉
