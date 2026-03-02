import { NextRequest, NextResponse } from "next/server";
import { analyzeArtStyle } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  console.log("[analyze-style] START");
  try {
    const { imageBase64, mimeType } = await request.json();
    console.log("[analyze-style] mimeType:", mimeType, "base64 length:", imageBase64?.length);

    if (!imageBase64 || !mimeType) {
      console.error("[analyze-style] Missing params");
      return NextResponse.json(
        { error: "imageBase64 and mimeType are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[analyze-style] GEMINI_API_KEY not set");
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }
    console.log("[analyze-style] API key present, length:", apiKey.length);

    const analysis = await analyzeArtStyle(imageBase64, mimeType, apiKey);
    console.log("[analyze-style] OK:", analysis.recommendation);

    return NextResponse.json(analysis);
  } catch (firstError) {
    console.error("[analyze-style] First attempt failed:", firstError);
    // リトライ1回
    try {
      const { imageBase64, mimeType } = await request.clone().json().catch(() => ({ imageBase64: null, mimeType: null }));
      if (!imageBase64 || !mimeType) throw firstError;
      const apiKey = process.env.GEMINI_API_KEY!;
      const analysis = await analyzeArtStyle(imageBase64, mimeType, apiKey);
      console.log("[analyze-style] Retry OK:", analysis.recommendation);
      return NextResponse.json(analysis);
    } catch {
      const message =
        firstError instanceof Error ? firstError.message : "AI analysis failed";
      console.error("[analyze-style] Retry also failed:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
