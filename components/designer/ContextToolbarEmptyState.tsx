"use client";

import { tb } from "./toolbar-interaction-ui";
import { ds } from "./design-ui";
import type { ShapeKind } from "@/lib/types";

export function ContextToolbarEmptyState({
  hasImage,
  hasText,
  hasShape,
  disabled,
  onUpload,
  onAddText,
  onAddShape,
}: {
  hasImage: boolean;
  hasText: boolean;
  hasShape: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeKind) => void;
}) {
  if (hasImage && hasText && hasShape) return null;

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-1.5 border-t border-zinc-100 bg-zinc-50/60 px-1 py-1 ${ds.type.body}`}
      role="status"
    >
      <span className={`shrink-0 ${ds.type.label}`}>開始設計</span>
      {!hasImage && (
        <label className={`${tb.actionButton} cursor-pointer`}>
          <span>圖片</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {!hasText && (
        <button
          type="button"
          disabled={disabled}
          onClick={onAddText}
          className={tb.actionButton}
        >
          文字
        </button>
      )}
      {!hasShape && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddShape("rectangle")}
          className={tb.actionButton}
        >
          圖形
        </button>
      )}
    </div>
  );
}
