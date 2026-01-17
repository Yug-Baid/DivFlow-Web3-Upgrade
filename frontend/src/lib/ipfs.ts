// IPFS Upload Utility using Pinata
// Documentation: https://docs.pinata.cloud

// Legacy keys (kept for backward compatibility, but prefer server-side upload)
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET = process.env.NEXT_PUBLIC_PINATA_SECRET;

export interface UploadResult {
    success: boolean;
    cid?: string;
    error?: string;
}

export interface PropertyMetadata {
    name: string;
    description: string;
    image: string; // Cover photo IPFS URL
    properties: {
        deed: string; // Deed document IPFS URL
        photos: string[]; // Additional photos
        location?: {
            lat: number;
            lng: number;
            address?: string; // Property address from geocoding
        };
        owner?: string;
    };
}

// User profile for staff visibility (stored in IPFS during registration)
// SECURITY: Updated to support encrypted sensitive data
export interface UserProfile {
    walletAddress: string;
    firstName: string;
    lastName: string;
    // Legacy fields (unencrypted) - kept for backward compatibility
    pan?: string;           // Full PAN (deprecated - use panEncrypted)
    aadhaar?: string;       // Full Aadhaar (deprecated - use aadhaarEncrypted)
    // Encrypted fields (secure)
    panEncrypted?: string;      // AES-256-GCM encrypted PAN
    aadhaarEncrypted?: string;  // AES-256-GCM encrypted Aadhaar
    // Masked fields (always present for display)
    panMasked: string;     // XXXXXX1234F
    aadhaarMasked: string; // XXXX XXXX 1234
    mobile: string;
    registeredAt: number;  // Unix timestamp
    encryptionVersion?: number; // 0 = no encryption, 1 = XOR (legacy), 2 = AES-256-GCM (secure, server-side)
}

/**
 * Upload a file to IPFS via server-side API route (SECURE - recommended)
 * Falls back to direct Pinata upload if server route fails
 * @param file - The file to upload
 * @returns The IPFS CID (Content Identifier)
 */
export async function uploadToIPFS(file: File): Promise<UploadResult> {
    // Try server-side upload first (secure - JWT not exposed to browser)
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/ipfs/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                cid: data.cid
            };
        }

        // If server route returns an error, fall back to legacy method
        console.warn("Server upload failed, trying legacy method:", data.error);
    } catch (error) {
        console.warn("Server route not available, trying legacy method");
    }

    // Fallback: Direct Pinata upload (legacy - keys exposed in browser)
    return uploadToIPFSLegacy(file);
}

/**
 * Upload JSON Metadata to IPFS
 * @param metadata - The metadata object
 */
export async function uploadMetadata(metadata: PropertyMetadata): Promise<UploadResult> {
    // Convert to File object for upload logic reuse
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const file = new File([blob], "metadata.json", { type: 'application/json' });

    return uploadToIPFS(file);
}

/**
 * Upload User Profile to IPFS
 * @param profile - The user profile object
 */
export async function uploadUserProfile(profile: UserProfile): Promise<UploadResult> {
    const blob = new Blob([JSON.stringify(profile)], { type: 'application/json' });
    const file = new File([blob], "user-profile.json", { type: 'application/json' });

    return uploadToIPFS(file);
}

/**
 * Legacy upload method - uses NEXT_PUBLIC_ keys (exposed to browser)
 * Only use if server-side route is not configured
 */
async function uploadToIPFSLegacy(file: File): Promise<UploadResult> {
    if (!PINATA_API_KEY || !PINATA_SECRET) {
        console.error("Pinata API keys not configured");
        return {
            success: false,
            error: "IPFS not configured. Please add Pinata API keys to .env.local"
        };
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        // Add metadata
        const metadata = JSON.stringify({
            name: file.name,
            keyvalues: {
                uploadedAt: new Date().toISOString(),
                type: file.type === 'application/json' ? 'metadata' : 'land-document'
            }
        });
        formData.append('pinataMetadata', metadata);

        // Pin options
        const options = JSON.stringify({
            cidVersion: 1
        });
        formData.append('pinataOptions', options);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Pinata upload failed:", errorData);
            return {
                success: false,
                error: errorData.error?.message || "Upload failed"
            };
        }

        const data = await response.json();
        return {
            success: true,
            cid: data.IpfsHash
        };
    } catch (error: any) {
        console.error("IPFS upload error:", error);
        return {
            success: false,
            error: error.message || "Upload failed"
        };
    }
}

/**
 * Get the IPFS gateway URL for a CID
 * @param cid - The IPFS Content Identifier
 * @returns The gateway URL
 */
export function getIPFSUrl(cid: string, gateway: string = "https://gateway.pinata.cloud/ipfs/"): string {
    if (!cid) return "";
    // Strip ipfs:// prefix if present
    const cleanCid = cid.replace('ipfs://', '');
    return `${gateway}${cleanCid}`;
}

/**
 * Resolve IPFS Hash - Checks if it's metadata or direct file
 * @param cid - The IPFS Content Identifier
 */
export async function resolveIPFS(cid: string): Promise<{ isMetadata: boolean, data: any }> {
    try {
        const url = getIPFSUrl(cid);
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return { isMetadata: true, data };
        } else {
            return { isMetadata: false, data: url };
        }
    } catch (e) {
        console.error("Error resolving IPFS:", e);
        return { isMetadata: false, data: getIPFSUrl(cid) };
    }
}

/**
 * Get alternative IPFS gateway URLs
 * @param cid - The IPFS Content Identifier
 * @returns Array of gateway URLs
 */
export function getIPFSGateways(cid: string): string[] {
    return [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`,
    ];
}

/**
 * Check if Pinata is properly configured (either server-side or legacy)
 */
export function isPinataConfigured(): boolean {
    // Server-side is always "configured" - actual check happens in API route
    // This function is kept for backward compatibility
    return true;
}
