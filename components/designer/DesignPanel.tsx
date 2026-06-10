"use client";

import { ELEMENT_SNAP_MAX, ELEMENT_SNAP_MIN } from "@/lib/constants";
import type { DesignLayer, PanelTab } from "@/lib/types";
import { LayerPanel } from "./LayerPanel";

export function DesignPanel({
  activeTab,
  layers,
  selectedIds,
  isBusy,
  showGrid,
  gridSnapEnabled,
  elementSnapDistance,
  onShowGridChange,
  onGridSnapChange,
  onElementSnapDistanceChange,
  onSelectLayer,
  onRenameLayer,
  onToggleVisible,
  onToggleLocked,
  onMoveLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onReorderDrag,
}: {
  activeTab: PanelTab;
  layers: DesignLayer[];
  selectedIds: string[];
  isBusy: boolean;
  showGrid: boolean;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  onShowGridChange: (value: boolean) => void;
  onGridSnapChange: (value: boolean) => void;
  onElementSnapDistanceChange: (value: number) => void;
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderDrag: (dragId: string, targetId: string) => void;
}) {
  if (activeTab === "product" || activeTab === "model") {
    return null;
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-white p-4">
      {activeTab === "help" && (
        <div className="space-y-3 text-sm text-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900">使用說明</h2>
          <p>1. 在「商品」面板選擇款式、上傳圖片或新增文字。</p>
          <p>2. 點選畫布元素可拖曳移動；四角拖曳可縮放；上方把手可旋轉。</p>
          <p>3. 雙擊文字可於畫布上直接編輯，Enter 確認。</p>
          <p>4. 選取元素後按 Delete 或 Backspace 可刪除。</p>
          <p>5. 右側 Info Panel 即時顯示 cm 數據。</p>
        </div>
      )}

      {activeTab === "layers" && (
        <LayerPanel
          layers={layers}
          selectedIds={selectedIds}
          isBusy={isBusy}
          onSelect={onSelectLayer}
          onRename={onRenameLayer}
          onToggleVisible={onToggleVisible}
          onToggleLocked={onToggleLocked}
          onMove={onMoveLayer}
          onDuplicate={onDuplicateLayer}
          onDelete={onDeleteLayer}
          onReorderDrag={onReorderDrag}
        />
      )}

      {activeTab === "layers" && (
        <div className="space-y-2 border-t border-zinc-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
            格線與吸附
          </h3>
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={showGrid}
              disabled={isBusy}
              onChange={(e) => onShowGridChange(e.target.checked)}
            />
            顯示格線
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={gridSnapEnabled}
              disabled={isBusy}
              onChange={(e) => onGridSnapChange(e.target.checked)}
            />
            格線吸附
          </label>
          <input
            type="range"
            min={ELEMENT_SNAP_MIN}
            max={ELEMENT_SNAP_MAX}
            value={elementSnapDistance}
            disabled={isBusy}
            onChange={(e) =>
              onElementSnapDistanceChange(Number(e.target.value))
            }
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
