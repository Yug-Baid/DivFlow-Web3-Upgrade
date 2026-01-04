// IPFS Upload Utility using Pinata
// Documentation: https://docs.pinata.cloud

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET = process.env.NEXT_PUBLIC_PINATA_SECRET;

export interface UploadResult {
    success: boolean;
    cid?: string;
    error?: string;
}

/**
 * Upload a file to IPFS via Pinata
 * @param file - The file to upload
 * @returns The IPFS CID (Content Identifier)
 */
export async function uploadToIPFS(file: File): Promise<UploadResult> {
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
                type: 'land-deed-document'
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
export function getIPFSUrl(cid: string): string {
    // Use Pinata's dedicated gateway for better reliability
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
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
 * Check if Pinata is properly configured
 */
export function isPinataConfigured(): boolean {
    return !!(PINATA_API_KEY && PINATA_SECRET);
}
