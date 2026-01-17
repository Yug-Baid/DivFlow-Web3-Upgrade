import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side AES-256-GCM Encryption API
 * 
 * This encrypts sensitive data (Aadhaar, PAN) using a secret key
 * that NEVER leaves the server. The encrypted data is safe to store in IPFS.
 */

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

// Convert Uint8Array to hex string
function toHex(arr: Uint8Array): string {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns format: salt:iv:ciphertext (all hex encoded)
 */
async function encryptAES256GCM(plaintext: string): Promise<string> {
    if (!ENCRYPTION_SECRET) {
        throw new Error('ENCRYPTION_SECRET not configured in environment');
    }

    const encoder = new TextEncoder();
    
    // Generate random salt (16 bytes) and IV (12 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the secret as key material for PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(ENCRYPTION_SECRET),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    // Derive a 256-bit AES key using PBKDF2 (100,000 iterations)
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
        ['encrypt']
    );
    
    // Encrypt the plaintext
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        encoder.encode(plaintext)
    );
    
    // Return as salt:iv:ciphertext (all hex encoded)
    return `${toHex(salt)}:${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`;
}

export async function POST(request: NextRequest) {
    try {
        const { data } = await request.json();
        
        if (!data) {
            return NextResponse.json(
                { success: false, error: 'No data provided' },
                { status: 400 }
            );
        }

        if (!ENCRYPTION_SECRET) {
            console.error('ENCRYPTION_SECRET is not set. Current value:', ENCRYPTION_SECRET);
            console.error('All env keys:', Object.keys(process.env).filter(k => k.includes('ENCRYPT')));
            return NextResponse.json(
                { success: false, error: 'Encryption not configured on server' },
                { status: 500 }
            );
        }
        
        const encrypted = await encryptAES256GCM(data);
        
        return NextResponse.json({
            success: true,
            encrypted,
            algorithm: 'AES-256-GCM',
            version: 2, // Version 2 = server-side AES
        });
        
    } catch (error: any) {
        console.error('Encryption error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Encryption failed' },
            { status: 500 }
        );
    }
}
