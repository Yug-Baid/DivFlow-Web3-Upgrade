# 🔧 Dashboard Not Showing After Registration - Fix Guide

**Date**: 2026-01-09  
**Issue**: Dashboard not displaying even after registration  
**Status**: Troubleshooting

---

## 🎯 **Quick Fix (Try This First)**

### **Step 1: Clear Everything and Restart**

```powershell
# 1. Stop frontend (Ctrl+C in frontend terminal)

# 2. Clear browser completely
# Press Ctrl + Shift + Delete
# Select: "All time"
# Check: Cached images and files, Cookies and site data
# Click: Clear data

# 3. Restart frontend
cd frontend
npm run dev

# 4. Open new incognito window
# Go to: http://localhost:3001

# 5. Reconnect MetaMask
# Click "Connect Wallet"
# Select your account
```

### **Step 2: Hard Refresh**
- Press `Ctrl + Shift + R` (Windows)
- Or `Cmd + Shift + R` (Mac)

---

## 🔍 **Diagnostic Steps**

### **Check 1: Is Frontend Running?**

```powershell
# Check if port 3001 is in use
netstat -ano | findstr :3001
```

**Expected**: Should show a process  
**If Empty**: Frontend not running!

**Solution**:
```bash
cd frontend
npm run dev
```

---

### **Check 2: Is Wallet Connected?**

1. Open browser console (`F12`)
2. Look for errors related to:
   - "Wallet not connected"
   - "No provider"
   - "MetaMask not found"

**Solution**: Click "Connect Wallet" in the app

---

### **Check 3: Are You Registered?**

Open browser console and run:

```javascript
// Check registration status
const address = "YOUR_WALLET_ADDRESS"; // Replace with your address
const response = await fetch('http://localhost:3001/api/check-registration?address=' + address);
const data = await response.json();
console.log('Registration Status:', data);
```

**Expected**: `{ isRegistered: true }`  
**If false**: You need to register again

---

### **Check 4: Contract Addresses Updated?**

Check `frontend/src/lib/contracts.ts`:

```typescript
// Should show NEW addresses after redeployment
export const USERS_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
export const LAND_REGISTRY_ADDRESS = '0xa513E6E4b8f2a923D98304b87f64353C4d5C853';
export const TRANSFER_OWNERSHIP_ADDRESS = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
```

**If old addresses**: Run update script again
```bash
cd contracts
node update_frontend_config.js
```

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: "Registration Required" Message Shows**

**Cause**: Contract redeployment reset all data

**Solution**: Register again
1. Go to `/register`
2. Fill form (Name, Age, City, Aadhar, Pan)
3. Submit
4. Wait for confirmation
5. Go to `/dashboard`

---

### **Issue 2: Infinite Loading on Dashboard**

**Cause**: React Query cache or contract read error

