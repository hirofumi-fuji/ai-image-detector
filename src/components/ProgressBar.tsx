"use client";

import type { AnalysisProgress } from "@/lib/types";

const stepLabels: Record<string, string> = {
  uploading: "一時アップロード中...",
  "lens-search": "Google Lens検索を実行中...",
  "ai-analysis": "AI画風分析を実行中...",
  phash: "pHash類似度を計算中...",
  done: "完了",
  error: "エラーが発生しました",
};

interface Props {
  progress: AnalysisProgress;
}

export default function ProgressBar({ progress }: Props) {
  const { currentImage, totalImages, step, message } = progress;

  if (step === "idle") return null;

  // 各画像に4ステップ。stepのindexで進捗を計算
  const stepIndex = ["uploading", "lens-search", "ai-analysis", "phash", "done"].indexOf(step);
  const stepsPerImage = 4;
  const completedSteps = (currentImage - 1) * stepsPerImage + Math.max(0, stepIndex);
  const totalSteps = totalImages * stepsPerImage;
  const percent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-blue-400">
          分析中... ({currentImage}/{totalImages}) {message}
        </span>
        <span className="text-gray-400">{percent}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{stepLabels[step] || ""}</p>
    </div>
  );
}
