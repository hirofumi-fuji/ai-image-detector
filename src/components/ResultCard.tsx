"use client";

import { useState } from "react";
import type { ImageReport } from "@/lib/types";

interface Props {
  report: ImageReport;
}

const badgeConfig = {
  DANGER: {
    label: "DANGER",
    bg: "bg-red-900/50",
    border: "border-red-700",
    text: "text-red-400",
    message: "使用は避けてください — 既存作品と明らかに似ています",
    msgBg: "bg-red-950/50",
  },
  CAUTION: {
    label: "CAUTION",
    bg: "bg-yellow-900/50",
    border: "border-yellow-700",
    text: "text-yellow-400",
    message: "念のため確認を — 似ている部分が見つかりました",
    msgBg: "bg-yellow-950/50",
  },
  SAFE: {
    label: "SAFE",
    bg: "bg-green-900/50",
    border: "border-green-700",
    text: "text-green-400",
    message: "問題なさそうです — 既存作品との類似性は低いです",
    msgBg: "bg-green-950/50",
  },
} as const;

export default function ResultCard({ report }: Props) {
  const rec = report.overall_recommendation;
  const config = badgeConfig[rec];
  const [open, setOpen] = useState(rec !== "SAFE");

  const validScores = report.phash_scores.filter((s) => s.similarity >= 0);
  const topScore =
    validScores.length > 0
      ? validScores.reduce((a, b) => (a.similarity > b.similarity ? a : b))
      : null;

  return (
    <div className={`rounded-lg border ${config.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 flex items-center justify-between ${config.bg} hover:brightness-110 transition-all`}
      >
        <span className="text-gray-200 font-medium">{report.filename}</span>
        <span className={`font-bold ${config.text}`}>{config.label}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-gray-900/50">
          {/* 総合判定メッセージ */}
          <div className={`${config.msgBg} rounded-lg p-3`}>
            <p className={config.text}>{config.message}</p>
          </div>

          {/* AI分析結果 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">画像の特徴</h4>
            <p className="text-gray-400 text-sm">
              {report.ai_analysis.style_description || "（分析できませんでした）"}
            </p>
          </div>

          {report.ai_analysis.similar_artists.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                似ているアーティスト
              </h4>
              <p className="text-gray-400 text-sm">
                {report.ai_analysis.similar_artists.join("、")}
              </p>
            </div>
          )}

          {report.ai_analysis.risk_factors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">注意ポイント</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                {report.ai_analysis.risk_factors.map((r, i) => (
                  <li key={i}>- {r}</li>
                ))}
              </ul>
            </div>
          )}

          <hr className="border-gray-700" />

          {/* Google Lens検索結果 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">
              ネット上の類似画像
            </h4>
            {report.lens_results.length > 0 ? (
              <ul className="text-sm space-y-1">
                {report.lens_results.map((result, i) => (
                  <li key={i} className="text-gray-400">
                    {i + 1}.{" "}
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {result.title || "不明"}
                    </a>
                    {result.source && (
                      <span className="text-gray-500"> - {result.source}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">
                似ている画像は見つかりませんでした
              </p>
            )}
          </div>

          <hr className="border-gray-700" />

          {/* pHash類似度 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">
              画像の一致度（数値が高いほど似ている）
            </h4>
            {topScore ? (
              <p className="text-gray-400 text-sm">
                最も似ている画像との一致度:{" "}
                <span className="font-bold text-gray-200">
                  {Math.round(topScore.similarity * 100)}%
                </span>{" "}
                （{topScore.title || topScore.url || "N/A"}）
              </p>
            ) : (
              <p className="text-gray-500 text-sm">
                比較できる画像がありませんでした
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
