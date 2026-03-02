import type { ImageReport } from "./types";

export function reportsToCsv(reports: ImageReport[]): string {
  const headers = [
    "filename",
    "analyzed_at",
    "overall_recommendation",
    "similar_artists",
    "style_description",
    "risk_factors",
    "top_lens_result_title",
    "top_lens_result_url",
    "max_phash_similarity",
  ];

  const rows = reports.map((r) => {
    const similarArtists = (r.ai_analysis.similar_artists || []).join(", ");
    const riskFactors = (r.ai_analysis.risk_factors || []).join(", ");
    const topTitle =
      r.lens_results.length > 0 ? r.lens_results[0].title : "";
    const topUrl =
      r.lens_results.length > 0 ? r.lens_results[0].link : "";
    const validScores = r.phash_scores
      .map((s) => s.similarity)
      .filter((s) => s >= 0);
    const maxPhash =
      validScores.length > 0 ? Math.max(...validScores).toString() : "";

    return [
      r.filename,
      r.timestamp,
      r.overall_recommendation,
      similarArtists,
      r.ai_analysis.style_description || "",
      riskFactors,
      topTitle,
      topUrl,
      maxPhash,
    ].map(escapeCsvField);
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
