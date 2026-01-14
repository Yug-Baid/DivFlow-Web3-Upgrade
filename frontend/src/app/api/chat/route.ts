import { NextRequest, NextResponse } from "next/server";

// Server-side Pinata configuration
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

// Timeout for API calls (15 seconds)
const API_TIMEOUT = 15000;

interface ChatMessage {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
    propertyId: string;
}

interface ChatData {
    propertyId: string;
    messages: ChatMessage[];
    lastUpdated: number;
}

// Helper to generate unique message ID
function generateMessageId(sender: string, timestamp: number): string {
    return `${timestamp}-${sender.toLowerCase().slice(0, 10)}`;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = API_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Fetch existing chat data from Pinata by searching for the property's chat file
async function fetchExistingChat(propertyId: string): Promise<{ data: ChatData | null; cid: string | null }> {
    try {
        // Search for existing chat file by name
        const searchResponse = await fetchWithTimeout(
            `https://api.pinata.cloud/v3/files?name=divflow-chat-${propertyId}.json&status=pinned`,
            {
                headers: {
                    Authorization: `Bearer ${PINATA_JWT}`,
                },
            }
        );

        if (!searchResponse.ok) {
            console.error("Pinata search failed:", await searchResponse.text());
            return { data: null, cid: null };
        }

        const searchResult = await searchResponse.json();
        const files = searchResult.data?.files || [];

        if (files.length === 0) {
            return { data: null, cid: null };
        }

        // Get the most recent file (in case of duplicates)
        const latestFile = files.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const cid = latestFile.cid;

        // Fetch the content from IPFS gateway
        const contentResponse = await fetchWithTimeout(`${PINATA_GATEWAY}/${cid}`, {});

        if (!contentResponse.ok) {
            console.error("Failed to fetch from gateway:", contentResponse.status);
            return { data: null, cid };
        }

        const chatData = await contentResponse.json();
        return { data: chatData, cid };

    } catch (error: any) {
        // Handle timeout specifically
        if (error.name === 'AbortError') {
            console.error("Pinata request timed out");
        } else {
            console.error("Error fetching existing chat:", error);
        }
        return { data: null, cid: null };
    }
}

// Pin new chat data to Pinata
async function pinChatData(chatData: ChatData): Promise<string | null> {
    try {
        // Create a JSON blob
        const jsonContent = JSON.stringify(chatData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const file = new File([blob], `divflow-chat-${chatData.propertyId}.json`, { type: "application/json" });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("network", "public");

        // Add metadata
        const metadata = JSON.stringify({
            name: `divflow-chat-${chatData.propertyId}.json`,
            keyvalues: {
                propertyId: chatData.propertyId,
                type: "chat-history",
                project: "DivFlow",
                messageCount: chatData.messages.length.toString(),
                lastUpdated: new Date().toISOString()
            }
        });
        formData.append("keyvalues", metadata);

        const response = await fetchWithTimeout("https://uploads.pinata.cloud/v3/files", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Pinata pin failed:", errorData);
            return null;
        }

        const data = await response.json();
        return data.data.cid;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error("Pinata upload timed out");
        } else {
            console.error("Error pinning chat data:", error);
        }
        return null;
    }
}

// Unpin old chat file to save storage
async function unpinOldChat(cid: string): Promise<void> {
    try {
        // First, find the file ID by CID
        const searchResponse = await fetchWithTimeout(
            `https://api.pinata.cloud/v3/files?cid=${cid}`,
            {
                headers: {
                    Authorization: `Bearer ${PINATA_JWT}`,
                },
            },
            5000 // Shorter timeout for cleanup
        );

        if (!searchResponse.ok) return;

        const searchResult = await searchResponse.json();
        const files = searchResult.data?.files || [];

        if (files.length === 0) return;

        const fileId = files[0].id;

        // Delete the file
        await fetchWithTimeout(`https://api.pinata.cloud/v3/files/${fileId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`,
            },
        }, 5000);

        console.log("Unpinned old chat file:", cid);
    } catch (error) {
        // Non-critical error, just log
        console.error("Error unpinning old chat:", error);
    }
}

// GET: Fetch all messages for a property
export async function GET(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json(
                { success: false, error: "Pinata not configured" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId");

        if (!propertyId) {
            return NextResponse.json(
                { success: false, error: "propertyId is required" },
                { status: 400 }
            );
        }

        const { data } = await fetchExistingChat(propertyId);

        return NextResponse.json({
            success: true,
            messages: data?.messages || [],
            lastUpdated: data?.lastUpdated || null
        });

    } catch (error: any) {
        console.error("Chat fetch error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch chat" },
            { status: 500 }
        );
    }
}

// POST: Add a new message
export async function POST(request: NextRequest) {
    try {
        if (!PINATA_JWT) {
            return NextResponse.json(
                { success: false, error: "Pinata not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { propertyId, sender, content } = body;

        if (!propertyId || !sender || !content) {
            return NextResponse.json(
                { success: false, error: "propertyId, sender, and content are required" },
                { status: 400 }
            );
        }

        // Fetch existing chat
        const { data: existingData, cid: oldCid } = await fetchExistingChat(propertyId);

        // Create new message
        const timestamp = Date.now();
        const newMessage: ChatMessage = {
            id: generateMessageId(sender, timestamp),
            sender,
            content,
            timestamp,
            propertyId
        };

        // Merge with existing messages
        const existingMessages = existingData?.messages || [];

        // Check for duplicate (same sender + content within 5 seconds)
        const isDuplicate = existingMessages.some(
            (msg: ChatMessage) => msg.sender.toLowerCase() === sender.toLowerCase() &&
                msg.content === content &&
                Math.abs(msg.timestamp - timestamp) < 5000
        );

        if (isDuplicate) {
            return NextResponse.json({
                success: true,
                message: newMessage,
                messages: existingMessages,
                duplicate: true
            });
        }

        // Add new message
        const updatedMessages = [...existingMessages, newMessage];

        // Create updated chat data
        const updatedChatData: ChatData = {
            propertyId,
            messages: updatedMessages,
            lastUpdated: timestamp
        };

        // Pin new chat data
        const newCid = await pinChatData(updatedChatData);

        if (!newCid) {
            return NextResponse.json(
                { success: false, error: "Failed to save message to IPFS" },
                { status: 500 }
            );
        }

        // Unpin old chat file (async, don't wait)
        if (oldCid) {
            unpinOldChat(oldCid).catch(console.error);
        }

        return NextResponse.json({
            success: true,
            message: newMessage,
            messages: updatedMessages,
            cid: newCid
        });

    } catch (error: any) {
        console.error("Chat save error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to save message" },
            { status: 500 }
        );
    }
}