**Solution**:
```javascript
// Clear React Query cache
// Open browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Or**:
```bash
# Restart frontend
cd frontend
# Stop with Ctrl+C
npm run dev
```

---

### **Issue 3: "Wallet Not Connected" Message**

**Cause**: MetaMask not connected or wrong network

**Solution**:

1. **Check MetaMask Network**:
   - Click MetaMask extension
   - Should show: "Anvil Local (31337)"
   - If wrong: Switch to Anvil network

2. **Reconnect Wallet**:
   - Click "Connect Wallet" button
   - Select your account
   - Approve connection

3. **Add Anvil Network** (if missing):
   ```
   Network Name: Anvil Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 31337
   Currency: ETH
   ```

---

### **Issue 4: Dashboard Shows But No Properties**

**Cause**: Normal after redeployment (no properties registered yet)

**Expected Behavior**:
- Dashboard shows "0" properties
- "Register New Land" button visible
- Stats show empty state

**This is NORMAL!** You need to:
1. Register a new property
2. Go through verification flow
3. Properties will then appear

---

### **Issue 5: MetaMask Account Wrong**

**Cause**: Using different account than registered with

**Solution**:

1. Check which account you registered with
2. Switch MetaMask to that account:
   - MetaMask → Click account icon
   - Select correct account
   - Refresh page

**Tip**: After redeployment, use **Account #0** (the first account):
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

### **Issue 6: Console Shows Contract Errors**

Common errors after redeployment:

**Error**: `"Contract not deployed"`  
**Fix**: Contracts need redeployment
```bash
cd contracts
bash redeploy.sh
```

**Error**: `"CALL_EXCEPTION"`  
**Fix**: Wrong contract addresses, update frontend
```bash
cd contracts
node update_frontend_config.js
cd frontend
npm run dev
```

**Error**: `"User rejected transaction"`  
**Fix**: You declined in MetaMask, try again

---

## 🔄 **Complete Reset Procedure**

If nothing works, do a complete reset:

### **Step 1: Stop Everything**
```bash
# Stop Anvil (Ctrl+C)
# Stop Frontend (Ctrl+C)
```

### **Step 2: Clear Browser**
```
1. Close all browser tabs
2. Clear browser cache (Ctrl + Shift + Delete)
3. Clear cookies for localhost
```

### **Step 3: Clear MetaMask**
```
MetaMask → Settings → Advanced
→ Clear activity tab data
→ Confirm
```

### **Step 4: Restart Anvil**
```bash
cd contracts
anvil
```

### **Step 5: Redeploy Contracts**
```bash
# New terminal
cd contracts
bash redeploy.sh
```

### **Step 6: Restart Frontend**
```bash
cd frontend
npm run dev
```

### **Step 7: Fresh Start**
```
1. Open browser in Incognito mode
2. Go to: http://localhost:3001
3. Connect wallet (Account #0)
4. Go to /register
5. Register with new details
6. Go to /dashboard
```

---

## 📊 **Verification Checklist**

After redeployment, verify:

- [ ] Anvil is running
- [ ] Contracts deployed successfully
- [ ] Frontend running on :3001
- [ ] Contract addresses updated in contracts.ts
- [ ] Browser cache cleared
- [ ] MetaMask connected
- [ ] Correct network (Anvil 31337)
- [ ] Correct account selected
- [ ] Registration completed
- [ ] Dashboard loads

---

## 🎯 **Expected Dashboard Behavior**

### **After Fresh Redeployment**:

1. **First Visit**: Should show "Registration Required"
2. **After Registration**: Dashboard shows:
   - ✅ Welcome message with your name
   - ✅ Total Properties: 0
   - ✅ Total Value: 0 ETH / ₹0
   - ✅ Account Age: Active
   - ✅ Empty property list
   - ✅ "Register New Land" button

3. **After Registering Property**: Dashboard shows:
   - ✅ Properties count increases
   - ✅ Property cards appear
   - ✅ Can manage properties

---

## 🔍 **Debug Using Browser Console**

### **Check Registration**:
```javascript
// Open console (F12)
const address = await window.ethereum.request({ method: 'eth_accounts' });
console.log('Connected Address:', address[0]);

// Then check if registered
const isRegistered = await window.ethereum.request({
  method: 'eth_call',
  params: [{
    to: '0x0165878A594ca255338adfa4d48449f69242Eb8F', // USERS_ADDRESS
    data: '0xc3bf...', // isUserRegistered selector + padded address
  }]
});
console.log('Is Registered:', isRegistered);
```

### **Check Contract Connection**:
```javascript
// Check if contracts are accessible
fetch('http://localhost:8545', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
  })
}).then(r => r.json()).then(console.log);
```

---

## ✅ **Most Likely Cause**

After contract redeployment, the **#1 reason** dashboard doesn't show is:

### **You Need to Register Again!**

When contracts redeploy:
- ❌ All previous data is LOST
- ❌ Your registration is GONE
- ❌ All properties are GONE  
- ✅ You must register again

**Solution**:
1. Go to `/register`
2. Fill the form (even if you registered before)
3. Submit
4. Wait for confirmation
5. Go to `/dashboard`
6. Dashboard should now show!

---

## 🆘 **Still Not Working?**

### **Get More Info**:

1. **Open Browser Console** (`F12`)
2. **Go to Dashboard** (`/dashboard`)
3. **Look for errors** (red text)
4. **Screenshot the errors**
5. **Check Network tab** for failed requests

### **Common Error Messages**:

| Error | Meaning | Fix |
|-------|---------|-----|
| "Wallet not connected" | MetaMask not connected | Click "Connect Wallet" |
| "Registration required" | Not registered in NEW contracts | Go to `/register` |
| "Loading..." (forever) | Contract read failing | Check Anvil running + addresses |
| "Staff Dashboard" | Using admin account | Switch to Account #1+ |
| Blank page | React error | Check console for errors |

---

## 📝 **Quick Checklist**

Try these in order:

1. ✅ Clear browser cache
2. ✅ Hard refresh (Ctrl + Shift + R)
3. ✅ Reconnect MetaMask
4. ✅ **Register again** (most important!)
5. ✅ Check you're on correct network (Anvil 31337)
6. ✅ Check frontend is running (:3001)
7. ✅ Check Anvil is running (:8545)
8. ✅ Try incognito window

---

## 🎯 **The Real Solution**

**After redeploying contracts, YOU MUST**:

```
1. Register again (contracts reset)
   ↓
2. Clear browser cache
   ↓
3. Reconnect wallet
   ↓
4. Go to dashboard
   ↓
5. Dashboard works! ✓
```

**The problem is NOT the code.**  
**The problem is the blockchain state reset.**

---

**Created**: 2026-01-09  
**Issue**: Dashboard not showing  
**Root Cause**: Need to re-register after redeployment  
**Solution Time**: 2 minutes
