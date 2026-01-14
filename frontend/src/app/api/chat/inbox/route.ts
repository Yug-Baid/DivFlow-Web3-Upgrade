import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

interface ConversationPreview {
    partnerAddress: string;
    lastMessage: string;
    lastMessageTime: number;
    unreadCount: number;
}

interface UserInbox {
    address: string;
    conversations: ConversationPreview[];
    lastUpdated: number;
}

function getInboxName(address: string): string {
    return `divflow-inbox-${address.toLowerCase().slice(2, 14)}`;
}

// Search using Pinata v1 API (pinList) which indexes metadata.name
async function searchPinataFile(name: string): Promise<{ cid: string | null; id: string | null }> {
    try {
        console.log(`[INBOX] Searching for: ${name}`);

        // Use pinList API with metadata name filter
        const response = await fetch(
            `https://api.pinata.cloud/data/pinList?metadata[name]=${encodeURIComponent(name)}&status=pinned`,
            { headers: { Authorization: `Bearer ${PINATA_JWT}` } }
        );

        if (!response.ok) {
            console.error(`[INBOX] Search failed:`, response.status, await response.text());
            return { cid: null, id: null };
        }

        const result = await response.json();
        const pins = result.rows || [];

        if (pins.length === 0) {
            console.log(`[INBOX] No existing file found`);
            return { cid: null, id: null };
        }

        // Sort by date and get newest
        const latest = pins.sort((a: any, b: any) =>
            new Date(b.date_pinned).getTime() - new Date(a.date_pinned).getTime()
        )[0];

        console.log(`[INBOX] Found: ${latest.ipfs_pin_hash}`);
        return { cid: latest.ipfs_pin_hash, id: latest.id };
    } catch (error) {
        console.error(`[INBOX] Search error:`, error);
        return { cid: null, id: null };
    }
}

// Fetch inbox from IPFS gateway
async function fetchInbox(address: string): Promise<{ data: UserInbox | null; cid: string | null }> {
    const name = getInboxName(address);
    const { cid } = await searchPinataFile(name);

    if (!cid) {
        return { data: null, cid: null };
    }

    try {
        const response = await fetch(`${PINATA_GATEWAY}/${cid}`);
        if (!response.ok) {
            console.error(`[INBOX] Gateway fetch failed:`, response.status);
            return { data: null, cid };
        }
        const data = await response.json();
        console.log(`[INBOX] Loaded ${data.conversations?.length || 0} conversations`);
        return { data, cid };
    } catch (error) {
        console.error(`[INBOX] Fetch error:`, error);
        return { data: null, cid };
    }
}

// Pin JSON using v1 API
async function pinJSON(name: string, content: any): Promise<string | null> {
    try {
        console.log(`[INBOX] Pinning: ${name}`);

        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pinataContent: content,
                pinataMetadata: { name }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[INBOX] Pin failed:`, response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log(`[INBOX] Pinned: ${result.IpfsHash}`);
        return result.IpfsHash;
    } catch (error) {
        console.error(`[INBOX] Pin error:`, error);
        return null;
    }
}

// Unpin by CID using v1 API
async function unpinByCid(cid: string): Promise<void> {
    try {
        await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${PINATA_JWT}` }
        });
        console.log(`[INBOX] Unpinned: ${cid}`);
    } catch (error) {
        // Ignore unpin errors
    }
}

// GET: Get user's inbox
export async function GET(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json({ success: false, error: "Pinata not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");

        if (!address) {
            return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
        }

        console.log(`[INBOX GET] Loading inbox for ${address.slice(0, 8)}...`);
        const { data } = await fetchInbox(address);

        return NextResponse.json({
            success: true,
            conversations: data?.conversations || []
        });

    } catch (error: any) {
        console.error("[INBOX GET] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Update inbox
export async function POST(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json({ success: false, error: "Pinata not configured" }, { status: 500 });
        }

        const body = await request.json();
        const { address, action, partnerAddress, lastMessage, lastMessageTime, isSender } = body;

        if (!address) {
            return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
        }

        console.log(`[INBOX POST] ${action} for ${address.slice(0, 8)}... partner: ${partnerAddress?.slice(0, 8) || 'N/A'}... isSender: ${isSender}`);

        const { data: existingData, cid: oldCid } = await fetchInbox(address);

        let inbox: UserInbox = existingData || {
            address: address.toLowerCase(),
            conversations: [],
            lastUpdated: Date.now()
        };

        if (action === "addOrUpdate" && partnerAddress) {
            const existingIndex = inbox.conversations.findIndex(
                c => c.partnerAddress.toLowerCase() === partnerAddress.toLowerCase()
            );

            let unreadCount = 0;
            if (!isSender) {
                unreadCount = existingIndex >= 0 ? inbox.conversations[existingIndex].unreadCount + 1 : 1;
            } else if (existingIndex >= 0) {
                unreadCount = inbox.conversations[existingIndex].unreadCount;
            }

            const preview: ConversationPreview = {
                partnerAddress: partnerAddress.toLowerCase(),
                lastMessage: lastMessage || "",
                lastMessageTime: lastMessageTime || Date.now(),
                unreadCount
            };

            if (existingIndex >= 0) {
                inbox.conversations[existingIndex] = preview;
            } else {
                inbox.conversations.push(preview);
            }

            inbox.conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            console.log(`[INBOX POST] Updated: ${partnerAddress.slice(0, 8)}... unread: ${unreadCount}`);
        }

        if (action === "markRead" && partnerAddress) {
            const idx = inbox.conversations.findIndex(
                c => c.partnerAddress.toLowerCase() === partnerAddress.toLowerCase()
            );
            if (idx >= 0) {
                inbox.conversations[idx].unreadCount = 0;
            }
        }

        inbox.lastUpdated = Date.now();

        const newCid = await pinJSON(getInboxName(address), inbox);

        if (!newCid) {
            return NextResponse.json({ success: false, error: "Failed to save inbox" }, { status: 500 });
        }

        // Unpin old version
        if (oldCid && oldCid !== newCid) {
            unpinByCid(oldCid).catch(() => { });
        }

        return NextResponse.json({
            success: true,
            conversations: inbox.conversations,
            cid: newCid
        });

    } catch (error: any) {
        console.error("[INBOX POST] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
