"use client";

import {
  ACCEPTED_EXTENSIONS,
  ELEMENT_SNAP_MAX,
  ELEMENT_SNAP_MIN,
} from "@/lib/constants";
import { TEXT_FONT_OPTIONS } from "@/lib/text-layer";
import type {
  DesignLayer,
  TextDesignLayer,
  TextFontFamily,
} from "@/lib/types";
import { LayerPanel } from "./LayerPanel";

export function ToolsSidebar({
  layers,
  selectedIds,
  primaryLayer,
  scale,
  rotation,
  primaryLocked,
  hasDesign,
  selectedText,
  warnings,
  statusMessage,
  isBusy,
  onUpload,
  onAddText,
  onScaleChange,
  onRotationChange,
  onReset,
  onDeletePrimary,
  onTextChange,
  showGrid,
  gridSnapEnabled,
  onShowGridChange,
  onGridSnapChange,
  elementSnapDistance,
  onElementSnapDistanceChange,
  onSelectLayer,
  onRenameLayer,
  onToggleVisible,
  onToggleLocked,
  onMoveLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onReorderDrag,
  onSave,
  onSubmit,
}: {
  layers: DesignLayer[];
  selectedIds: string[];
  primaryLayer: DesignLayer | null;
  scale: number;
  rotation: number;
  primaryLocked: boolean;
  hasDesign: boolean;
  selectedText: TextDesignLayer | null;
  warnings: string[];
  statusMessage: string | null;
  isBusy: boolean;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onReset: () => void;
  onDeletePrimary: () => void;
  onTextChange: (patch: Partial<TextDesignLayer>) => void;
  showGrid: boolean;
  gridSnapEnabled: boolean;
  onShowGridChange: (value: boolean) => void;
  onGridSnapChange: (value: boolean) => void;
  elementSnapDistance: number;
  onElementSnapDistanceChange: (value: number) => void;
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onMoveLayer: (
    id: string,
    action: "top" | "up" | "down" | "bottom",
  ) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderDrag: (dragId: string, targetId: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const isImageActive = primaryLayer?.type === "image";
  const isTextActive = primaryLayer?.type === "text" && selectedText;
  const controlsDisabled = isBusy || primaryLocked || !primaryLayer;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-zinc-200 bg-white p-4">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          設計工具
        </h2>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100">
          <span className="font-medium text-zinc-900">圖片上傳</span>
          <span className="mt-1 text-xs">PNG / JPG / JPEG / WEBP · 最大 10MB</span>
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            disabled={isBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={isBusy}
        onClick={onAddText}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
      >
        新增文字
      </button>

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

      <div className="space-y-2 border-t border-zinc-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          格線與吸附
        </h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={showGrid}
            disabled={isBusy}
            onChange={(e) => onShowGridChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          顯示格線
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={gridSnapEnabled}
            disabled={isBusy}
            onChange={(e) => onGridSnapChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          格線吸附
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            元素吸附距離 ({elementSnapDistance}px)
          </label>
          <input
            type="range"
            min={ELEMENT_SNAP_MIN}
            max={ELEMENT_SNAP_MAX}
            step={1}
            value={elementSnapDistance}
            disabled={isBusy}
            onChange={(e) =>
              onElementSnapDistanceChange(Number(e.target.value))
            }
            className="w-full"
          />
        </div>
      </div>

      {primaryLocked && primaryLayer && (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          圖層已鎖定，無法拖曳、縮放或旋轉
        </p>
      )}

      {(isImageActive || isTextActive) && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
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
            <label className="mb-1 block text-sm font-medium text-zinc-700">
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
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={onReset}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
          >
            重置位置
          </button>
          <button
            type="button"
            disabled={isBusy || !primaryLayer}
            onClick={onDeletePrimary}
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            刪除圖層
          </button>
        </>
      )}

      {isTextActive && selectedText && (
        <div className="space-y-4 border-t border-zinc-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            文字編輯
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              文字內容
            </label>
            <input
              type="text"
              value={selectedText.text}
              disabled={isBusy || primaryLocked}
              onChange={(e) => onTextChange({ text: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              字體
            </label>
            <select
              value={selectedText.fontFamily}
              disabled={isBusy || primaryLocked}
              onChange={(e) =>
                onTextChange({
                  fontFamily: e.target.value as TextFontFamily,
                })
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {TEXT_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              字體大小 ({selectedText.fontSize}px)
            </label>
            <input
              type="range"
              min={12}
              max={120}
              step={1}
              value={selectedText.fontSize}
              disabled={isBusy || primaryLocked}
              onChange={(e) =>
                onTextChange({ fontSize: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              字體顏色
            </label>
            <input
              type="color"
              value={selectedText.color}
              disabled={isBusy || primaryLocked}
              onChange={(e) => onTextChange({ color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded border border-zinc-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              字體粗細
            </label>
            <select
              value={selectedText.fontWeight}
              disabled={isBusy || primaryLocked}
              onChange={(e) =>
                onTextChange({ fontWeight: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value={400}>一般 (400)</option>
              <option value={500}>中等 (500)</option>
              <option value={600}>半粗 (600)</option>
              <option value={700}>粗體 (700)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              透明度 ({Math.round(selectedText.opacity * 100)}%)
            </label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={selectedText.opacity}
              disabled={isBusy || primaryLocked}
              onChange={(e) =>
                onTextChange({ opacity: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-zinc-100 pt-4">
        <button
          type="button"
          disabled={isBusy || !hasDesign}
          onClick={onSave}
          className="rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          儲存設計
        </button>
        <button
          type="button"
          disabled={isBusy || !hasDesign}
          onClick={onSubmit}
          className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          送出設計
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <p
              key={w}
              className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              {w}
            </p>
          ))}
        </div>
      )}

      {statusMessage && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {statusMessage}
        </p>
      )}
    </aside>
  );
}
