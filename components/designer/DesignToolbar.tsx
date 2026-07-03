"use client";

import { useEffect, useRef, useState } from "react";
import type { ShapeKind } from "@/lib/types";
import { SHAPE_KIND_OPTIONS } from "@/lib/shape-layer";
import { DesignerTooltip } from "./DesignerTooltip";
import { tb } from "./toolbar-interaction-ui";
import { ds } from "./design-ui";

function shapeIcon(id: ShapeKind): string {
  if (id === "rectangle") return "▭";
  if (id === "circle") return "○";
  if (id === "line") return "─";
  return "→";
}

function AddMenuPanel({
  disabled,
  onClose,
  onUpload,
  onAddText,
  onAddShape,
}: {
  disabled: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeKind) => void;
}) {
  return (
    <div className={`${tb.menuPanel} min-w-[10.5rem] p-1`}>
      <label className={`${tb.menuItem} cursor-pointer`}>
        <span aria-hidden>🖼️</span>
        <span>圖片</span>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file);
              onClose();
            }
            e.target.value = "";
          }}
        />
      </label>
      <label className={`${tb.menuItem} cursor-pointer`}>
        <span aria-hidden>◎</span>
        <span>Logo</span>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file);
              onClose();
            }
            e.target.value = "";
          }}
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        className={tb.menuItem}
        onClick={() => {
          onAddText();
          onClose();
        }}
      >
        <span className="font-serif" aria-hidden>
          T
        </span>
        <span>文字</span>
      </button>
      {SHAPE_KIND_OPTIONS.map((shape) => (
        <button
          key={shape.id}
          type="button"
          disabled={disabled}
          className={tb.menuItem}
          onClick={() => {
            onAddShape(shape.id);
            onClose();
          }}
        >
          <span aria-hidden>{shapeIcon(shape.id)}</span>
          <span>{shape.label}</span>
        </button>
      ))}
    </div>
  );
}

export function DesignToolbar({
  isBusy,
  readOnly = false,
  warnings,
  onUpload,
  onAddText,
  onAddShape,
  embedded = false,
}: {
  isBusy: boolean;
  readOnly?: boolean;
  warnings: string[];
  onUpload: (file: File) => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeKind) => void;
  embedded?: boolean;
  showMore?: boolean;
}) {
  const disabled = isBusy || readOnly;
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fabRef.current && !fabRef.current.contains(target)) {
        setFabOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [fabOpen]);

  const closeMenus = () => setFabOpen(false);

  return (
    <div className={embedded ? "min-w-0 shrink-0" : "min-w-0 flex-1"}>
      <div
        className={`hidden min-w-0 flex-nowrap items-center ${ds.space.gap1} md:flex`}
        role="toolbar"
        aria-label="新增工具"
      >
        <DesignerTooltip content="上傳圖片">
          <label className={`${tb.actionButton} cursor-pointer`}>
            <span aria-hidden>🖼</span>
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
        </DesignerTooltip>
        <DesignerTooltip content="上傳 Logo">
          <label className={`${tb.actionButton} cursor-pointer`}>
            <span aria-hidden>◎</span>
            <span>Logo</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </DesignerTooltip>
        <DesignerTooltip content="新增文字">
          <button
            type="button"
            disabled={disabled}
            className={tb.actionButton}
            onClick={onAddText}
          >
            <span className="font-serif" aria-hidden>
              T
            </span>
            <span>文字</span>
          </button>
        </DesignerTooltip>
        {SHAPE_KIND_OPTIONS.map((shape) => (
          <DesignerTooltip key={shape.id} content={`新增${shape.label}`}>
            <button
              type="button"
              disabled={disabled}
              className={tb.actionButton}
              onClick={() => onAddShape(shape.id)}
              aria-label={`新增${shape.label}`}
            >
              <span aria-hidden>{shapeIcon(shape.id)}</span>
              <span>{shape.label}</span>
            </button>
          </DesignerTooltip>
        ))}
      </div>

      <div ref={fabRef} className="relative shrink-0 md:hidden">
        <DesignerTooltip content="新增">
          <button
            type="button"
            disabled={disabled}
            aria-expanded={fabOpen}
            aria-label="新增設計元素"
            onClick={() => setFabOpen((open) => !open)}
            className={tb.fab}
          >
            +
          </button>
        </DesignerTooltip>
        {fabOpen && (
          <div className={`${tb.menuPanel} mt-2 p-1`}>
            <AddMenuPanel
              disabled={disabled}
              onClose={closeMenus}
              onUpload={onUpload}
              onAddText={onAddText}
              onAddShape={onAddShape}
            />
          </div>
        )}
      </div>

      {warnings.length > 0 && !embedded && (
        <div className={`mt-2 flex flex-wrap ${ds.space.gap2}`}>
          {warnings.map((w) => (
            <p
              key={w}
              className={`rounded bg-amber-50 px-2 py-1 text-amber-800 ${ds.type.helper}`}
            >
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
