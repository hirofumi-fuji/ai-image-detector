"use client";

import { useState, useCallback } from "react";
import type {
  ImageReport,
  AnalysisProgress,
  LensData,
  AiAnalysis,
  PhashScore,
} from "@/lib/types";
import { buildReport } from "@/lib/report";

interface UseAnalysisReturn {
  reports: ImageReport[];
  progress: AnalysisProgress;
  isRunning: boolean;
  error: string | null;
  runAnalysis: (
    files: File[],
    phashThreshold: number,
    maxLensResults: number
  ) => Promise<void>;
  clearResults: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/png;base64,XXXX → XXXX
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useAnalysis(): UseAnalysisReturn {
  const [reports, setReports] = useState<ImageReport[]>([]);
  const [progress, setProgress] = useState<AnalysisProgress>({
    currentImage: 0,
    totalImages: 0,
    step: "idle",
    message: "",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearResults = useCallback(() => {
    setReports([]);
    setError(null);
    setProgress({ currentImage: 0, totalImages: 0, step: "idle", message: "" });
  }, []);

  const runAnalysis = useCallback(
    async (files: File[], phashThreshold: number, maxLensResults: number) => {
      setIsRunning(true);
      setError(null);
      setReports([]);
      const allReports: ImageReport[] = [];

      try {
        for (let idx = 0; idx < files.length; idx++) {
          const file = files[idx];
          const base64 = await fileToBase64(file);

          // ── 1. tmpfiles.orgアップロード & AI分析を並列実行 ──
          setProgress({
            currentImage: idx + 1,
            totalImages: files.length,
            step: "uploading",
            message: file.name,
          });

          const uploadPromise = fetch("/api/upload-temp", {
            method: "POST",
            body: (() => {
              const fd = new FormData();
              fd.append("file", file);
              return fd;
            })(),
          }).then((r) => r.json());

          setProgress({
            currentImage: idx + 1,
            totalImages: files.length,
            step: "ai-analysis",
            message: file.name,
          });

          const analyzePromise = fetch("/api/analyze-style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
          }).then((r) => r.json());

          const [uploadResult, aiResult] = await Promise.all([
            uploadPromise,
            analyzePromise,
          ]);

          if (uploadResult.error) {
            throw new Error(`アップロードエラー: ${uploadResult.error}`);
          }

          const aiAnalysis: AiAnalysis = aiResult.error
            ? {
                similar_artists: [],
                style_description: "分析不可",
                risk_factors: [],
                recommendation: "CAUTION",
              }
            : aiResult;

          // ── 2. Google Lens検索 ──
          setProgress({
            currentImage: idx + 1,
            totalImages: files.length,
            step: "lens-search",
            message: file.name,
          });

          let lensData: LensData = { visual_matches: [], knowledge_graph: [] };
          try {
            const lensResp = await fetch("/api/search-lens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: uploadResult.url }),
            });
            const lensJson = await lensResp.json();
            if (!lensJson.error) {
              lensData = lensJson;
            }
          } catch {
            // Lens検索失敗は続行
          }

          const lensResults = lensData.visual_matches.slice(0, maxLensResults);

          // ── 3. pHash計算 ──
          setProgress({
            currentImage: idx + 1,
            totalImages: files.length,
            step: "phash",
            message: file.name,
          });

          let phashScores: PhashScore[] = [];
          if (lensResults.length > 0) {
            try {
              const phashResp = await fetch("/api/calculate-phash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageBase64: base64,
                  matches: lensResults.map((m) => ({
                    url: m.link,
                    title: m.title,
                    thumbnail: m.thumbnail,
                  })),
                }),
              });
              const phashJson = await phashResp.json();
              if (!phashJson.error) {
                phashScores = phashJson.scores;
              }
            } catch {
              // pHash失敗は続行
            }
          }

          // ── 4. レポート生成 ──
          const report = buildReport(
            file.name,
            lensResults,
            aiAnalysis,
            phashScores,
            phashThreshold
          );
          allReports.push(report);
          setReports([...allReports]);
        }

        setProgress({
          currentImage: files.length,
          totalImages: files.length,
          step: "done",
          message: "",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "分析中にエラーが発生しました";
        setError(message);
        setProgress((prev) => ({ ...prev, step: "error", message }));
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return { reports, progress, isRunning, error, runAnalysis, clearResults };
}
