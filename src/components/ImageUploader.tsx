"use client";

import { useCallback, useRef } from "react";

interface Props {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled: boolean;
}

export default function ImageUploader({ files, onFilesChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (dropped.length > 0) onFilesChange([...files, ...dropped]);
    },
    [files, onFilesChange, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 0) onFilesChange([...files, ...selected]);
      e.target.value = "";
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          disabled
            ? "border-gray-600 bg-gray-800/50 cursor-not-allowed"
            : "border-gray-500 hover:border-blue-400 cursor-pointer bg-gray-800/30"
        }`}
      >
        <p className="text-gray-300 text-lg mb-1">
          画像をドラッグ＆ドロップ、またはクリックして選択
        </p>
        <p className="text-gray-500 text-sm">PNG, JPG, JPEG, WebP</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-28 object-cover rounded-lg border border-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1 truncate">{file.name}</p>
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
