"use client";

import { SHAPE_KIND_OPTIONS } from "@/lib/shape-layer";
import { InspectorNumberInput } from "../InspectorNumberInput";
import type { ShapeDesignLayer } from "@/lib/types";
import { PropertyRow } from "./PropertyRow";

export function ShapePropertiesPanel({
  layer,
  disabled,
  onPatch,
}: {
  layer: ShapeDesignLayer;
  disabled: boolean;
  onPatch: (patch: Partial<ShapeDesignLayer>) => void;
}) {
  const kindLabel =
    SHAPE_KIND_OPTIONS.find((o) => o.id === layer.shapeKind)?.label ??
    layer.shapeKind;
  const showFill =
    layer.shapeKind === "rectangle" || layer.shapeKind === "circle";

  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Shape Properties
      </p>

      <PropertyRow label="類型">
        <span className="text-[10px] text-zinc-700">{kindLabel}</span>
      </PropertyRow>

      {showFill && (
        <PropertyRow label="填色">
          <input
            type="color"
            disabled={disabled}
            value={
              layer.fill.startsWith("#") ? layer.fill : "#3b82f6"
            }
            className="h-6 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
            onChange={(e) => onPatch({ fill: e.target.value })}
          />
        </PropertyRow>
      )}

      <PropertyRow label="描邊">
        <input
          type="color"
          disabled={disabled}
          value={layer.stroke.startsWith("#") ? layer.stroke : "#1e3a8a"}
          className="h-6 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
          onChange={(e) => onPatch({ stroke: e.target.value })}
        />
      </PropertyRow>

      <PropertyRow label="線寬">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={layer.strokeWidth_cm}
          decimals={2}
          ariaLabel="描邊寬度 cm"
          onCommit={(strokeWidth_cm) =>
            onPatch({ strokeWidth_cm: Math.max(0, strokeWidth_cm) })
          }
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

      <PropertyRow label="旋轉">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={layer.rotation}
          decimals={0}
          ariaLabel="旋轉角度"
          onCommit={(rotation) => onPatch({ rotation })}
        />
      </PropertyRow>
    </div>
  );
}
