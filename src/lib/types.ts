export interface LensMatch {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

export interface LensData {
  visual_matches: LensMatch[];
  knowledge_graph: Record<string, unknown>[];
}

export interface AiAnalysis {
  similar_artists: string[];
  style_description: string;
  risk_factors: string[];
  recommendation: "SAFE" | "CAUTION" | "DANGER";
}

export interface PhashScore {
  url: string;
  title: string;
  similarity: number;
}

export type Recommendation = "SAFE" | "CAUTION" | "DANGER";

export interface ImageReport {
  filename: string;
  timestamp: string;
  lens_results: LensMatch[];
  ai_analysis: AiAnalysis;
  phash_scores: PhashScore[];
  overall_recommendation: Recommendation;
}

export type AnalysisStep =
  | "idle"
  | "uploading"
  | "lens-search"
  | "ai-analysis"
  | "phash"
  | "done"
  | "error";

export interface AnalysisProgress {
  currentImage: number;
  totalImages: number;
  step: AnalysisStep;
  message: string;
}
