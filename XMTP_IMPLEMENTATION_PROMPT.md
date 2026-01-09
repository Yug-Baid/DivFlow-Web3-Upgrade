# 🤖 AI Implementation Prompt: XMTP Chat System Integration

**Copy this entire prompt to give to any AI assistant for implementation**

---

# PROJECT CONTEXT

I have a Next.js 14 (App Router) Web3 land registry application called "DivFlow" with the following:

## Current Tech Stack:
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Web3**: Wagmi v2, Viem, RainbowKit
- **Blockchain**: Foundry (Solidity), Local Anvil for development
- **Storage**: IPFS via Pinata
- **UI Components**: Custom components using shadcn/ui patterns

## Project Structure:
```
frontend/
├── src/
│   ├── app/
│   │   ├── inspector/page.tsx       # Land Inspector portal
│   │   └── revenue/page.tsx         # Revenue Employee portal
│   ├── components/
│   │   ├── ui/                      # Base UI components
│   │   └── shared/                  # Shared app components
│   ├── hooks/
│   └── lib/
│       ├── contracts.ts             # Contract addresses & ABIs
│       └── ipfs.ts                  # IPFS utilities
```

## Current Smart Contracts:
- `LandRegistry.sol` - Property management
- `Properties.sol` - Property state enum
- `Users.sol` - User registration
- `TransferOfOwnership.sol` - Property marketplace

## User Roles:
1. **Land Inspector** - Reviews and verifies properties
2. **Revenue Employee** - Final approval and document verification
3. **Citizen** - Property owners (not involved in chat)

---

# IMPLEMENTATION REQUIREMENT

## Objective:
Implement a **property-specific chat system** between Land Inspectors and Revenue Employees using **XMTP Protocol** (latest version).

## Core Requirements:

### 1. **Chat Functionality**:
- Each property should have its own dedicated chat
- Only the assigned Inspector and Revenue Employee for that property can access the chat
- Messages should be end-to-end encrypted
- Support text messages (file attachments optional for v1)
- Messages should persist across sessions
- Show message history when chat is opened

### 2. **Access Control**:
- Land Inspector for Property #X can ONLY chat with Revenue Employee for Property #X
- Revenue Employee can see chats for ALL properties in their department
- No one else (citizens, other inspectors, etc.) should access these chats
- Verify roles using existing smart contract data

### 3. **UI/UX Requirements**:
- Chat should appear as a modal/sidebar on property detail pages
- Show online/offline status if possible
- Show typing indicators
- Message timestamps in local timezone
- Unread message count/badge
- Auto-scroll to latest message
- Responsive design (mobile + desktop)

### 4. **Integration Points**:
- Inspector Portal: `/inspector` page (property list)
- Revenue Portal: `/revenue` page (property list)
- Chat should open when clicking a property row
- Property data comes from smart contract reads

---

# TECHNICAL SPECIFICATIONS

## XMTP Version Requirements:
- **Use XMTP SDK v11 or later** (latest stable as of 2026)
- **NOT the old v3.x.x** - use the newest version
- Check official docs: https://docs.xmtp.org/
- Use TypeScript types from `@xmtp/xmtp-js`

## Specific XMTP Features to Use:
1. **Conversations API** - For 1-on-1 chats
2. **Streaming** - For real-time message delivery
3. **Message Persistence** - Fetch historical messages
4. **Wallet-based Authentication** - Use connected wallet (Wagmi)
5. **Conversation Topics** - Use propertyId to namespace conversations

## Installation Commands:
```bash
cd frontend
npm install @xmtp/xmtp-js@latest
npm install @xmtp/react-sdk@latest  # If available
```

---

# IMPLEMENTATION TASKS

## Task 1: XMTP Provider Setup
Create an XMTP context provider that:
- Initializes XMTP client when wallet connects
- Stores client instance in React Context
- Handles client lifecycle (connect/disconnect)
- Uses Wagmi's wallet client for signing
- Implements proper error handling

**File to Create**: `frontend/src/contexts/XMTPContext.tsx`

**Requirements**:
- Must work with Wagmi v2 wallet client
- Should initialize only once per session
- Must handle wallet disconnection gracefully
- Cache client instance to avoid re-initialization

---

## Task 2: Chat Hook
Create a custom hook for chat functionality:

**File to Create**: `frontend/src/hooks/usePropertyChat.ts`

**Hook Interface**:
```typescript
interface UsePropertyChatProps {
  propertyId: number;
  recipientAddress: string;  // Inspector or Revenue employee
}

interface UsePropertyChatReturn {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  conversationId: string;
}
```

**Requirements**:
- Use property ID as conversation topic/context
- Stream new messages in real-time
- Load historical messages on mount
- Handle XMTP errors gracefully
- Implement retry logic for failed sends

