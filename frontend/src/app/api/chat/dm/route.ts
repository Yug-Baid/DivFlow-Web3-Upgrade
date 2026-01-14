import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
}

interface Conversation {
    participants: [string, string];
    messages: Message[];
    lastUpdated: number;
}

function getConversationId(addr1: string, addr2: string): string {
    const sorted = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
    return `divflow-dm-${sorted[0].slice(2, 10)}-${sorted[1].slice(2, 10)}`;
}

// Search using Pinata v1 pinList API
async function searchPinataFile(name: string): Promise<{ cid: string | null }> {
    try {
        console.log(`[DM] Searching for: ${name}`);

        const response = await fetch(
            `https://api.pinata.cloud/data/pinList?metadata[name]=${encodeURIComponent(name)}&status=pinned`,
            { headers: { Authorization: `Bearer ${PINATA_JWT}` } }
        );

        if (!response.ok) {
            console.error(`[DM] Search failed:`, response.status);
            return { cid: null };
        }

        const result = await response.json();
        const pins = result.rows || [];

        if (pins.length === 0) {
            console.log(`[DM] No existing file found`);
            return { cid: null };
        }

        const latest = pins.sort((a: any, b: any) =>
            new Date(b.date_pinned).getTime() - new Date(a.date_pinned).getTime()
        )[0];

        console.log(`[DM] Found: ${latest.ipfs_pin_hash}`);
        return { cid: latest.ipfs_pin_hash };
    } catch (error) {
        console.error(`[DM] Search error:`, error);
        return { cid: null };
    }
}

async function fetchConversation(convId: string): Promise<{ data: Conversation | null; cid: string | null }> {
    const { cid } = await searchPinataFile(convId);

    if (!cid) {
        return { data: null, cid: null };
    }

    try {
        const response = await fetch(`${PINATA_GATEWAY}/${cid}`);
        if (!response.ok) {
            return { data: null, cid };
        }
        const data = await response.json();
        console.log(`[DM] Loaded ${data.messages?.length || 0} messages`);
        return { data, cid };
    } catch (error) {
        console.error(`[DM] Fetch error:`, error);
        return { data: null, cid };
    }
}

async function pinJSON(name: string, content: any): Promise<string | null> {
    try {
        console.log(`[DM] Pinning: ${name}`);

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
            console.error(`[DM] Pin failed:`, await response.text());
            return null;
        }

        const result = await response.json();
        console.log(`[DM] Pinned: ${result.IpfsHash}`);
        return result.IpfsHash;
    } catch (error) {
        console.error(`[DM] Pin error:`, error);
        return null;
    }
}

async function unpinByCid(cid: string): Promise<void> {
    try {
        await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${PINATA_JWT}` }
        });
    } catch { }
}

export async function GET(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json({ success: false, error: "Pinata not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const user = searchParams.get("user");
        const partner = searchParams.get("partner");

        if (!user || !partner) {
            return NextResponse.json({ success: false, error: "user and partner required" }, { status: 400 });
        }

        const convId = getConversationId(user, partner);
        console.log(`[DM GET] Loading: ${convId}`);

        const { data } = await fetchConversation(convId);

        return NextResponse.json({
            success: true,
            messages: data?.messages || [],
            conversationId: convId
        });

    } catch (error: any) {
        console.error("[DM GET] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json({ success: false, error: "Pinata not configured" }, { status: 500 });
        }

        const body = await request.json();
        const { sender, recipient, content } = body;

        if (!sender || !recipient || !content) {
            return NextResponse.json({ success: false, error: "sender, recipient, content required" }, { status: 400 });
        }

        console.log(`[DM POST] ${sender.slice(0, 8)}... -> ${recipient.slice(0, 8)}...`);

        const convId = getConversationId(sender, recipient);
        const { data: existingData, cid: oldCid } = await fetchConversation(convId);

        const timestamp = Date.now();
        const newMessage: Message = {
            id: `${timestamp}-${sender.toLowerCase().slice(2, 10)}`,
            sender: sender.toLowerCase(),
            content,
            timestamp
        };

        const conversation: Conversation = {
            participants: [sender.toLowerCase(), recipient.toLowerCase()].sort() as [string, string],
            messages: existingData ? [...existingData.messages, newMessage] : [newMessage],
            lastUpdated: timestamp
        };

        const newCid = await pinJSON(convId, conversation);

        if (!newCid) {
            return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
        }

        if (oldCid && oldCid !== newCid) {
            unpinByCid(oldCid).catch(() => { });
        }

        console.log(`[DM POST] Saved! Messages: ${conversation.messages.length}`);

        return NextResponse.json({
            success: true,
            message: newMessage,
            conversationId: convId,
            cid: newCid
        });

    } catch (error: any) {
        console.error("[DM POST] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
