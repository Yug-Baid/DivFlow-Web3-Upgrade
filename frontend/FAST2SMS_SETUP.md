# Fast2SMS Setup Guide for Real OTP

Follow these steps to enable real SMS OTP delivery to your phone.

## Step 1: Create Fast2SMS Account

1. Go to [https://www.fast2sms.com/](https://www.fast2sms.com/)
2. Click **"Sign Up Free"**
3. Register with your email and mobile number
4. Verify your account

## Step 2: Get Your API Key

1. Login to your Fast2SMS dashboard
2. Go to **"Dev API"** section in the sidebar
3. Copy your **API Authorization Key**

## Step 3: Add to Environment Variables

Add to your `.env.local` file:

```env
# Fast2SMS API Key for real OTP
FAST2SMS_API_KEY=your_api_key_here
```

## Step 4: Add Balance (Optional for Testing)

- Fast2SMS gives you **₹50 free credit** on signup
- Each OTP costs approximately **₹0.20-0.25**
- That's about **200 free test OTPs!**

## Step 5: Test the Integration

1. Restart your dev server: `npm run dev`
2. Go to `/register` and **turn OFF Demo Mode**
3. Enter your real mobile number
4. You should receive the OTP on your phone!

## Troubleshooting

### OTP not received?

1. Check if your Fast2SMS wallet has balance
2. Verify the API key is correct
3. Check browser console for errors
4. Ensure mobile number is correct (10 digits, starts with 6-9)

### API Key not working?

- Fast2SMS requires a minimum transaction of ₹100 for some routes
- Try adding ₹100 to your wallet first
- Contact Fast2SMS support if issues persist

## Demo Mode Fallback

If the Fast2SMS API fails or is not configured:
- The system automatically falls back to **Demo Mode**
- OTP will be displayed on screen instead of sent via SMS
- This ensures your hackathon demo always works!

---

## Alternative: Use Demo Mode for Hackathon

For hackathon presentations, you can simply keep **Demo Mode ON**:
- No API setup required
- OTP is shown on screen
- Judges can see the full flow
- Works 100% of the time
