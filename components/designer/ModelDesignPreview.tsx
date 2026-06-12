"use client";

import { getModelTemplateSrc, type ShirtColor } from "@/lib/constants";
import {
  getLayerEffectiveCmRect,
  getDesignerPrintAreaCmBounds,
  type PrintAreaCmBounds,
} from "@/lib/design-cm";
import {
  DEFAULT_PRINT_MODE,
  getUiPrintAreaContainerStyle,
  resolvePreviewPrintPositionMode,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import type { Gender, Side, Size } from "@/lib/constants";
import { sortLayersByZIndex } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { LayerPreviewContent } from "./LayerPreviewContent";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";
import { TemplateImage } from "./TemplateImage";

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

/** 模特上的設計呈現（無設計區框線、格線與控制項） */
export function ModelDesignPreview({
  gender,
  side,
  shirtColor,
  size = "M",
  layers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  zoom = 1,
  fitRatio,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size?: Size;
  layers: DesignLayer[];
  previewPrintPositionMode?: PreviewPrintPositionMode;
  zoom?: number;
  fitRatio?: number;
}) {
  const templateSrc = getModelTemplateSrc(gender, side);
  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const printArea = getDesignerPrintAreaCmBounds(side);
  const printAreaStyle = getUiPrintAreaContainerStyle("model", side, {
    mode: resolvePreviewPrintPositionMode(previewPrintPositionMode),
    size,
  });

  return (
    <ShirtContainerFrame
      className={
        fitRatio != null ? "transition-transform duration-200" : "w-full"
      }
      fitRatio={fitRatio}
      width={fitRatio == null ? "100%" : undefined}
      zoom={zoom}
    >
      <ShirtVisualScale size={size}>
        <TemplateImage
          gender={gender}
          side={side}
          src={templateSrc}
          alt={side === "front" ? "正面模特呈現" : "背面模特呈現"}
          className="absolute inset-0 z-0 h-full w-full object-contain"
          showPlaceholderGuide={false}
        />
      </ShirtVisualScale>
      <div
        data-print-area
        className="absolute overflow-hidden [container-type:size]"
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
  );
}
