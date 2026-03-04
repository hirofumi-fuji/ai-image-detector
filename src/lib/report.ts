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

  // pHash最大値を取得
  const validScores = phashScores
    .map((s) => s.similarity)
    .filter((s) => s >= 0);
  const maxPhash = validScores.length > 0 ? Math.max(...validScores) : 0;

  // pHash 80%以上 → DANGER
  if (maxPhash >= 0.80) return "DANGER";

  // AI判定がDANGER → DANGER
  if (aiRec === "DANGER") return "DANGER";

  // pHash 70%以上 → CAUTION
  if (maxPhash >= 0.70) return "CAUTION";

  // AI判定がCAUTION → CAUTION
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
