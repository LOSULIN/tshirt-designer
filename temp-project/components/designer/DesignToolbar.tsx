"use client";

import { UPLOAD_FILE_HINT } from "@/lib/constants";
import type { ShapeKind } from "@/lib/types";
import { SHAPE_KIND_OPTIONS } from "@/lib/shape-layer";

export function DesignToolbar({
  isBusy,
  readOnly = false,
  warnings,
  onUpload,
  onAddText,
  onAddShape,
}: {
  isBusy: boolean;
  readOnly?: boolean;
  warnings: string[];
  onUpload: (file: File) => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeKind) => void;
}) {
  const disabled = isBusy || readOnly;
  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100">
          <span>🖼️</span>
          <span>上傳圖片</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={onAddText}
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
        >
          <span className="font-serif">T</span>
          <span>新增文字</span>
        </button>
        {SHAPE_KIND_OPTIONS.map((shape) => (
          <button
            key={shape.id}
            type="button"
            disabled={disabled}
            onClick={() => onAddShape(shape.id)}
            className="flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            title={`新增${shape.label}`}
          >
            <span aria-hidden>
              {shape.id === "rectangle"
                ? "▭"
                : shape.id === "circle"
                  ? "○"
                  : shape.id === "line"
                    ? "─"
                    : "→"}
            </span>
            <span className="hidden sm:inline">{shape.label}</span>
          </button>
        ))}
        <p className="w-full text-[10px] text-zinc-500">{UPLOAD_FILE_HINT}</p>
        <p className="text-[10px] text-zinc-500">
          選取後用工具列 ⋮⋮ 拖曳 · +/− 縮放 · 雙擊編輯文字
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <p
              key={w}
              className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-800"
            >
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
