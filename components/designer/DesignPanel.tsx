"use client";

import {
  DESIGN_AREA_HEIGHT,
  DESIGN_AREA_WIDTH,
  ELEMENT_SNAP_MAX,
  ELEMENT_SNAP_MIN,
  EXPORT_DPI,
} from "@/lib/constants";
import type { DesignLayer, PanelTab, TextDesignLayer } from "@/lib/types";
import { LayerPanel } from "./LayerPanel";
import { TextLayerEditor } from "./TextLayerEditor";

export function DesignPanel({
  activeTab,
  layers,
  selectedIds,
  primaryLayer,
  scale,
  rotation,
  primaryLocked,
  selectedText,
  isBusy,
  showGrid,
  gridSnapEnabled,
  elementSnapDistance,
  warnings,
  onScaleChange,
  onRotationChange,
  onReset,
  onDeletePrimary,
  onTextChange,
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
  primaryLayer: DesignLayer | null;
  scale: number;
  rotation: number;
  primaryLocked: boolean;
  selectedText: TextDesignLayer | null;
  isBusy: boolean;
  showGrid: boolean;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  warnings: string[];
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onReset: () => void;
  onDeletePrimary: () => void;
  onTextChange: (patch: Partial<TextDesignLayer>) => void;
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

  const isImageActive = primaryLayer?.type === "image";
  const isTextActive = primaryLayer?.type === "text" && selectedText;
  const controlsDisabled = isBusy || primaryLocked || !primaryLayer;

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-white p-4">
      {activeTab === "help" && (
        <div className="space-y-3 text-sm text-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900">使用說明</h2>
          <p>1. 在「商品」面板選擇款式、上傳圖片或新增文字。</p>
          <p>
            2. 圖片規格：1000×1000 起，推薦 {DESIGN_AREA_WIDTH}×
            {DESIGN_AREA_HEIGHT}，單面最多 10 張。
          </p>
          <p>3. 上傳圖片自動等比例置中，寬度優先 85%~90%，保留 5% 安全邊界。</p>
          <p>4. 文字最多 20 個，可拖曳、縮放、旋轉至印刷區域。</p>
          <p>
            5. 儲存或發送申請時，自動匯出 PNG {DESIGN_AREA_WIDTH}×
            {DESIGN_AREA_HEIGHT} 透明背景 {EXPORT_DPI} DPI。
          </p>
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
        <>
          {(isImageActive || isTextActive) && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                圖層調整
              </h3>
              <div>
                <label className="mb-1 block text-sm text-zinc-900">
                  縮放 ({Math.round(scale * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.2}
                  max={3}
                  step={0.01}
                  value={scale}
                  disabled={controlsDisabled}
                  onChange={(e) => onScaleChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-900">
                  旋轉 ({rotation}°)
                </label>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={rotation}
                  disabled={controlsDisabled}
                  onChange={(e) => onRotationChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={controlsDisabled}
                  onClick={onReset}
                  className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
                >
                  重置
                </button>
                <button
                  type="button"
                  disabled={isBusy || !primaryLayer}
                  onClick={onDeletePrimary}
                  className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
            </div>
          )}

          {isTextActive && selectedText && (
            <div className="border-t border-zinc-100 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-900">
                文字編輯
              </h3>
              <TextLayerEditor
                layer={selectedText}
                isBusy={isBusy}
                locked={primaryLocked}
                onChange={onTextChange}
              />
            </div>
          )}

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

        </>
      )}
    </div>
  );
}
