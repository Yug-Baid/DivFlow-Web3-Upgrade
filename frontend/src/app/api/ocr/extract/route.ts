import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const OCR_API_URL = (process.env.OCR_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const MAX_FILE_BYTES = Number(process.env.OCR_MAX_FILE_MB || 25) * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

export async function POST(request: NextRequest) {
  try {
    const input = await request.formData();
    const file = input.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No document provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use a PDF, PNG, JPEG, WEBP, or TIFF document" }, { status: 415 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Document exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit` },
        { status: 413 },
      );
    }

    const upstream = new FormData();
    upstream.append("file", file, file.name);
    const response = await fetch(`${OCR_API_URL}/v1/documents/extract`, {
      method: "POST",
      body: upstream,
      cache: "no-store",
      signal: AbortSignal.timeout(Number(process.env.OCR_API_TIMEOUT_MS || 300000)),
    });
    const body = await response.json().catch(() => ({ detail: "OCR service returned an invalid response" }));

    if (!response.ok) {
      return NextResponse.json(
        { error: body.detail || body.error || "Document extraction failed" },
        { status: response.status },
      );
    }
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "OCR service timed out"
      : "OCR service is unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
