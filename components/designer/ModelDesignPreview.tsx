"use client";

import { getModelTemplateSrc, type ShirtColor } from "@/lib/constants";
import {
  DEFAULT_PRINT_MODE,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import type { Gender, Side, Size } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import { PreviewGarmentView } from "./PreviewGarmentView";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";

/** 模特上的設計呈現（Preview Runtime；無設計區框線、格線與控制項） */
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

  return (
    <PreviewGarmentView
      side={side}
      size={size}
      layers={layers}
      previewPrintPositionMode={previewPrintPositionMode}
      zoom={zoom}
      fitRatio={fitRatio}
      width={fitRatio == null ? "100%" : undefined}
      className={
        fitRatio != null ? "transition-transform duration-200" : "w-full"
      }
      shirtVisual={
        <ProcessedTemplateImage
          gender={gender}
          side={side}
          src={templateSrc}
          alt={side === "front" ? "正面模特呈現" : "背面模特呈現"}
          className="absolute inset-0 z-0 h-full w-full object-contain"
          showPlaceholderGuide={false}
        />
      }
    />
  );
}
