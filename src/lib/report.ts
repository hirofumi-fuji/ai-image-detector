import type {
  AiAnalysis,
  ImageReport,
  LensMatch,
  PhashScore,
  Recommendation,
} from "./types";

export function determineRecommendation(
  aiAnalysis: AiAnalysis,
  lensResults: LensMatch[],
  phashScores: PhashScore[],
  phashThreshold: number = 0.85
): Recommendation {
  const aiRec = aiAnalysis.recommendation || "SAFE";

  if (aiRec === "DANGER") return "DANGER";
  if (aiRec === "CAUTION") return "CAUTION";

  // lens_resultsのタイトルにアーティスト名が含まれるかチェック
  const similarArtists = aiAnalysis.similar_artists || [];
  if (similarArtists.length > 0 && lensResults.length > 0) {
    for (const result of lensResults) {
      const title = (result.title || "").toLowerCase();
      for (const artist of similarArtists) {
        if (title.includes(artist.toLowerCase())) {
          return "CAUTION";
        }
      }
    }
  }

  // pHash最大値チェック
  const validScores = phashScores
    .map((s) => s.similarity)
    .filter((s) => s >= 0);
  if (validScores.length > 0 && Math.max(...validScores) > phashThreshold) {
    return "CAUTION";
  }

  return "SAFE";
}

export function buildReport(
  filename: string,
  lensResults: LensMatch[],
  aiAnalysis: AiAnalysis,
  phashScores: PhashScore[],
  phashThreshold: number = 0.85
): ImageReport {
  const recommendation = determineRecommendation(
    aiAnalysis,
    lensResults,
    phashScores,
    phashThreshold
  );

  return {
    filename,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    lens_results: lensResults.slice(0, 5),
    ai_analysis: aiAnalysis,
    phash_scores: phashScores,
    overall_recommendation: recommendation,
  };
}
