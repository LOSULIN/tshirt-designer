"use client";

import {
  getShirtColorName,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import { DEFAULT_PRINT_MODE, type PreviewPrintPositionMode } from "@/lib/printArea";
import type { DesignLayer } from "@/lib/types";
import { FlatShirtDesignView } from "./FlatShirtDesignView";

/** 右側 T-shirt 視覺預覽（僅圖形，不含數據） */
export function ClothingBrowsePanel({
  gender,
  side,
  shirtColor,
  size,
  layers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  onExpand,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: Size;
  layers: DesignLayer[];
  previewPrintPositionMode?: PreviewPrintPositionMode;
  onExpand: () => void;
}) {
  const sideLabel = side === "front" ? "正面" : "背面";

  return (
    <aside
      className="relative z-30 flex h-full min-h-0 w-44 shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white sm:w-48"
      aria-label="T-shirt Preview"
    >
      <div className="shrink-0 border-b border-zinc-100 px-2.5 py-2">
        <h3 className="text-xs font-semibold text-zinc-900">T-shirt Preview</h3>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
          {getShirtColorName(shirtColor)} · {sideLabel}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 shadow-sm">
          <FlatShirtDesignView
            gender={gender}
            side={side}
            shirtColor={shirtColor}
            size={size}
            layers={layers}
            previewPrintPositionMode={previewPrintPositionMode}
            compact
          />
        </div>

        <button
          type="button"
          title="放大瀏覽平面衣服設計（正面與背面）"
          onClick={onExpand}
          className="shrink-0 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
        >
          放大瀏覽
        </button>
      </div>
    </aside>
  );
}
