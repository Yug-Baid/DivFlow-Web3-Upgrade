import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Filebase S3 configuration
const FILEBASE_ACCESS_KEY = process.env.FILEBASE_ACCESS_KEY;
const FILEBASE_SECRET_KEY = process.env.FILEBASE_SECRET_KEY;
const FILEBASE_BUCKET = process.env.FILEBASE_BUCKET;

// Initialize S3 client for Filebase
const s3Client = FILEBASE_ACCESS_KEY && FILEBASE_SECRET_KEY ? new S3Client({
    endpoint: "https://s3.filebase.com",
    region: "us-east-1", // Filebase uses us-east-1
    credentials: {
        accessKeyId: FILEBASE_ACCESS_KEY,
        secretAccessKey: FILEBASE_SECRET_KEY,
    },
}) : null;

export async function POST(request: NextRequest) {
    try {
        // Validate configuration
        if (!s3Client || !FILEBASE_BUCKET) {
            return NextResponse.json(
                { success: false, error: "Filebase not configured on server" },
                { status: 500 }
            );
        }

        // Get the form data
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const existingCid = formData.get("cid") as string | null; // For backup pinning

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const fileName = existingCid
            ? `${existingCid}-backup`
            : `divflow-${timestamp}-${file.name}`;

        // Upload to Filebase (IPFS)
        const command = new PutObjectCommand({
            Bucket: FILEBASE_BUCKET,
            Key: fileName,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            Metadata: {
                "x-amz-meta-source": "divflow",
                "x-amz-meta-uploaded-at": new Date().toISOString(),
                "x-amz-meta-original-cid": existingCid || "",
            },
        });

        const response = await s3Client.send(command);

        // Filebase returns the CID in the x-amz-meta-cid header
        // For now, we'll return success and the file key
        // The CID can be retrieved via the Filebase console or API
        return NextResponse.json({
            success: true,
            key: fileName,
            provider: "filebase",
            message: "File pinned to Filebase IPFS"
        });

    } catch (error: any) {
        console.error("Filebase upload error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Filebase upload failed" },
            { status: 500 }
        );
    }
}
