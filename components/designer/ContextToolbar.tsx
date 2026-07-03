"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TEXT_FONT_OPTIONS } from "@/lib/text-layer";
import { getTextInspectorValues } from "@/lib/inspector-sync";
import { isTextBold, toggleTextBold } from "@/lib/text-style";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";
import { tb } from "./toolbar-interaction-ui";
import { ds } from "./design-ui";

function ToolbarMoreMenu({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        className={tb.ghostButton}
        onClick={() => setOpen((value) => !value)}
      >
        <span>更多</span>
        <span className="text-xs text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={`${tb.menuPanel} w-56 space-y-2`}>{children}</div>
      )}
    </div>
  );
}

function MoreField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 px-0.5">
      <span className={ds.type.helper}>{label}</span>
      {children}
    </label>
  );
}

export function ContextToolbar({
  layer,
  disabled,
  onTextPatch,
  onImagePatch,
  onShapePatch,
  onDelete,
  onReplaceImage,
}: {
  layer: DesignLayer;
  disabled: boolean;
  onTextPatch: (patch: Partial<TextDesignLayer>) => void;
  onImagePatch: (patch: Partial<ImageDesignLayer>) => void;
  onShapePatch: (patch: Partial<ShapeDesignLayer>) => void;
  onDelete: () => void;
  onReplaceImage: (file: File) => void;
}) {
  if (layer.type === "text") {
    const effectiveFontSize_cm = getTextInspectorValues(layer).fontSize_cm;
    const stroke = layer.stroke;
    const shadow = layer.shadow;
    const strokeEnabled = Boolean(stroke && stroke.width_cm > 0);
    const shadowEnabled = Boolean(shadow);

    return (
      <div className={tb.toolbarRow} role="toolbar" aria-label="文字工具">
        <input
          type="text"
          disabled={disabled}
          value={layer.text}
          onChange={(e) => onTextPatch({ text: e.target.value })}
          className={`min-w-[6rem] max-w-[10rem] flex-1 ${tb.field}`}
          aria-label="內容"
          placeholder="輸入文字"
        />
        <select
          disabled={disabled}
          value={layer.fontFamily}
          onChange={(e) =>
            onTextPatch({
              fontFamily: e.target.value as TextDesignLayer["fontFamily"],
            })
          }
          className={`max-w-[7rem] shrink-0 ${tb.field}`}
          aria-label="字型"
        >
          {TEXT_FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          disabled={disabled}
          value={Number(effectiveFontSize_cm.toFixed(2))}
          step={0.1}
          min={0.1}
          onChange={(e) =>
            onTextPatch({
              fontSize_cm: Math.max(0.1, Number(e.target.value)),
              scale: 1,
            })
          }
          className={`w-16 shrink-0 ${tb.field}`}
          aria-label="大小 cm"
        />
        <input
          type="color"
          disabled={disabled}
          value={layer.color}
          className={tb.colorInput}
          onChange={(e) => onTextPatch({ color: e.target.value })}
          aria-label="顏色"
        />
        <button
          type="button"
          disabled={disabled}
          className={tb.toggleButton(isTextBold(layer))}
          onClick={() => onTextPatch(toggleTextBold(layer))}
          aria-label="粗體"
        >
          B
        </button>
        <ToolbarMoreMenu disabled={disabled}>
          <MoreField label="透明度">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={disabled}
              value={layer.opacity}
              className="w-full"
              onChange={(e) => onTextPatch({ opacity: Number(e.target.value) })}
            />
          </MoreField>
          <MoreField label="字距 (cm)">
            <input
              type="number"
              disabled={disabled}
              value={Number((layer.letterSpacing_cm ?? 0).toFixed(2))}
              step={0.05}
              className={tb.field}
              onChange={(e) =>
                onTextPatch({ letterSpacing_cm: Number(e.target.value) })
              }
            />
          </MoreField>
          <MoreField label="行高">
            <input
              type="number"
              disabled={disabled}
              value={Number((layer.lineHeight ?? 1.3).toFixed(2))}
              step={0.05}
              min={0.5}
              className={tb.field}
              onChange={(e) => onTextPatch({ lineHeight: Number(e.target.value) })}
            />
          </MoreField>
          <MoreField label="Outline">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={disabled}
                checked={strokeEnabled}
                onChange={(e) =>
                  onTextPatch({
                    stroke: e.target.checked
                      ? {
                          color: stroke?.color ?? "#000000",
                          width_cm: stroke?.width_cm || 0.15,
                        }
                      : null,
                  })
                }
              />
              <input
                type="color"
                disabled={disabled || !strokeEnabled}
                value={stroke?.color ?? "#000000"}
                className="h-8 w-8 rounded border border-zinc-200"
                onChange={(e) =>
                  onTextPatch({
                    stroke: {
                      color: e.target.value,
                      width_cm: stroke?.width_cm || 0.15,
                    },
                  })
                }
              />
            </div>
          </MoreField>
          <MoreField label="Shadow">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={disabled}
                checked={shadowEnabled}
                onChange={(e) =>
                  onTextPatch({
                    shadow: e.target.checked
                      ? {
                          color: shadow?.color ?? "rgba(0,0,0,0.35)",
                          blur_cm: shadow?.blur_cm ?? 0.4,
                          offsetX_cm: shadow?.offsetX_cm ?? 0.2,
                          offsetY_cm: shadow?.offsetY_cm ?? 0.2,
                        }
                      : null,
                  })
                }
              />
              <input
                type="color"
                disabled={disabled || !shadowEnabled}
                value={
                  shadow?.color?.startsWith("#") ? shadow.color : "#000000"
                }
                className="h-8 w-8 rounded border border-zinc-200"
                onChange={(e) =>
                  onTextPatch({
                    shadow: {
                      color: e.target.value,
                      blur_cm: shadow?.blur_cm ?? 0.4,
                      offsetX_cm: shadow?.offsetX_cm ?? 0.2,
                      offsetY_cm: shadow?.offsetY_cm ?? 0.2,
                    },
                  })
                }
              />
            </div>
          </MoreField>
          <button
            type="button"
            disabled={disabled}
            className={`${tb.menuItem} text-red-600`}
            onClick={onDelete}
          >
            刪除文字
          </button>
        </ToolbarMoreMenu>
      </div>
    );
  }

  if (layer.type === "image") {
    return (
      <div className={tb.toolbarRow} role="toolbar" aria-label="圖片工具">
        <label className={`${tb.actionButton} cursor-pointer`}>
          <span>替換</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplaceImage(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled
          title="Coming Soon"
          className={`${tb.actionButton} cursor-default opacity-60`}
          aria-label="裁切（即將推出）"
        >
          裁切
          <span className={`${ds.type.helper} text-zinc-400`}>Soon</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={tb.dangerButton}
          onClick={onDelete}
          aria-label="刪除圖片"
        >
          刪除
        </button>
        <ToolbarMoreMenu disabled={disabled}>
          <MoreField label="旋轉 (°)">
            <input
              type="number"
              disabled={disabled}
              value={Math.round(layer.rotation)}
              step={1}
              className={tb.field}
              onChange={(e) => onImagePatch({ rotation: Number(e.target.value) })}
            />
          </MoreField>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              disabled={disabled}
              className={tb.menuItem}
              onClick={() =>
                onImagePatch({ rotation: (360 - layer.rotation) % 360 })
              }
            >
              ↔ 水平翻轉
            </button>
            <button
              type="button"
              disabled={disabled}
              className={tb.menuItem}
              onClick={() =>
                onImagePatch({
                  rotation: (180 - layer.rotation + 360) % 360,
                })
              }
            >
              ↕ 垂直翻轉
            </button>
          </div>
        </ToolbarMoreMenu>
      </div>
    );
  }

  const showFill =
    layer.shapeKind === "rectangle" || layer.shapeKind === "circle";

  return (
    <div className={tb.toolbarRow} role="toolbar" aria-label="圖形工具">
      {showFill && (
        <label className={tb.colorField}>
          <span className={ds.type.helper}>填色</span>
          <input
            type="color"
            disabled={disabled}
            value={layer.fill.startsWith("#") ? layer.fill : "#3b82f6"}
            className="h-7 w-7 cursor-pointer rounded border border-zinc-200"
            onChange={(e) => onShapePatch({ fill: e.target.value })}
          />
        </label>
      )}
      <label className={tb.colorField}>
        <span className={ds.type.helper}>描邊</span>
        <input
          type="color"
          disabled={disabled}
          value={layer.stroke.startsWith("#") ? layer.stroke : "#1e3a8a"}
          className="h-7 w-7 cursor-pointer rounded border border-zinc-200"
          onChange={(e) => onShapePatch({ stroke: e.target.value })}
        />
        <input
          type="number"
          disabled={disabled}
          value={Number(layer.strokeWidth_cm.toFixed(2))}
          step={0.05}
          min={0}
          onChange={(e) =>
            onShapePatch({
              strokeWidth_cm: Math.max(0, Number(e.target.value)),
            })
          }
          className={`w-14 ${tb.field}`}
          aria-label="描邊寬度"
        />
      </label>
      <ToolbarMoreMenu disabled={disabled}>
        <MoreField label="透明度">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={disabled}
            value={layer.opacity}
            className="w-full"
            onChange={(e) => onShapePatch({ opacity: Number(e.target.value) })}
          />
        </MoreField>
        <MoreField label="旋轉 (°)">
          <input
            type="number"
            disabled={disabled}
            value={Math.round(layer.rotation)}
            step={1}
            className={tb.field}
            onChange={(e) => onShapePatch({ rotation: Number(e.target.value) })}
          />
        </MoreField>
        <button
          type="button"
          disabled={disabled}
          className={`${tb.menuItem} text-red-600`}
          onClick={onDelete}
        >
          刪除圖形
        </button>
      </ToolbarMoreMenu>
    </div>
  );
}
