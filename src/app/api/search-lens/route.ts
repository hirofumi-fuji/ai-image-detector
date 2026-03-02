import { NextRequest, NextResponse } from "next/server";
import { searchSimilarImages } from "@/lib/serpapi";

export async function POST(request: NextRequest) {
  console.log("[search-lens] START");
  try {
    const { imageUrl } = await request.json();
    console.log("[search-lens] imageUrl:", imageUrl?.slice(0, 80));

    if (!imageUrl) {
      console.error("[search-lens] No imageUrl");
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.error("[search-lens] SERPAPI_API_KEY not set");
      return NextResponse.json(
        { error: "SERPAPI_API_KEY not configured" },
        { status: 500 }
      );
    }
    console.log("[search-lens] API key present, length:", apiKey.length);

    const lensData = await searchSimilarImages(imageUrl, apiKey);
    console.log("[search-lens] OK, matches:", lensData.visual_matches.length);

    return NextResponse.json(lensData);
  } catch (error) {
    console.error("[search-lens] ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Lens search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
