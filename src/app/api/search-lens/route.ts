import { NextRequest, NextResponse } from "next/server";
import { searchSimilarImages } from "@/lib/serpapi";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SERPAPI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const lensData = await searchSimilarImages(imageUrl, apiKey);

    return NextResponse.json(lensData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lens search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
