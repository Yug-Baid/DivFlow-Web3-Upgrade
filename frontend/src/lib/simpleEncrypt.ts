/**
 * Simple Obfuscation/Encryption for sensitive data
 * 
 * This provides a simple layer of protection for Aadhaar/PAN stored in IPFS.
 * Staff members can decrypt it in the frontend when viewing user details.
 * 
 * NOTE: For production, use proper server-side encryption with secure key management.
 * This is suitable for demo/hackathon purposes.
 */

// Simple XOR-based encryption key (obfuscated)
const ENCRYPTION_KEY = "DivFlow2026!Secure#Key$";

/**
 * Simple XOR encryption - works bidirectionally (encrypt = decrypt)
 */
function xorCipher(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return result;
}

/**
 * Encrypt sensitive data for storage
 * Returns base64 encoded encrypted string
 */
export function encryptData(plaintext: string): string {
    if (!plaintext) return '';
    try {
        const encrypted = xorCipher(plaintext, ENCRYPTION_KEY);
        // Convert to base64 for safe storage
        return btoa(encrypted);
    } catch (e) {
        console.error('Encryption failed:', e);
        return '';
    }
}

/**
 * Decrypt sensitive data for viewing
 * Accepts base64 encoded encrypted string
 */
export function decryptData(encryptedBase64: string): string {
    if (!encryptedBase64) return '';
    try {
        // Decode from base64
        const encrypted = atob(encryptedBase64);
        // XOR is symmetric - same operation decrypts
        return xorCipher(encrypted, ENCRYPTION_KEY);
    } catch (e) {
        console.error('Decryption failed:', e);
        return '';
    }
}

/**
 * Mask Aadhaar number for display (XXXX XXXX 1234)
 */
export function maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length < 4) return aadhaar;
    return `XXXX XXXX ${aadhaar.slice(-4)}`;
}

/**
 * Mask PAN number for display (XXXXXX1234)
 */
export function maskPAN(pan: string): string {
    if (!pan || pan.length < 4) return pan;
    return `XXXXXX${pan.slice(-4)}`;
}
