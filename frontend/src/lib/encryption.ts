// Encryption Utility for Sensitive Data (Aadhaar, PAN)
// Uses AES-256-GCM encryption to protect sensitive user data stored in IPFS
// Even if someone gets the IPFS CID, they cannot read the sensitive data without the encryption key

/**
 * SECURITY ARCHITECTURE:
 * 
 * 1. Sensitive fields (aadhaar, pan) are encrypted using AES-256-GCM before storing in IPFS
 * 2. The encryption key is derived from a secret stored in env variables (server-side only)
 * 3. Client-side encryption uses Web Crypto API for secure operations
 * 4. Masked versions (aadhaarMasked, panMasked) are stored as plaintext for display purposes
 * 5. Only authorized staff can decrypt the full values via a secure API endpoint
 */

// Constants for encryption
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Derive an encryption key from the secret using PBKDF2
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt sensitive data (Aadhaar, PAN)
 * Returns format: salt:iv:ciphertext (all in hex)
 * 
 * @param plaintext - The plaintext to encrypt
 * @param secret - The encryption secret (from env variable)
 * @returns Encrypted string in format "salt:iv:ciphertext"
 */
export async function encryptSensitiveData(plaintext: string, secret: string): Promise<string> {
    if (!plaintext || !secret) {
        throw new Error('Plaintext and secret are required for encryption');
    }

    const encoder = new TextEncoder();

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from secret + salt
    const key = await deriveKey(secret, salt);

    // Encrypt the data
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: ENCRYPTION_ALGORITHM,
            iv: iv,
        },
        key,
        encoder.encode(plaintext)
    );

    // Return as salt:iv:ciphertext (all hex encoded)
    return `${arrayBufferToHex(salt.buffer)}:${arrayBufferToHex(iv.buffer)}:${arrayBufferToHex(ciphertext)}`;
}

/**
 * Decrypt sensitive data
 * 
 * @param encryptedData - Encrypted string in format "salt:iv:ciphertext"
 * @param secret - The encryption secret (from env variable)
 * @returns Decrypted plaintext
 */
export async function decryptSensitiveData(encryptedData: string, secret: string): Promise<string> {
    if (!encryptedData || !secret) {
        throw new Error('Encrypted data and secret are required for decryption');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, ciphertextHex] = parts;

    // Convert from hex
    const salt = new Uint8Array(hexToArrayBuffer(saltHex));
    const iv = new Uint8Array(hexToArrayBuffer(ivHex));
    const ciphertext = hexToArrayBuffer(ciphertextHex);

    // Derive key from secret + salt
    const key = await deriveKey(secret, salt);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
        {
            name: ENCRYPTION_ALGORITHM,
            iv: iv,
        },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Check if data is encrypted (has the salt:iv:ciphertext format)
 */
export function isEncrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    // Check if it has 3 hex parts of correct lengths
    return parts.length === 3 &&
        parts[0].length === SALT_LENGTH * 2 && // salt is 16 bytes = 32 hex chars
        parts[1].length === IV_LENGTH * 2 &&   // iv is 12 bytes = 24 hex chars
        parts[2].length > 0;
}

/**
 * Mask Aadhaar number for display (XXXX XXXX 1234)
 */
export function maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length < 4) return 'XXXX XXXX XXXX';
    const cleanAadhaar = aadhaar.replace(/\s/g, '');
    const last4 = cleanAadhaar.slice(-4);
    return `XXXX XXXX ${last4}`;
}

/**
 * Mask PAN number for display (XXXXXX1234)
 */
export function maskPan(pan: string): string {
    if (!pan || pan.length < 4) return 'XXXXXXXXXX';
    const last4 = pan.slice(-4);
    return `XXXXXX${last4}`;
}

/**
 * Secure User Profile with encrypted sensitive fields
 * This is what gets stored in IPFS - only masked versions are readable
 */
export interface SecureUserProfile {
    walletAddress: string;
    firstName: string;
    lastName: string;
    panEncrypted: string;     // AES-256-GCM encrypted PAN
    panMasked: string;        // XXXXXX1234 for display
    aadhaarEncrypted: string; // AES-256-GCM encrypted Aadhaar
    aadhaarMasked: string;    // XXXX XXXX 1234 for display
    mobile: string;           // Mobile is not considered highly sensitive
    registeredAt: number;
    encryptionVersion: number; // For future key rotation
}

/**
 * Create a secure user profile with encrypted sensitive data
 */
export async function createSecureUserProfile(
    walletAddress: string,
    firstName: string,
    lastName: string,
    pan: string,
    aadhaar: string,
    mobile: string,
    encryptionSecret: string
): Promise<SecureUserProfile> {
    // Encrypt sensitive fields
    const [panEncrypted, aadhaarEncrypted] = await Promise.all([
        encryptSensitiveData(pan, encryptionSecret),
        encryptSensitiveData(aadhaar, encryptionSecret),
    ]);

    return {
        walletAddress,
        firstName,
        lastName,
        panEncrypted,
        panMasked: maskPan(pan),
        aadhaarEncrypted,
        aadhaarMasked: maskAadhaar(aadhaar),
        mobile,
        registeredAt: Date.now(),
        encryptionVersion: 1,
    };
}

/**
 * Decrypt sensitive fields from a secure user profile
 * This should only be called on the server-side or by authorized staff
 */
export async function decryptUserProfile(
    profile: SecureUserProfile,
    encryptionSecret: string
): Promise<{ pan: string; aadhaar: string }> {
    const [pan, aadhaar] = await Promise.all([
        decryptSensitiveData(profile.panEncrypted, encryptionSecret),
        decryptSensitiveData(profile.aadhaarEncrypted, encryptionSecret),
    ]);

    return { pan, aadhaar };
}
