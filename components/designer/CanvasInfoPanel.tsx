"use client";

import type { Size } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import { MvpLayerList } from "./MvpLayerList";
import { PreviewInfoPanel } from "./PreviewInfoPanel";

/** 預覽畫布左側空白區 — 整合顯示設計數據與 Layer List */
export function CanvasInfoPanel({
  size,
  layers,
  selectedLayerId,
  isBusy,
  onSelectLayer,
  onMoveLayer,
}: {
  size: Size;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  isBusy: boolean;
  onSelectLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down") => void;
}) {
  return (
    <aside
      className="flex h-full min-h-0 w-40 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white sm:w-44"
      aria-label="設計數據 Info Panel"
    >
      <div className="shrink-0 border-b border-zinc-100 px-2.5 py-2">
        <h3 className="text-xs font-semibold text-zinc-900">Info Panel</h3>
        <p className="mt-0.5 text-[10px] text-zinc-500">每元素獨立數據（cm）</p>
      </div>

      <PreviewInfoPanel
        size={size}
        layers={layers}
        selectedLayerId={selectedLayerId}
        className="min-h-0 flex-1 overflow-y-auto"
      />

      <MvpLayerList
        layers={layers}
        selectedLayerId={selectedLayerId}
        isBusy={isBusy}
        onSelect={onSelectLayer}
        onMove={onMoveLayer}
      />
    </aside>
  );
}
