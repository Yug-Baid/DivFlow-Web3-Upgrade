# Twilio SMS Setup Guide

Get real OTP SMS delivered to your phone using Twilio.

## Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a **free trial** account
3. Verify your email and phone number
4. You get **$15.50 free trial credit**!

## Step 2: Get Your Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. On the dashboard, you'll see:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)
3. Get a **Twilio Phone Number**:
   - Click "Get a Trial Number" or go to Phone Numbers → Manage → Buy a Number
   - For India, you may need to use a US number (works for trial)

## Step 3: Add to Environment Variables

Add these to your `.env.local` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** 
- No quotes around values
- Phone number must include country code (e.g., `+1` for US)

## Step 4: Verify Your Phone (Trial Accounts)

Twilio trial accounts can only send SMS to **verified numbers**:

1. Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click "Add a new Caller ID"
3. Add your Indian mobile number with +91 prefix
4. Verify with the code sent to your phone

## Step 5: Test It!

1. **Restart your dev server**: `npm run dev`
2. Go to `/register`
3. Turn **OFF** Demo Mode
4. Enter your verified phone number
5. You should receive the OTP SMS!

## Pricing

| Item | Cost |
|------|------|
| Trial Credit | **$15.50 FREE** |
| SMS to India | ~$0.04 per message |
| Trial Messages | ~380+ free SMS to India! |

## Troubleshooting

### "Twilio credentials not configured"
- Restart your dev server after adding `.env.local`
- Check variable names are exact (case-sensitive)

### "Unable to create record" or "unverified number"
- On trial accounts, you can only send to verified numbers
- Add your phone to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)

### SMS not received
- Check Twilio Console → Monitor → Logs → Messages for errors
- Ensure phone number format includes +91

## Demo Mode Fallback

If Twilio is not configured, the system automatically falls back to demo mode where the OTP is shown on screen. This ensures your hackathon demo always works!
