"use client";

import {
  getAdultTshirtTemplateSrc,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import {
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
  type PrintAreaCmBounds,
} from "@/lib/design-cm";
import {
  DEFAULT_PRINT_MODE,
  getPrintAreaContainerStyle,
  resolvePreviewPrintPositionMode,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import { sortLayersByZIndex } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { LayerPreviewContent } from "./LayerPreviewContent";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";

function StaticDesignLayer({
  layer,
  printArea,
}: {
  layer: DesignLayer;
  printArea: PrintAreaCmBounds;
}) {
  const rect = getLayerEffectiveCmRect(layer);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${(rect.x_cm / printArea.width) * 100}%`,
        top: `${(rect.y_cm / printArea.height) * 100}%`,
        width: `${(rect.width_cm / printArea.width) * 100}%`,
        height: `${(rect.height_cm / printArea.height) * 100}%`,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <LayerPreviewContent layer={layer} printArea={printArea} />
      </div>
    </div>
  );
}

/** 平面衣服設計預覽（無模特；可替換為素材 PNG） */
export function FlatShirtDesignView({
  gender: _gender,
  side,
  shirtColor,
  size = "M",
  layers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  className = "",
  compact = false,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size?: Size;
  layers: DesignLayer[];
  previewPrintPositionMode?: PreviewPrintPositionMode;
  className?: string;
  /** 右側預覽欄：限制在可用高度內 */
  compact?: boolean;
}) {
  const assetSrc = getAdultTshirtTemplateSrc(shirtColor, side);

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const printArea = getPrintAreaCmBounds();
  const printAreaStyle = getPrintAreaContainerStyle(side, {
    mode: resolvePreviewPrintPositionMode(previewPrintPositionMode),
    size,
  });

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${
        compact
          ? "@container flex h-full w-full items-center justify-center"
          : "w-full"
      } ${className}`}
    >
      <ShirtContainerFrame
        width={compact ? undefined : "100%"}
        fitRatio={compact ? 0.95 : undefined}
      >
        <ShirtVisualScale size={size}>
          <ProcessedTemplateImage
            gender={_gender}
            side={side}
            src={assetSrc}
            alt={side === "front" ? "T 恤正面" : "T 恤背面"}
            className="absolute inset-0 z-0 h-full w-full object-contain"
            showPlaceholderGuide={false}
          />
        </ShirtVisualScale>
        <div
          data-print-area
          className="absolute z-10 overflow-hidden [container-type:size]"
          style={printAreaStyle}
        >
          {visibleLayers.map((layer) => (
            <StaticDesignLayer
              key={layer.id}
              layer={layer}
              printArea={printArea}
            />
          ))}
        </div>
      </ShirtContainerFrame>
    </div>
  );
}
