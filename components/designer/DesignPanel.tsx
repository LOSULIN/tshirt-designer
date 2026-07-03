"use client";

import { ELEMENT_SNAP_MAX, ELEMENT_SNAP_MIN } from "@/lib/constants";
import type { PreviewPrintPositionMode } from "@/lib/printArea";
import type { DesignLayer, PanelTab } from "@/lib/types";
import { ds } from "./design-ui";
import { LayerPanel } from "./LayerPanel";

export function DesignPanel({
  activeTab,
  layers,
  selectedIds,
  isBusy,
  showGrid,
  debugPrintArea,
  gridSnapEnabled,
  largePrintModeEnabled,
  elementSnapDistance,
  onShowGridChange,
  onDebugPrintAreaChange,
  previewPrintPositionMode,
  onPreviewPrintPositionModeChange,
  onGridSnapChange,
  onLargePrintModeChange,
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
  debugPrintArea: boolean;
  gridSnapEnabled: boolean;
  largePrintModeEnabled: boolean;
  elementSnapDistance: number;
  onShowGridChange: (value: boolean) => void;
  onDebugPrintAreaChange: (value: boolean) => void;
  previewPrintPositionMode: PreviewPrintPositionMode;
  onPreviewPrintPositionModeChange: (value: PreviewPrintPositionMode) => void;
  onGridSnapChange: (value: boolean) => void;
  onLargePrintModeChange: (value: boolean) => void;
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
    <div
      data-layout-rail="design"
      className={`flex shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-white p-4 ${ds.layout.designRail}`}
    >
      {activeTab === "help" && (
        <div className="space-y-3 text-sm text-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900">使用說明</h2>
          <p>1. 在「商品」面板選擇顏色與材質；右側 Garment Info 可切換尺碼。</p>
          <p>2. 中央畫布可上傳圖片或新增文字，右側 T-shirt Preview 可平面瀏覽。</p>
          <p>3. 點選畫布元素可拖曳移動；四角拖曳可縮放；上方把手可旋轉。</p>
          <p>4. 雙擊文字可於畫布上直接編輯，Enter 確認。</p>
          <p>5. 右側 Garment Info 顯示成衣尺寸、印刷區與尺寸建議。</p>
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
              checked={debugPrintArea}
              disabled={isBusy}
              onChange={(e) => onDebugPrintAreaChange(e.target.checked)}
            />
            Debug Print Area
          </label>
          {debugPrintArea && (
            <p className="text-[10px] leading-relaxed text-zinc-500">
              橘線＝Preview 錨點 · 紫線＝Mockup 模特錨點 · 詳情見 DevTools
              console。可加 <code className="text-zinc-700">?debugPrintArea=1</code>
            </p>
          )}
          <fieldset className="space-y-1.5 rounded-md border border-zinc-200 px-2.5 py-2">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              預覽框線定位
            </legend>
            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="radio"
                name="previewPrintPositionMode"
                checked={previewPrintPositionMode === "canvas"}
                disabled={isBusy}
                onChange={() => onPreviewPrintPositionModeChange("canvas")}
              />
              Canvas（固定 ref.y，預設）
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="radio"
                name="previewPrintPositionMode"
                checked={previewPrintPositionMode === "garment"}
                disabled={isBusy}
                onChange={() => onPreviewPrintPositionModeChange("garment")}
              />
              Garment（領口下 8cm · 隨尺碼 scale）
            </label>
            <p className="text-[10px] leading-relaxed text-zinc-500">
              預設 garment。canvas fallback：{" "}
              <code className="text-zinc-700">?printPositionMode=canvas</code>
            </p>
          </fieldset>
          <a
            href="/mockup-calibration"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-violet-200 bg-violet-50 px-2.5 py-2 text-[11px] font-medium text-violet-900 hover:bg-violet-100"
          >
            Mockup Calibration Mode →
          </a>
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={gridSnapEnabled}
              disabled={isBusy}
              onChange={(e) => onGridSnapChange(e.target.checked)}
            />
            格線吸附
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={largePrintModeEnabled}
              disabled={isBusy}
              onChange={(e) => onLargePrintModeChange(e.target.checked)}
            />
            大圖印刷模式（最大 A3）
          </label>
          <p className="text-[10px] leading-relaxed text-zinc-500">
            預設點陣圖最大 21×29.7 cm（A4）；啟用後可達 29.7×42 cm（A3），超過 A3
            禁止放大。
          </p>
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
