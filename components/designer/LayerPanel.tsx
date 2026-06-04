"use client";

import { useState } from "react";
import { sortLayersForPanel } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";

export function LayerPanel({
  layers,
  selectedIds,
  isBusy,
  onSelect,
  onRename,
  onToggleVisible,
  onToggleLocked,
  onMove,
  onDuplicate,
  onDelete,
  onReorderDrag,
}: {
  layers: DesignLayer[];
  selectedIds: string[];
  isBusy: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onMove: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderDrag: (dragId: string, targetId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const panelLayers = sortLayersForPanel(layers);

  const startRename = (layer: DesignLayer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        圖層管理
      </h3>

      {panelLayers.length === 0 ? (
        <p className="text-xs text-zinc-400">尚無圖層，請上傳圖片或新增文字</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {panelLayers.map((layer) => {
            const selected = selectedIds.includes(layer.id);
            const typeLabel = layer.type === "image" ? "Image" : "Text";

            return (
              <li
                key={layer.id}
                draggable={!isBusy && !layer.locked}
                onDragStart={() => setDragId(layer.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId && dragId !== layer.id) {
                    onReorderDrag(dragId, layer.id);
                  }
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                  selected
                    ? "border-blue-400 bg-blue-50"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <button
                  type="button"
                  disabled={isBusy}
                  className="mb-1 w-full text-left"
                  onClick={(e) => onSelect(layer.id, e.shiftKey)}
                >
                  <span className="font-medium text-zinc-900">
                    {layer.name}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500">
                    · {typeLabel}
                  </span>
                </button>

                {editingId === layer.id ? (
                  <input
                    className="mb-2 w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                    value={editName}
                    disabled={isBusy}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    className="mb-2 text-xs text-blue-600 hover:underline"
                    onClick={() => startRename(layer)}
                  >
                    重新命名
                  </button>
                )}

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    title={layer.visible ? "隱藏" : "顯示"}
                    disabled={isBusy}
                    onClick={() => onToggleVisible(layer.id)}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    {layer.visible ? "👁" : "👁‍🗨"}
                  </button>
                  <button
                    type="button"
                    title={layer.locked ? "解鎖" : "鎖定"}
                    disabled={isBusy}
                    onClick={() => onToggleLocked(layer.id)}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    {layer.locked ? "🔒" : "🔓"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onMove(layer.id, "top")}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    頂
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onMove(layer.id, "up")}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onMove(layer.id, "down")}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onMove(layer.id, "bottom")}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    底
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDuplicate(layer.id)}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
                  >
                    複製
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDelete(layer.id)}
                    className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                  >
                    刪除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[10px] text-zinc-400">
        Shift + 點擊可多選 · 拖曳圖層列可調整順序
      </p>
    </div>
  );
}
