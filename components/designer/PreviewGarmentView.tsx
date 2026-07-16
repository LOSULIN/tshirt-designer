"use client";

import { memo } from "react";
import {
  DEFAULT_PRINT_MODE,
  resolvePreviewPrintPositionMode,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import {
  getPreviewArtworkStageStyle,
  getPreviewPrintableBoundaryStyle,
} from "@/lib/preview-runtime";
import { sortLayersByZIndex } from "@/lib/layers";
import type { Side } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import type { ReactNode } from "react";
import { DesignerGarmentPresentation } from "./DesignerGarmentPresentation";
import { PreviewDesignLayer } from "./PreviewDesignLayer";
import { PreviewGarmentVisual } from "./PreviewGarmentVisual";
import { ShirtContainerFrame } from "./ShirtContainerFrame";

/**
 * Shared Preview Runtime shell — Flat / Model / Zoom / Product previews.
 * Artwork: fixed M-reference stage + physical cm. Printable boundary: overflow only.
 */
export const PreviewGarmentView = memo(function PreviewGarmentView({
  side,
  size,
  layers,
  previewLayers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  zoom = 1,
  fitRatio,
  width,
  className = "",
  shirtVisual,
}: {
  side: Side;
  size: string;
  layers?: DesignLayer[];
  previewLayers?: DesignLayer[];
  previewPrintPositionMode?: PreviewPrintPositionMode;
  zoom?: number;
  fitRatio?: number;
  width?: string;
  className?: string;
  shirtVisual: ReactNode;
}) {
  const renderLayers = previewLayers ?? layers ?? [];
  const mode = resolvePreviewPrintPositionMode(previewPrintPositionMode);
  const visibleLayers = sortLayersByZIndex(renderLayers).filter((l) => l.visible);
  const artworkStageStyle = getPreviewArtworkStageStyle(side, { mode });
  const printableBoundaryStyle = getPreviewPrintableBoundaryStyle(side, size, {
    mode,
  });
  return (
    <ShirtContainerFrame
      className={className}
      fitRatio={fitRatio}
      width={width}
      zoom={zoom}
    >
      <DesignerGarmentPresentation side={side}>
        <PreviewGarmentVisual>{shirtVisual}</PreviewGarmentVisual>
      </DesignerGarmentPresentation>
      <div
        data-preview-printable-boundary
        className="pointer-events-none absolute z-[5] overflow-hidden opacity-0"
        style={printableBoundaryStyle}
        aria-hidden
      />
      <div
        data-preview-artwork-stage
        data-preview-runtime
        className="absolute z-10 overflow-visible [container-type:size]"
        style={artworkStageStyle}
      >
        {visibleLayers.map((layer) => (
          <PreviewDesignLayer
            key={layer.id}
            layer={layer}
            side={side}
            size={size}
          />
        ))}
      </div>
    </ShirtContainerFrame>
  );
}, arePreviewGarmentViewPropsEqual);

function arePreviewGarmentViewPropsEqual(
  prev: Readonly<{
    side: Side;
    size: string;
    layers?: DesignLayer[];
    previewLayers?: DesignLayer[];
    previewPrintPositionMode?: PreviewPrintPositionMode;
    zoom?: number;
    fitRatio?: number;
    width?: string;
    className?: string;
    shirtVisual: ReactNode;
  }>,
  next: Readonly<{
    side: Side;
    size: string;
    layers?: DesignLayer[];
    previewLayers?: DesignLayer[];
    previewPrintPositionMode?: PreviewPrintPositionMode;
    zoom?: number;
    fitRatio?: number;
    width?: string;
    className?: string;
    shirtVisual: ReactNode;
  }>,
): boolean {
  const prevLayers = prev.previewLayers ?? prev.layers ?? [];
  const nextLayers = next.previewLayers ?? next.layers ?? [];
  return (
    prevLayers === nextLayers &&
    prev.side === next.side &&
    prev.size === next.size &&
    prev.previewPrintPositionMode === next.previewPrintPositionMode &&
    prev.zoom === next.zoom &&
    prev.fitRatio === next.fitRatio &&
    prev.width === next.width &&
    prev.className === next.className &&
    prev.shirtVisual === next.shirtVisual
  );
}
