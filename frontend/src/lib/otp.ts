/**
 * OTP Service for Demo Mode
 * 
 * Provides OTP generation, storage, and verification for the hackathon demo.
 * Uses localStorage for persistence (in production, this would use a backend service).
 */

interface OTPData {
  otp: string;
  mobile: string;
  expiresAt: number;
  attempts: number;
  verificationId: string;
}

const OTP_STORAGE_KEY = 'divflow_otp_data';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

/**
 * Generates a 6-digit OTP.
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a unique verification ID.
 */
function generateVerificationId(): string {
  return `VER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Stores OTP data in localStorage.
 */
function storeOTP(data: OTPData): void {
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Retrieves OTP data from localStorage.
 */
function getStoredOTP(): OTPData | null {
  const stored = localStorage.getItem(OTP_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as OTPData;
  } catch {
    return null;
  }
}

/**
 * Clears stored OTP data.
 */
function clearOTP(): void {
  localStorage.removeItem(OTP_STORAGE_KEY);
}

/**
 * Sends OTP to the given mobile number.
 * In demo mode, returns the OTP for display.
 * In production, this would call Twilio/Firebase.
 * 
 * @param mobile - Mobile number to send OTP to
 * @param demoMode - Whether to return OTP for display
 * @returns Object with success status and OTP (in demo mode)
 */
export async function sendOTP(
  mobile: string,
  demoMode: boolean = true
): Promise<{
  success: boolean;
  message: string;
  verificationId?: string;
  demoOTP?: string; // Only returned in demo mode for display
  expiresIn?: number; // Seconds until expiry
}> {
  // Check for existing OTP and cooldown
  const existing = getStoredOTP();
  if (existing && existing.mobile === mobile) {
    const timeSinceCreated = Date.now() - (existing.expiresAt - OTP_EXPIRY_MS);
    if (timeSinceCreated < RESEND_COOLDOWN_MS) {
      const waitTime = Math.ceil((RESEND_COOLDOWN_MS - timeSinceCreated) / 1000);
      return {
        success: false,
        message: `Please wait ${waitTime} seconds before requesting a new OTP`
      };
    }
  }
  
  // Generate new OTP
  const otp = generateOTP();
  const verificationId = generateVerificationId();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;
  
  // Store OTP locally (for verification later)
  storeOTP({
    otp,
    mobile,
    expiresAt,
    attempts: 0,
    verificationId
  });

  // If not demo mode, send real SMS
  if (!demoMode) {
    console.log('🔵 Demo mode OFF - Attempting to send real SMS...');
    console.log('📱 Mobile:', mobile);
    console.log('🔢 OTP:', otp);
    
    try {
      console.log('📤 Calling /api/sms...');
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: mobile,
          otp: otp
        })
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response body:', result);

      if (!result.success) {
        // If SMS fails but it's just because credentials not configured, fall back to demo
        if (result.demo) {
          console.log('⚠️ Twilio not configured, falling back to demo mode');
          const demoOTP = result.demoOTP || otp;
          return {
            success: true,
            message: `OTP sent to +91 ${mobile} (Demo: ${demoOTP}) - Configure Twilio for real SMS`,
            verificationId,
            demoOTP: demoOTP,
            expiresIn: Math.floor(OTP_EXPIRY_MS / 1000)
          };
        }
        
        console.log('❌ SMS API returned error:', result.message);
        clearOTP();
        return {
          success: false,
          message: result.message || 'Failed to send OTP'
        };
      }

      // Real SMS sent successfully
      console.log('✅ SMS sent successfully!');
      return {
        success: true,
        message: `OTP sent to +91 ${mobile}`,
        verificationId,
        expiresIn: Math.floor(OTP_EXPIRY_MS / 1000)
      };
    } catch (error: any) {
      console.error('❌ SMS API error:', error);
      // Fall back to demo mode on error
      return {
        success: true,
        message: `OTP sent to +91 ${mobile} (Demo: ${otp}) - SMS API error, using demo mode`,
        verificationId,
        demoOTP: otp,
        expiresIn: Math.floor(OTP_EXPIRY_MS / 1000)
      };
    }
  }
  
  // In production: Send OTP via Twilio/Firebase
  // For demo: Just return success with the OTP
  
  if (demoMode) {
    return {
      success: true,
      message: `OTP sent to ${mobile} (Demo: ${otp})`,
      verificationId,
      demoOTP: otp,
      expiresIn: Math.floor(OTP_EXPIRY_MS / 1000)
    };
  }
  
  return {
    success: true,
    message: `OTP sent to ${mobile}`,
    verificationId,
    expiresIn: Math.floor(OTP_EXPIRY_MS / 1000)
  };
}

/**
 * Verifies the entered OTP.
 * 
 * @param enteredOTP - OTP entered by user
 * @param verificationId - Verification ID from sendOTP
 * @returns Object with verification result
 */
export async function verifyOTP(
  enteredOTP: string,
  verificationId: string
): Promise<{
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const stored = getStoredOTP();
  
  // Check if OTP exists
  if (!stored) {
    return {
      success: false,
      message: 'No OTP found. Please request a new one.'
    };
  }
  
  // Check verification ID
  if (stored.verificationId !== verificationId) {
    return {
      success: false,
      message: 'Invalid verification session. Please request a new OTP.'
    };
  }
  
  // Check expiry
  if (Date.now() > stored.expiresAt) {
    clearOTP();
    return {
      success: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }
  
  // Check attempts
  if (stored.attempts >= MAX_ATTEMPTS) {
    clearOTP();
    return {
      success: false,
      message: 'Maximum attempts exceeded. Please request a new OTP.'
    };
  }
  
  // Verify OTP
  if (enteredOTP === stored.otp) {
    clearOTP();
    return {
      success: true,
      message: 'OTP verified successfully!'
    };
  }
  
  // Wrong OTP - increment attempts
  stored.attempts += 1;
  storeOTP(stored);
  
  const attemptsRemaining = MAX_ATTEMPTS - stored.attempts;
  return {
    success: false,
    message: `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
    attemptsRemaining
  };
}

/**
 * Gets the remaining time for current OTP (in seconds).
 * Returns 0 if no OTP or expired.
 */
export function getOTPTimeRemaining(): number {
  const stored = getStoredOTP();
  if (!stored) return 0;
  
  const remaining = stored.expiresAt - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Checks if an OTP can be resent (cooldown period passed).
 */
export function canResendOTP(): boolean {
  const stored = getStoredOTP();
  if (!stored) return true;
  
  const timeSinceCreated = Date.now() - (stored.expiresAt - OTP_EXPIRY_MS);
  return timeSinceCreated >= RESEND_COOLDOWN_MS;
}

/**
 * Gets the cooldown time remaining (in seconds).
 */
export function getResendCooldown(): number {
  const stored = getStoredOTP();
  if (!stored) return 0;
  
  const timeSinceCreated = Date.now() - (stored.expiresAt - OTP_EXPIRY_MS);
  const remaining = RESEND_COOLDOWN_MS - timeSinceCreated;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
