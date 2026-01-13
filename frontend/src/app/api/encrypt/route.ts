import { NextRequest, NextResponse } from 'next/server';
import { encryptSensitiveData, maskAadhaar, maskPan } from '@/lib/encryption';

// The encryption secret - stored server-side only
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

/**
 * POST /api/encrypt
 * 
 * Encrypts sensitive user data (Aadhaar, PAN) during registration.
 * Returns encrypted versions for storage in IPFS plus masked versions for display.
 * 
 * Request body:
 * - pan: The PAN number to encrypt
 * - aadhaar: The Aadhaar number to encrypt
 * 
 * Response:
 * - panEncrypted: Encrypted PAN
 * - panMasked: Masked PAN for display
 * - aadhaarEncrypted: Encrypted Aadhaar
 * - aadhaarMasked: Masked Aadhaar for display
 */
export async function POST(request: NextRequest) {
    try {
        // Check if encryption secret is configured
        if (!ENCRYPTION_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Encryption not configured on server' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { pan, aadhaar } = body;

        if (!pan || !aadhaar) {
            return NextResponse.json(
                { success: false, error: 'Both pan and aadhaar are required' },
                { status: 400 }
            );
        }

        // Encrypt both sensitive fields
        const [panEncrypted, aadhaarEncrypted] = await Promise.all([
            encryptSensitiveData(pan, ENCRYPTION_SECRET),
            encryptSensitiveData(aadhaar, ENCRYPTION_SECRET),
        ]);

        return NextResponse.json({
            success: true,
            panEncrypted,
            panMasked: maskPan(pan),
            aadhaarEncrypted,
            aadhaarMasked: maskAadhaar(aadhaar),
        });

    } catch (error: any) {
        console.error('Encryption error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Encryption failed' },
            { status: 500 }
        );
    }
}
