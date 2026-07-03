"use client";

import { InspectorNumberInput } from "../InspectorNumberInput";
import { TEXT_FONT_OPTIONS } from "@/lib/text-layer";
import { getTextInspectorValues } from "@/lib/inspector-sync";
import {
  isTextBold,
  toggleTextBold,
  toggleTextItalic,
} from "@/lib/text-style";
import type { TextAlign, TextDesignLayer } from "@/lib/types";
import { PropertyRow } from "./PropertyRow";

const selectClass =
  "w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[10px] text-zinc-900 disabled:bg-zinc-100";

const toggleClass = (active: boolean) =>
  `rounded border px-1.5 py-0.5 text-[10px] font-medium ${
    active
      ? "border-blue-500 bg-blue-50 text-blue-800"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
  } disabled:opacity-50`;

export function TextPropertiesPanel({
  layer,
  disabled,
  onPatch,
}: {
  layer: TextDesignLayer;
  disabled: boolean;
  onPatch: (patch: Partial<TextDesignLayer>) => void;
}) {
  const stroke = layer.stroke;
  const shadow = layer.shadow;
  const strokeEnabled = Boolean(stroke && stroke.width_cm > 0);
  const shadowEnabled = Boolean(shadow);
  const effectiveFontSize_cm = getTextInspectorValues(layer).fontSize_cm;

  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Text Properties
      </p>

      <PropertyRow label="字型">
        <select
          className={selectClass}
          disabled={disabled}
          value={layer.fontFamily}
          onChange={(e) =>
            onPatch({
              fontFamily: e.target.value as TextDesignLayer["fontFamily"],
            })
          }
        >
          {TEXT_FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </PropertyRow>

      <PropertyRow label="大小">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={effectiveFontSize_cm}
          decimals={2}
          ariaLabel="字體大小 cm"
          onCommit={(fontSize_cm) => onPatch({ fontSize_cm, scale: 1 })}
        />
      </PropertyRow>

      <PropertyRow label="樣式">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={disabled}
            className={toggleClass(isTextBold(layer))}
            onClick={() => onPatch(toggleTextBold(layer))}
          >
            B
          </button>
          <button
            type="button"
            disabled={disabled}
            className={toggleClass(layer.fontStyle === "italic")}
            onClick={() => onPatch(toggleTextItalic(layer))}
          >
            I
          </button>
        </div>
      </PropertyRow>

      <PropertyRow label="顏色">
        <input
          type="color"
          disabled={disabled}
          value={layer.color}
          className="h-6 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
          onChange={(e) => onPatch({ color: e.target.value })}
        />
      </PropertyRow>

      <PropertyRow label="透明度">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
          value={layer.opacity}
          className="w-full"
          onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
        />
      </PropertyRow>

      <PropertyRow label="字距">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={layer.letterSpacing_cm ?? 0}
          decimals={2}
          ariaLabel="字距 cm"
          onCommit={(letterSpacing_cm) => onPatch({ letterSpacing_cm })}
        />
      </PropertyRow>

      <PropertyRow label="行距">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={layer.lineHeight ?? 1.3}
          decimals={2}
          ariaLabel="行距"
          onCommit={(lineHeight) => onPatch({ lineHeight })}
        />
      </PropertyRow>

      <PropertyRow label="對齊">
        <div className="flex gap-1">
          {(["left", "center", "right"] as TextAlign[]).map((align) => (
            <button
              key={align}
              type="button"
              disabled={disabled}
              className={toggleClass((layer.textAlign ?? "center") === align)}
              onClick={() => onPatch({ textAlign: align })}
            >
              {align === "left" ? "左" : align === "center" ? "中" : "右"}
            </button>
          ))}
        </div>
      </PropertyRow>

      <PropertyRow label="描邊">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            disabled={disabled}
            checked={strokeEnabled}
            onChange={(e) =>
              onPatch({
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
            className="h-5 w-8 rounded border border-zinc-300"
            onChange={(e) =>
              onPatch({
                stroke: {
                  color: e.target.value,
                  width_cm: stroke?.width_cm || 0.15,
                },
              })
            }
          />
          <InspectorNumberInput
            compact
            disabled={disabled || !strokeEnabled}
            value={stroke?.width_cm ?? 0}
            decimals={2}
            ariaLabel="描邊粗細 cm"
            className="max-w-[3.5rem]"
            onCommit={(width_cm) =>
              onPatch({
                stroke: {
                  color: stroke?.color ?? "#000000",
                  width_cm,
                },
              })
            }
          />
        </div>
      </PropertyRow>

      <PropertyRow label="陰影">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            disabled={disabled}
            checked={shadowEnabled}
            onChange={(e) =>
              onPatch({
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
            value={shadow?.color?.startsWith("#")
              ? shadow.color
              : "#000000"}
            className="h-5 w-8 rounded border border-zinc-300"
            onChange={(e) =>
              onPatch({
                shadow: {
                  color: e.target.value,
                  blur_cm: shadow?.blur_cm ?? 0.4,
                  offsetX_cm: shadow?.offsetX_cm ?? 0.2,
                  offsetY_cm: shadow?.offsetY_cm ?? 0.2,
                },
              })
            }
          />
          <InspectorNumberInput
            compact
            disabled={disabled || !shadowEnabled}
            value={shadow?.blur_cm ?? 0}
            decimals={2}
            ariaLabel="陰影模糊 cm"
            className="max-w-[3.5rem]"
            onCommit={(blur_cm) =>
              onPatch({
                shadow: {
                  color: shadow?.color ?? "rgba(0,0,0,0.35)",
                  blur_cm,
                  offsetX_cm: shadow?.offsetX_cm ?? 0.2,
                  offsetY_cm: shadow?.offsetY_cm ?? 0.2,
                },
              })
            }
          />
        </div>
      </PropertyRow>
    </div>
  );
}
