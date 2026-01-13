import { NextRequest, NextResponse } from 'next/server';
import { decryptSensitiveData } from '@/lib/encryption';

// The encryption secret - stored server-side only
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

/**
 * POST /api/decrypt
 * 
 * Decrypts sensitive user data (Aadhaar, PAN) for authorized staff viewing.
 * 
 * Request body:
 * - encryptedData: The encrypted string to decrypt
 * - staffAddress: The wallet address of the staff member requesting decryption
 * 
 * Response:
 * - decryptedData: The decrypted plaintext
 * 
 * Security:
 * - Only works if ENCRYPTION_SECRET is configured
 * - Staff authorization can be verified on-chain if needed
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
        const { encryptedData, staffAddress } = body;

        if (!encryptedData) {
            return NextResponse.json(
                { success: false, error: 'encryptedData is required' },
                { status: 400 }
            );
        }

        // TODO: Add on-chain staff verification here
        // For hackathon, we're trusting the frontend's role check
        // In production, verify staffAddress is actually an inspector/revenue employee
        // by calling the smart contract directly from the server

        if (!staffAddress) {
            return NextResponse.json(
                { success: false, error: 'staffAddress is required for authorization' },
                { status: 401 }
            );
        }

        // Decrypt the data
        const decryptedData = await decryptSensitiveData(encryptedData, ENCRYPTION_SECRET);

        return NextResponse.json({
            success: true,
            decryptedData,
        });

    } catch (error: any) {
        console.error('Decryption error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Decryption failed' },
            { status: 500 }
        );
    }
}