---

## Task 3: Chat UI Component
Create a beautiful, functional chat interface:

**File to Create**: `frontend/src/components/PropertyChatModal.tsx`

**UI Requirements**:
- Modal overlay with backdrop blur
- Chat header showing property ID and recipient role
- Message list with auto-scroll
- Message bubbles (different colors for sender/receiver)
- Input box with send button
- Loading states (fetching history, sending message)
- Empty state (no messages yet)
- Error state (connection failed, send failed)
- Close button
- Responsive (mobile-friendly)

**Design System**:
- Use existing shadcn/ui patterns
- Match app's glassmorphism aesthetic
- Use app's color scheme (primary, secondary, etc.)
- Smooth animations (framer-motion if used elsewhere)

---

## Task 4: Inspector Integration
Update Inspector portal to include chat:

**File to Modify**: `frontend/src/app/inspector/page.tsx`

**Changes**:
1. Add "Chat" button to each property row
2. When clicked, open chat modal with Revenue employee
3. Show unread message badge on properties with new messages
4. Get Revenue employee address from smart contract

**Smart Contract Read**:
```typescript
// Get revenue employee for property's department
landRegistry.getEmployeeRevenueDept(property.revenueDepartmentId)
```

---

## Task 5: Revenue Integration
Update Revenue portal to include chat:

**File to Modify**: `frontend/src/app/revenue/page.tsx`

**Changes**:
1. Add "Chat" button to each property row
2. When clicked, open chat modal with assigned Inspector
3. Show unread message badge
4. Get Inspector address from smart contract

**Smart Contract Read**:
```typescript
// Get inspector assigned to property
property.landInspector
```

---

## Task 6: Conversation Namespacing
Implement proper conversation isolation:

**Strategy**:
Use XMTP conversation contexts to ensure each property has a unique chat thread:

```typescript
const conversationTopic = `divflow-property-${propertyId}`;
// Or use conversation metadata
```

**Requirements**:
- Multiple properties should have separate conversations
- Same Inspector-Revenue pair for different properties = different chats
- Conversations should be discoverable by property ID

---

# ERROR HANDLING REQUIREMENTS

## Must Handle These Cases:

1. **XMTP Network Issues**:
   - Show user-friendly error message
   - Implement retry mechanism
   - Offline mode detection

2. **Wallet Not Connected**:
   - Prompt user to connect wallet
   - Disable chat UI until connected

3. **XMTP Client Initialization Failure**:
   - Show clear error message
   - Provide troubleshooting steps
   - Log detailed error for debugging

4. **Message Send Failures**:
   - Show inline error in chat
   - Allow retry
   - Don't lose user's message text

5. **Conversation Load Failures**:
   - Graceful degradation
   - Retry button
   - Clear error message

6. **Permission Denied**:
   - If user's role doesn't match
   - Clear explanation why they can't access chat

---

# CODE QUALITY REQUIREMENTS

## TypeScript:
- ✅ Full TypeScript with strict mode
- ✅ No `any` types (use proper XMTP types)
- ✅ Proper error types
- ✅ Interface definitions for all props

## Error Handling:
- ✅ Try-catch blocks for all async operations
- ✅ User-friendly error messages
- ✅ Console logging for debugging
- ✅ Error boundaries for component crashes

## Performance:
- ✅ Lazy load chat modal
- ✅ Debounce typing indicators
- ✅ Virtualize long message lists (if >100 messages)
- ✅ Cleanup event listeners on unmount

## Accessibility:
- ✅ Keyboard navigation (Esc to close, Enter to send)
- ✅ ARIA labels for screen readers
- ✅ Focus management in modal
- ✅ Semantic HTML

---

# TESTING REQUIREMENTS

## Manual Testing Checklist:

1. **Basic Flow**:
   - [ ] Inspector can open chat for a property
   - [ ] Revenue employee can open same chat
   - [ ] Messages appear in both sides
   - [ ] Timestamps are correct

2. **Real-time Sync**:
   - [ ] New message appears immediately for recipient
   - [ ] Typing indicator works
   - [ ] Multiple messages in quick succession

3. **Persistence**:
   - [ ] Close and reopen chat - messages still there
   - [ ] Refresh page - messages still there
   - [ ] Disconnect/reconnect wallet - messages still there

4. **Error Cases**:
   - [ ] Send message with no internet - shows error
   - [ ] Disconnect wallet mid-chat - graceful handling
   - [ ] Wrong user tries to access - blocked

5. **Multi-Property**:
   - [ ] Property #1 chat separate from Property #2
   - [ ] Same Inspector-Revenue pair has separate chats per property

---

