"use client";

import { ImagePrintQualityPanel } from "../ImagePrintQualityPanel";
import { InspectorNumberInput } from "../InspectorNumberInput";
import type { Side } from "@/lib/constants";
import type { ImageDesignLayer } from "@/lib/types";
import { PropertyRow } from "./PropertyRow";

export function ImagePropertiesPanel({
  layer,
  side = "front",
  size = "M",
  disabled,
  largePrintModeEnabled,
  onPatch,
}: {
  layer: ImageDesignLayer;
  side?: Side;
  size?: string;
  disabled: boolean;
  largePrintModeEnabled: boolean;
  onPatch: (patch: Partial<ImageDesignLayer>) => void;
}) {
  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Image Properties
      </p>

      <PropertyRow label="檔名">
        <span className="truncate text-[10px] text-zinc-700">
          {layer.image.fileName}
        </span>
      </PropertyRow>

      <PropertyRow label="縮放">
        <InspectorNumberInput
          compact
          disabled={disabled}
          value={layer.scale}
          decimals={2}
          ariaLabel="圖片縮放"
          onCommit={(scale) => onPatch({ scale: Math.max(0.05, scale) })}
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

      <ImagePrintQualityPanel
        layer={layer}
        side={side}
        size={size}
        largePrintMode={largePrintModeEnabled}
      />
    </div>
  );
}
