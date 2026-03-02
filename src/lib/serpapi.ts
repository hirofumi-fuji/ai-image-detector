import type { LensData, LensMatch } from "./types";

export async function searchSimilarImages(
  imageUrl: string,
  apiKey: string
): Promise<LensData> {
  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    hl: "ja",
    country: "jp",
    api_key: apiKey,
  });

  const resp = await fetch(`https://serpapi.com/search.json?${params}`);

  if (!resp.ok) {
    throw new Error(`SerpApi error: ${resp.status}`);
  }

  const results = await resp.json();

  if (results.error) {
    throw new Error(results.error);
  }

  return parseLensResults(results);
}

function parseLensResults(results: Record<string, unknown>): LensData {
  const rawMatches = (results.visual_matches as Record<string, string>[]) || [];
  const visual_matches: LensMatch[] = rawMatches.map((match) => ({
    title: match.title || "",
    link: match.link || "",
    thumbnail: match.thumbnail || "",
    source: match.source || "",
  }));

  let knowledge_graph: Record<string, unknown>[] = [];
  const rawKg = results.knowledge_graph;
  if (Array.isArray(rawKg)) {
    knowledge_graph = rawKg;
  } else if (rawKg && typeof rawKg === "object") {
    knowledge_graph = [rawKg as Record<string, unknown>];
  }

  return { visual_matches, knowledge_graph };
}
