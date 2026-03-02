import { NextRequest, NextResponse } from "next/server";
import { calculatePhashSimilarity } from "@/lib/phash";
import type { PhashScore } from "@/lib/types";

interface MatchInput {
  url: string;
  title: string;
  thumbnail: string;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, matches } = (await request.json()) as {
      imageBase64: string;
      matches: MatchInput[];
    };

    if (!imageBase64 || !matches) {
      return NextResponse.json(
        { error: "imageBase64 and matches are required" },
        { status: 400 }
      );
    }

    const targetBuffer = Buffer.from(imageBase64, "base64");

    // サムネイルを並列ダウンロードしてpHash計算
    const results = await Promise.all(
      matches.map(async (match): Promise<PhashScore> => {
        if (!match.thumbnail) {
          return { url: match.url, title: match.title, similarity: -1 };
        }

        try {
          const resp = await fetch(match.thumbnail, {
            signal: AbortSignal.timeout(10000),
          });
          if (!resp.ok) {
            return { url: match.url, title: match.title, similarity: -1 };
          }
          const refBuffer = Buffer.from(await resp.arrayBuffer());
          const similarity = await calculatePhashSimilarity(
            targetBuffer,
            refBuffer
          );
          return { url: match.url, title: match.title, similarity };
        } catch {
          return { url: match.url, title: match.title, similarity: -1 };
        }
      })
    );

    return NextResponse.json({ scores: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "pHash calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
