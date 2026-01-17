import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from '@/lib/contracts';

/**
 * Server-side AES-256-GCM Decryption API with Role Verification
 * 
 * Only Land Inspectors, Revenue Employees, and Admins can decrypt sensitive data.
 * The wallet address is verified against the blockchain to check roles.
 */

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

// Create viem client for blockchain role verification
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://sepolia.base.org'),
});

// Convert hex string to Uint8Array
function fromHex(hex: string): Uint8Array {
    const matches = hex.match(/.{2}/g);
    if (!matches) throw new Error('Invalid hex string');
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Verify if wallet address is authorized staff (Land Inspector, Revenue Employee, or Admin)
 */
async function isAuthorizedStaff(walletAddress: string): Promise<{ authorized: boolean; role: string }> {
    try {
        // Check if Admin
        if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
            return { authorized: true, role: 'Admin' };
        }

        // Check if Land Inspector
        const inspectorLocation = await publicClient.readContract({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: 'getInspectorLocation',
            args: [walletAddress as `0x${string}`],
        }) as bigint;
        
        if (inspectorLocation && Number(inspectorLocation) > 0) {
            return { authorized: true, role: 'Land Inspector' };
        }
        
        // Check if Revenue Employee
        const employeeDept = await publicClient.readContract({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: 'getEmployeeRevenueDept',
            args: [walletAddress as `0x${string}`],
        }) as bigint;
        
        if (employeeDept && Number(employeeDept) > 0) {
            return { authorized: true, role: 'Revenue Employee' };
        }
        
        return { authorized: false, role: 'None' };
    } catch (error) {
        console.error('Role verification error:', error);
        return { authorized: false, role: 'Error' };
    }
}

/**
 * Decrypt data using AES-256-GCM
 * Expects format: salt:iv:ciphertext (all hex encoded)
 */
async function decryptAES256GCM(encryptedData: string): Promise<string> {
    if (!ENCRYPTION_SECRET) {
        throw new Error('ENCRYPTION_SECRET not configured in environment');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected salt:iv:ciphertext');
    }

    const [saltHex, ivHex, ciphertextHex] = parts;
    
    // Convert from hex
    const salt = fromHex(saltHex);
    const iv = fromHex(ivHex);
    const ciphertext = fromHex(ciphertextHex);
    
    const encoder = new TextEncoder();
    
    // Import the secret as key material for PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(ENCRYPTION_SECRET),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    // Derive the same 256-bit AES key using PBKDF2
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
    
    // Decrypt the ciphertext
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer
    );
    
    return new TextDecoder().decode(decrypted);
}

export async function POST(request: NextRequest) {
    try {
        const { encryptedData, walletAddress } = await request.json();
        
        // Validate inputs
        if (!encryptedData) {
            return NextResponse.json(
                { success: false, error: 'No encrypted data provided' },
                { status: 400 }
            );
        }

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'No wallet address provided' },
                { status: 400 }
            );
        }

        if (!ENCRYPTION_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Decryption not configured on server' },
                { status: 500 }
            );
        }
        
        // ⚠️ CRITICAL: Verify wallet is authorized staff
        const { authorized, role } = await isAuthorizedStaff(walletAddress);
        
        if (!authorized) {
            console.warn(`Unauthorized decrypt attempt from: ${walletAddress}`);
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Unauthorized: Only Land Inspectors, Revenue Employees, and Admins can view sensitive data',
                    role: 'None'
                },
                { status: 403 }
            );
        }
        
        // Decrypt the data
        const decrypted = await decryptAES256GCM(encryptedData);
        
        console.log(`Decrypt authorized for ${role}: ${walletAddress.slice(0, 10)}...`);
        
        return NextResponse.json({
            success: true,
            decrypted,
            role,
        });
        
    } catch (error: any) {
        console.error('Decryption error:', error);
        
        // Don't expose internal errors
        return NextResponse.json(
            { success: false, error: 'Decryption failed. Data may be corrupted or using old encryption.' },
            { status: 500 }
        );
    }
}
