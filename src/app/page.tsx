"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import AnalysisControls from "@/components/AnalysisControls";
import ProgressBar from "@/components/ProgressBar";
import ResultCard from "@/components/ResultCard";
import CsvDownload from "@/components/CsvDownload";
import { useAnalysis } from "@/hooks/useAnalysis";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [phashThreshold, setPhashThreshold] = useState(0.85);
  const [maxLensResults, setMaxLensResults] = useState(5);

  const { reports, progress, isRunning, error, runAnalysis, clearResults } =
    useAnalysis();

  const handleStart = () => {
    if (files.length === 0) return;
    clearResults();
    runAnalysis(files, phashThreshold, maxLensResults);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          画像著作権リスク判定ツール
        </h1>

        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-6">
          <p className="text-yellow-300 text-sm">
            本ツールは類似性の参考情報を提示するものであり、著作権侵害の有無を法的に保証するものではありません。最終判断は必ず人間が行い、必要に応じて法務専門家にご相談ください。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインエリア */}
          <div className="lg:col-span-2 space-y-6">
            {/* 結果表示 */}
            {progress.step !== "idle" && (
              <ProgressBar progress={progress} />
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {reports.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-200">
                  分析結果
                </h2>
                {reports.map((report, i) => (
                  <ResultCard key={`${report.filename}-${i}`} report={report} />
                ))}
                <CsvDownload reports={reports} />
              </div>
            )}

            {/* 画像アップロード */}
            <div>
              <h2 className="text-lg font-semibold text-gray-200 mb-3">
                判定する画像をアップロード
              </h2>
              <ImageUploader
                files={files}
                onFilesChange={setFiles}
                disabled={isRunning}
              />
            </div>
          </div>

          {/* サイドバー */}
          <div>
            <AnalysisControls
              phashThreshold={phashThreshold}
              onPhashThresholdChange={setPhashThreshold}
              maxLensResults={maxLensResults}
              onMaxLensResultsChange={setMaxLensResults}
              onStart={handleStart}
              canStart={files.length > 0}
              isRunning={isRunning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
