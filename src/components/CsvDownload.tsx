"use client";

import type { ImageReport } from "@/lib/types";
import { reportsToCsv } from "@/lib/csv";

interface Props {
  reports: ImageReport[];
}

export default function CsvDownload({ reports }: Props) {
  if (reports.length === 0) return null;

  const handleDownload = () => {
    const csv = reportsToCsv(reports);
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "copyright_check_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-colors cursor-pointer"
    >
      レポートCSVダウンロード
    </button>
  );
}
