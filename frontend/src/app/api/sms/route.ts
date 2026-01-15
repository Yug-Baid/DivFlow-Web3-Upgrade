import { NextRequest, NextResponse } from 'next/server';

/**
 * Fast2SMS Quick SMS API Route
 * 
 * Sends real OTP SMS via Fast2SMS Quick SMS API (India)
 * Uses "q" (Quick SMS) route which doesn't require DLT registration
 * 
 * Required env vars (use one of these):
 * - FAST2SMS_API_KEY: Your Fast2SMS API key
 * 
 * Get your API key from: https://www.fast2sms.com/
 */

// Try multiple possible env var names
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || process.env.NEXT_PUBLIC_FAST2SMS_API_KEY;

export async function POST(request: NextRequest) {
  console.log('=== SMS API Called ===');
  console.log('🔑 Checking env vars...');
  console.log('   FAST2SMS_API_KEY exists:', !!process.env.FAST2SMS_API_KEY);
  console.log('   NEXT_PUBLIC_FAST2SMS_API_KEY exists:', !!process.env.NEXT_PUBLIC_FAST2SMS_API_KEY);
  console.log('   Final API Key exists:', !!FAST2SMS_API_KEY);
  console.log('   API Key length:', FAST2SMS_API_KEY?.length || 0);
  console.log('   API Key first 10 chars:', FAST2SMS_API_KEY?.substring(0, 10) || 'N/A');

  try {
    const { mobile, otp } = await request.json();
    console.log('📱 Sending OTP to mobile:', mobile);

    // Validate inputs
    if (!mobile || !otp) {
      return NextResponse.json(
        { success: false, message: 'Mobile number and OTP are required' },
        { status: 400 }
      );
    }

    // Clean mobile number (remove +91 if present)
    const cleanMobile = mobile.replace(/^\+91/, '').replace(/\D/g, '');
    console.log('📱 Cleaned mobile:', cleanMobile);

    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        { success: false, message: 'Invalid mobile number' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!FAST2SMS_API_KEY) {
      console.warn('⚠️ No Fast2SMS API key found!');
      console.warn('   Add FAST2SMS_API_KEY=your_key to .env.local');
      console.warn('   Then RESTART the dev server (npm run dev)');
      return NextResponse.json({
        success: true,
        message: 'Demo mode: API key not found. Add FAST2SMS_API_KEY to .env.local and restart server.',
        demo: true,
        demoOTP: otp
      });
    }

    // Send OTP via Fast2SMS Quick SMS route
    const message = `Your DivFlow verification code is: ${otp}. Valid for 5 minutes.`;

    console.log('📤 Sending to Fast2SMS...');
    console.log('   URL: https://www.fast2sms.com/dev/bulkV2');
    console.log('   Route: q (Quick SMS)');
    console.log('   Number:', cleanMobile);

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanMobile
      })
    });

    console.log('📥 Response Status:', response.status);
    const result = await response.json();
    console.log('📥 Response Body:', JSON.stringify(result, null, 2));

    if (result.return === true) {
      console.log('✅ SMS sent successfully!');
      return NextResponse.json({
        success: true,
        message: `OTP sent to +91 ${cleanMobile}`,
        requestId: result.request_id
      });
    } else {
      console.error('❌ Fast2SMS error:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to send SMS',
        error: result
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
