import { NextRequest, NextResponse } from 'next/server';
import { decryptSensitiveData } from '@/lib/encryption';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// The encryption secret - stored server-side only
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '';

// Contract addresses and minimal ABI for verification
const LAND_REGISTRY_ADDRESS = '0x028d56eB2e6F3a47653062CF55cB4bD20E5a2dFb' as const;
const ADMIN_ADDRESS = '0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5';

const VERIFY_ABI = [
    {
        inputs: [{ internalType: 'address', name: 'inspector', type: 'address' }],
        name: 'getInspectorLocation',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'employee', type: 'address' }],
        name: 'getEmployeeRevenueDept',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Create public client for on-chain verification
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://sepolia.base.org'),
});

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
 * - Verifies staffAddress is an actual inspector/revenue employee ON-CHAIN
 * - Only works if ENCRYPTION_SECRET is configured
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

        if (!staffAddress) {
            return NextResponse.json(
                { success: false, error: 'staffAddress is required for authorization' },
                { status: 401 }
            );
        }

        // SECURITY FIX: Verify staffAddress is actually authorized ON-CHAIN
        const isAdmin = staffAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

        let isAuthorizedStaff = isAdmin;

        if (!isAdmin) {
            try {
                // Check if inspector
                const inspectorLocation = await publicClient.readContract({
                    address: LAND_REGISTRY_ADDRESS,
                    abi: VERIFY_ABI,
                    functionName: 'getInspectorLocation',
                    args: [staffAddress as `0x${string}`],
                });

                if (Number(inspectorLocation) > 0) {
                    isAuthorizedStaff = true;
                } else {
                    // Check if revenue employee
                    const employeeDept = await publicClient.readContract({
                        address: LAND_REGISTRY_ADDRESS,
                        abi: VERIFY_ABI,
                        functionName: 'getEmployeeRevenueDept',
                        args: [staffAddress as `0x${string}`],
                    });

                    if (Number(employeeDept) > 0) {
                        isAuthorizedStaff = true;
                    }
                }
            } catch (contractErr) {
                console.error('Staff verification failed:', contractErr);
                // Fail closed - if we can't verify, deny access
                return NextResponse.json(
                    { success: false, error: 'Unable to verify staff authorization' },
                    { status: 503 }
                );
            }
        }

        if (!isAuthorizedStaff) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Only verified staff can decrypt sensitive data' },
                { status: 403 }
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

