"use client";

import { useMemo, useState } from "react";
import { sortLayersForPanel } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { getLayerDisplayLabel } from "./layer-display-ui";
import { LayerInspectorCard } from "./LayerInspectorCard";
import { useLiveDesignState } from "./LiveDesignStateContext";
import { ds } from "./design-ui";

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
  const { designState, getReport } = useLiveDesignState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const panelLayers = sortLayersForPanel(layers);

  const warningCount = useMemo(
    () =>
      designState.elements.filter((element) => element.status === "warning")
        .length,
    [designState.elements],
  );

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <div className="space-y-1">
        <h3 className={ds.type.cardTitle}>圖層</h3>
        {warningCount > 0 && (
          <p
            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900"
            role="status"
          >
            {warningCount} 個圖層需要注意
          </p>
        )}
      </div>

      {panelLayers.length === 0 ? (
        <p className={ds.type.helper}>尚無圖層，請上傳圖片或新增文字</p>
      ) : (
        <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
          {panelLayers.map((layer) => {
            const report = getReport(layer.id);
            if (!report) return null;
            const displayLabel = getLayerDisplayLabel(layer);

            return (
              <LayerInspectorCard
                key={layer.id}
                layer={layer}
                report={report}
                selected={selectedIds.includes(layer.id)}
                displayLabel={displayLabel}
                visible={layer.visible}
                locked={layer.locked}
                editingName={editingId === layer.id}
                editName={editName}
                isBusy={isBusy}
                draggable={!isBusy && !layer.locked}
                isDragging={dragId === layer.id}
                isDropTarget={dropTargetId === layer.id && dragId !== layer.id}
                onSelect={(shiftKey) => onSelect(layer.id, shiftKey)}
                onStartRename={() => {
                  setEditingId(layer.id);
                  setEditName(layer.name);
                }}
                onEditNameChange={setEditName}
                onCommitRename={commitRename}
                onCancelRename={() => setEditingId(null)}
                onToggleVisible={() => onToggleVisible(layer.id)}
                onToggleLocked={() => onToggleLocked(layer.id)}
                onMove={(action) => onMove(layer.id, action)}
                onDuplicate={() => onDuplicate(layer.id)}
                onDelete={() => onDelete(layer.id)}
                onDragStart={() => setDragId(layer.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== layer.id) {
                    setDropTargetId(layer.id);
                  }
                }}
                onDrop={() => {
                  if (dragId && dragId !== layer.id) {
                    onReorderDrag(dragId, layer.id);
                  }
                  setDragId(null);
                  setDropTargetId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTargetId(null);
                }}
              />
            );
          })}
        </ul>
      )}
      <p className={ds.type.helper}>
        選取物件後，可使用上方工具列快速修改。
      </p>
    </div>
  );
}
