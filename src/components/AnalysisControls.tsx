"use client";

interface Props {
  phashThreshold: number;
  onPhashThresholdChange: (value: number) => void;
  maxLensResults: number;
  onMaxLensResultsChange: (value: number) => void;
  onStart: () => void;
  canStart: boolean;
  isRunning: boolean;
}

export default function AnalysisControls({
  phashThreshold,
  onPhashThresholdChange,
  maxLensResults,
  onMaxLensResultsChange,
  onStart,
  canStart,
  isRunning,
}: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-5 space-y-5">
      <h2 className="text-lg font-semibold text-gray-200">設定</h2>

      <div>
        <label className="text-sm text-gray-400 block mb-1">
          pHash類似度閾値（CAUTION判定）: {phashThreshold.toFixed(2)}
        </label>
        <input
          type="range"
          min={0.5}
          max={1.0}
          step={0.05}
          value={phashThreshold}
          onChange={(e) => onPhashThresholdChange(Number(e.target.value))}
          className="w-full accent-blue-500"
          disabled={isRunning}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.50</span>
          <span>1.00</span>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-1">
          Lens検索表示件数: {maxLensResults}
        </label>
        <input
          type="range"
          min={3}
          max={10}
          step={1}
          value={maxLensResults}
          onChange={(e) => onMaxLensResultsChange(Number(e.target.value))}
          className="w-full accent-blue-500"
          disabled={isRunning}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>3</span>
          <span>10</span>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={!canStart || isRunning}
        className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
          canStart && !isRunning
            ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isRunning ? "分析中..." : "分析開始"}
      </button>
    </div>
  );
}
