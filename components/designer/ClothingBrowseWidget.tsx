"use client";

import { PRINT_AREA, type ShirtColor, type Side } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import { FlatShirtDesignView } from "./FlatShirtDesignView";

const THUMB_WIDTH = 108;
const THUMB_PRINT_WIDTH_RATIO = 0.38;
const TEXT_SCALE =
  (THUMB_WIDTH * THUMB_PRINT_WIDTH_RATIO) / PRINT_AREA.width;

export function ClothingBrowseWidget({
  side,
  shirtColor,
  layers,
  onOpen,
}: {
  side: Side;
  shirtColor: ShirtColor;
  layers: DesignLayer[];
  onOpen: () => void;
}) {
  return (
    <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1.5">
      <button
        type="button"
        title="放大瀏覽平面衣服設計（正面與背面）"
        onClick={onOpen}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
      >
        衣服瀏覽
      </button>
      <button
        type="button"
        title="點擊放大瀏覽"
        onClick={onOpen}
        className="w-[108px] overflow-hidden rounded-md border border-zinc-300 bg-white shadow-lg transition hover:border-zinc-400"
      >
        <FlatShirtDesignView
          side={side}
          shirtColor={shirtColor}
          layers={layers}
          textScale={TEXT_SCALE}
        />
      </button>
    </div>
  );
}