# SPECIFIC XMTP IMPLEMENTATION NOTES

## Latest XMTP API (v11+):

### Client Initialization (2026 syntax):
```typescript
import { Client } from '@xmtp/xmtp-js';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();

// Initialize with latest API
const xmtpClient = await Client.create(walletClient, {
  env: 'production', // or 'dev' for testing
});
```

### Conversation Creation (with context):
```typescript
// Create conversation with metadata
const conversation = await xmtpClient.conversations.newConversation(
  recipientAddress,
  {
    conversationId: `property-${propertyId}`,
    metadata: {
      propertyId: propertyId.toString(),
      propertyType: 'land-registry'
    }
  }
);
```

### Streaming Messages:
```typescript
// Stream new messages
for await (const message of await conversation.streamMessages()) {
  console.log(`New message from ${message.senderAddress}: ${message.content}`);
  // Update UI
}
```

### Loading History:
```typescript
const messages = await conversation.messages({
  limit: 50,
  direction: 'descending'
});
```

---

# DELIVERABLES

Please provide:

1. **All new files** created (full code)
2. **All modified files** with clear comments on changes
3. **Installation instructions** with exact commands
4. **Usage documentation** for developers
5. **Testing guide** for QA
6. **Known limitations** (if any)
7. **Environment variables** needed (if any)

---

# CONSTRAINTS

## DO NOT:
- ❌ Use deprecated XMTP APIs
- ❌ Store messages in centralized database
- ❌ Hardcode wallet addresses
- ❌ Skip error handling
- ❌ Use `any` type excessively
- ❌ Break existing functionality

## DO:
- ✅ Use latest XMTP SDK version
- ✅ Follow Next.js 14 App Router patterns
- ✅ Match existing code style
- ✅ Add detailed comments
- ✅ Handle all edge cases
- ✅ Make it production-ready

---

# VERIFICATION

After implementation, I should be able to:

1. Open Inspector portal
2. Click property row
3. See chat modal open
4. Send message to Revenue employee
5. Open Revenue portal (same property)
6. See the message I just sent
7. Reply from Revenue side
8. See reply on Inspector side immediately
9. Close and reopen - history preserved
10. Open different property - different chat

---

# SUCCESS CRITERIA

✅ **Functional**:
- Messages send and receive correctly
- Real-time updates work
- History persists across sessions
- Each property has isolated chat

✅ **User Experience**:
- Intuitive UI
- Fast and responsive
- Clear error messages
- Mobile-friendly

✅ **Code Quality**:
- TypeScript strict mode passes
- No console errors
- Proper error handling
- Well-documented

✅ **Production Ready**:
- Can handle 100+ messages per chat
- Works with slow internet
- Graceful degradation
- No data loss

---

# ADDITIONAL CONTEXT

## Existing Patterns to Follow:

**Modal Pattern** (if exists in codebase):
```typescript
// Check existing modal implementations
// Match the same pattern for consistency
```

**Wagmi Hook Usage**:
```typescript
import { useAccount, useWalletClient } from 'wagmi';

const { address } = useAccount();
const { data: walletClient } = useWalletClient();
```

**Contract Reading**:
```typescript
import { useReadContract } from 'wagmi';
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from '@/lib/contracts';

const { data: propertyData } = useReadContract({
  address: LAND_REGISTRY_ADDRESS,
  abi: LAND_REGISTRY_ABI,
  functionName: 'getPropertyDetails',
  args: [propertyId]
});
```

---

# URGENCY & PRIORITY

- **Timeline**: Implement within 1 working session
- **Priority**: High (core feature)
- **Quality over Speed**: Take time to do it right
- **Ask Questions**: If anything is unclear, ask before coding

---

# FINAL CHECKLIST

Before submitting implementation:

- [ ] Code compiles without errors
- [ ] TypeScript strict mode passes
- [ ] No console errors in browser
- [ ] Tested with 2 different wallets
- [ ] Tested with 2 different properties
- [ ] README/documentation provided
- [ ] Installation instructions clear
- [ ] All files properly formatted
- [ ] Comments added for complex logic
- [ ] Edge cases handled

---

**START IMPLEMENTATION NOW**

Please implement this XMTP chat system following all the requirements above. Begin with the XMTP provider setup, then the chat hook, then the UI component, and finally the portal integrations.

If you encounter any issues with the latest XMTP API, consult the official documentation at https://docs.xmtp.org/ and use the most current stable version.

Provide complete, production-ready code that I can directly copy into my project without modifications.

---

**EXPECTED OUTPUT FORMAT**:

1. File path
2. Full file contents
3. Explanation of what it does
4. Any dependencies to install
5. Any environment variables needed
6. Testing instructions

Begin implementation! 🚀
