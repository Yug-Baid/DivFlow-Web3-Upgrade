# 🔑 Pinata API Keys Setup Guide

## ⚠️ IMPORTANT SECURITY NOTICE

**Your friend's API keys that you shared are now COMPROMISED!**

Your friend should:
1. Login to https://app.pinata.cloud
2. Go to Developers → API Keys
3. Find the key "DivFlow-Web3-Dev" (or similar)
4. Click "Revoke" to disable it
5. Create a new key and DO NOT share it

**Why?**: These keys give full control over their Pinata account. Anyone with these keys can:
- Upload files (using their storage quota)
- Delete their files
- Access their billing information

---

## 📝 How to Create YOUR OWN Pinata API Keys

### Step 1: Create Pinata Account (2 minutes)

1. **Open browser**: https://app.pinata.cloud
2. Click **"Sign Up"** (top right corner)
3. **Choose signup method**:
   - Email + Password (recommended)
   - Or use Google/GitHub
4. **Fill the form**:
   ```
   Email: your_email@example.com
   Password: (create a strong password)
   ```
5. **Verify email**: Check your inbox for verification link
6. **Click the link** in the email
7. **Login** to your new account

### Step 2: Generate API Keys (3 minutes)

1. **After login**, you'll see the Pinata Dashboard
2. **Navigate to**: `Developers` → `API Keys`
   - Or directly visit: https://app.pinata.cloud/developers/api-keys
3. **Click** the blue **"New Key"** button
4. **Configure the key**:
   ```
   Key Name: DivFlow-Web3-Dev
   
   Permissions:
   ✅ Admin (check this - gives full access)
   
   Or individually select:
   ✅ pinFileToIPFS
   ✅ pinJSONToIPFS
   ✅ unpin
   ✅ getPinList
   ```
5. **Click "Create Key"**
6. **IMPORTANT**: A popup will appear with your keys

### Step 3: Copy Your Keys 📋

**You will see these 3 values in the popup**:

```
API Key:     bfafa3a67beb5e0b3b0a
API Secret:  72d0baa4d09216fec0acc264be3d9e639ffe55e09eec9e3a386dde90a792afc1
JWT:         eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24...
```

**🚨 CRITICAL**: 
- **Copy ALL THREE** immediately!
- Click the **"Copy All"** button or copy each individually
- Paste them somewhere safe temporarily (Notepad, VS Code, etc.)
- **You will NEVER see the Secret and JWT again!**
- If you close the popup without copying, you must delete the key and create a new one

---

### Step 4: Add Keys to Your Project

1. **Open VS Code** (or your editor)
2. **Navigate to**: `frontend/.env.local`
3. **Replace the placeholder values** with YOUR keys:

```env
# Replace these with YOUR values from Pinata:

NEXT_PUBLIC_PINATA_API_KEY=paste_your_api_key_here
NEXT_PUBLIC_PINATA_SECRET=paste_your_api_secret_here
PINATA_JWT=paste_your_jwt_token_here

# Optional: Leave this blank for now
PINATA_GROUP_ID=
```

4. **Save the file** (Ctrl+S)

### Step 5: Restart Frontend Server

```bash
# In your terminal running npm run dev:
# Press Ctrl+C to stop

# Then restart:
npm run dev
```

### Step 6: Test Upload 🧪

1. **Open**: http://localhost:3001
2. **Login with MetaMask** (Account 3 or any citizen account)
3. **Register as user** (if not already registered)
4. **Go to**: Register Land (`/register-land`)
5. **Fill the form** and **upload a test file** (PDF/image)
6. **Submit** the property registration
7. **Check Pinata Dashboard**:
   - Go to https://app.pinata.cloud
   - Click **"Files"** tab
   - You should see your uploaded file! 🎉

---

## 🎯 Quick Reference

### Your .env.local file should look like this:

```env
# Example (with fake values - replace with yours):

NEXT_PUBLIC_PINATA_API_KEY=abc123xyz456
NEXT_PUBLIC_PINATA_SECRET=7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhYmMxMjMiLCJlbWFpbCI6InlvdXJAZW1haWwuY29tIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImFiYzEyMyIsInNjb3BlZEtleVNlY3JldCI6Ijk4NzY1NCIsImV4cCI6MTc5OTk5OTk5OX0.abcdefghijklmnopqrstuvwxyz123456
PINATA_GROUP_ID=
```

### File Structure:
```
frontend/
├── .env.local          ← Your API keys (NEVER commit to Git!)
├── .env.example        ← Template (safe to commit)
├── package.json
└── src/
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env.local` file LOCAL ONLY (it's in .gitignore)
- Use **PINATA_JWT** for server-side uploads (more secure)
- Revoke and regenerate keys if ever shared publicly
- Use environment-specific keys (dev vs production)

### ❌ DON'T:
- Commit `.env.local` to Git
- Share keys in screenshots, chat, or emails
- Use production keys in development
- Expose keys in client-side code

---

## 🐛 Troubleshooting

### Issue: "IPFS upload failed"
**Solution**: 
1. Check if keys are correct in `.env.local`
2. Make sure there are **no extra spaces** around the `=` sign
3. Restart the dev server after changing `.env.local`
4. Check Pinata account limits (free tier: 100 MB)

### Issue: "Environment variable not defined"
**Solution**:
1. File must be named exactly `.env.local` (not `.env` or `env.local`)
2. File must be in `frontend/` directory
3. Restart dev server after creating file

### Issue: "401 Unauthorized"
**Solution**: Your API keys are incorrect or expired. Create new keys.

### Issue: "File too large"
**Solution**: Free tier has 100 MB total storage. Either:
1. Delete old files from Pinata dashboard
2. Upgrade to paid plan
3. Use smaller test files (< 1 MB)

---

## 📊 Pinata Free Tier Limits

```
Storage:     100 MB
Bandwidth:   100 GB/month
API Calls:   Unlimited
Pins:        Unlimited
Price:       FREE
```

Enough for **100+ property documents** in development!

---

## ✅ Checklist

After completing setup, verify:

- [ ] Created Pinata account
- [ ] Generated API keys (API Key, Secret, JWT)
- [ ] Copied all 3 values
- [ ] Created/updated `frontend/.env.local`
- [ ] Pasted keys into `.env.local`
- [ ] Saved the file
- [ ] Restarted dev server
- [ ] Tested file upload
- [ ] Saw file in Pinata dashboard

**All checked?** You're ready to go! 🚀

---

## 🆘 Need Help?

If you get stuck:
1. Check the Pinata documentation: https://docs.pinata.cloud
2. Verify your keys in Pinata dashboard
3. Check the browser console for errors
4. Review the `COMPLETE_WORKFLOW_GUIDE.md` for IPFS section

---

**Created**: 2026-01-08  
**Last Updated**: 2026-01-08
