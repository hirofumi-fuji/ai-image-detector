import { NextRequest, NextResponse } from "next/server";
import { analyzeArtStyle } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = await request.json();

  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { error: "imageBase64 and mimeType are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const analysis = await analyzeArtStyle(imageBase64, mimeType, apiKey);
    return NextResponse.json(analysis);
  } catch (firstError) {
    // リトライ1回
    try {
      const analysis = await analyzeArtStyle(imageBase64, mimeType, apiKey);
      return NextResponse.json(analysis);
    } catch {
      const message =
        firstError instanceof Error ? firstError.message : "AI analysis failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
