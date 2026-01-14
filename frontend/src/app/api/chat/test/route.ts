import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    // Read env directly inside the function (not at module level)
    const jwt = process.env.PINATA_JWT;
    const isConfigured = !!jwt && jwt.length > 10;
    const jwtPreview = jwt ? `${jwt.slice(0, 30)}...` : 'NOT SET';

    // Log to server console for debugging
    console.log("=== PINATA DEBUG ===");
    console.log("PINATA_JWT configured:", isConfigured);
    console.log("JWT length:", jwt?.length || 0);

    let pinataReachable = false;
    let pinataError = null;
    let apiResponse = null;

    if (isConfigured) {
        try {
            console.log("Testing Pinata API...");
            const response = await fetch('https://api.pinata.cloud/v3/files?limit=1', {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            apiResponse = { status: response.status, statusText: response.statusText };

            if (response.ok) {
                pinataReachable = true;
                console.log("✅ Pinata is working!");
            } else {
                const errorText = await response.text();
                pinataError = `HTTP ${response.status}: ${errorText.slice(0, 100)}`;
                console.log("❌ Pinata error:", pinataError);
            }
        } catch (error: any) {
            pinataError = error.message || 'Connection failed';
            console.log("❌ Connection error:", pinataError);
        }
    }

    return NextResponse.json({
        success: true,
        pinataConfigured: isConfigured,
        pinataJwtPreview: jwtPreview,
        pinataReachable,
        pinataError,
        apiResponse,
        message: isConfigured
            ? (pinataReachable ? '✅ Pinata is working!' : `⚠️ Error: ${pinataError}`)
            : '❌ PINATA_JWT not found. Delete .next folder and restart server.'
    });
}
