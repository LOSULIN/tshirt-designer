"use client";

import {
  getAdultTshirtTemplateSrc,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import {
  DEFAULT_PRINT_MODE,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import type { DesignLayer } from "@/lib/types";
import { PreviewGarmentView } from "./PreviewGarmentView";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";

/** 平面衣服設計預覽（無模特；Preview Runtime 獨立於 Designer） */
export function FlatShirtDesignView({
  gender: _gender,
  side,
  shirtColor,
  size = "M",
  layers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  className = "",
  compact = false,
  zoom = 1,
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
  /** Camera zoom on rendered garment (not coordinate zoom). */
  zoom?: number;
}) {
  const assetSrc = getAdultTshirtTemplateSrc(shirtColor, side);

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${
        compact
          ? "@container flex h-full w-full items-center justify-center"
          : "w-full"
      } ${className}`}
    >
      <PreviewGarmentView
        side={side}
        size={size}
        layers={layers}
        previewPrintPositionMode={previewPrintPositionMode}
        zoom={zoom}
        fitRatio={compact ? 0.95 : undefined}
        width={compact ? undefined : "100%"}
        shirtVisual={
          <ProcessedTemplateImage
            gender={_gender}
            side={side}
            src={assetSrc}
            alt={side === "front" ? "T 恤正面" : "T 恤背面"}
            className="absolute inset-0 z-0 h-full w-full object-contain"
            showPlaceholderGuide={false}
          />
        }
      />
    </div>
  );
}
