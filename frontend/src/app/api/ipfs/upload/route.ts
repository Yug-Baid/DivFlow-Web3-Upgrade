import { NextRequest, NextResponse } from "next/server";

// Server-side Pinata configuration (NOT exposed to browser)
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GROUP_ID = process.env.PINATA_GROUP_ID; // Optional: organize files in a group

export async function POST(request: NextRequest) {
    try {
        // Validate JWT is configured
        if (!PINATA_JWT) {
            return NextResponse.json(
                { success: false, error: "Pinata not configured on server" },
                { status: 500 }
            );
        }

        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            );
        }

        // Create new form data for Pinata
        const pinataFormData = new FormData();
        pinataFormData.append("file", file);
        pinataFormData.append("network", "public");

        // Add metadata - Pinata V3 requires separate name and keyvalues fields
        // All keyvalues must be strings
        pinataFormData.append("name", file.name || "divflow-upload");
        
        const keyvalues = JSON.stringify({
            uploadedAt: new Date().toISOString(),
            type: "divflow-document",
            project: "DivFlow"
        });
        pinataFormData.append("keyvalues", keyvalues);

        // Add to group if configured
        if (PINATA_GROUP_ID) {
            pinataFormData.append("group_id", PINATA_GROUP_ID);
        }

        // Upload to Pinata using V3 API
        const response = await fetch("https://uploads.pinata.cloud/v3/files", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`,
            },
            body: pinataFormData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Pinata upload failed:", errorData);
            return NextResponse.json(
                { success: false, error: errorData.error?.message || "Upload failed" },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return the CID (Content Identifier) for the uploaded file
        return NextResponse.json({
            success: true,
            cid: data.data.cid,
            id: data.data.id,
            name: data.data.name
        });

    } catch (error: any) {
        console.error("IPFS upload error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
