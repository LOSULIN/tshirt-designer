"use client";

import { useMemo } from "react";
import type { Side, Size } from "@/lib/constants";
import { sortLayersByZIndex } from "@/lib/layers";
import {
  designerProjectionPhotoFrameStyle,
  designerProjectionPhotoHeroStyle,
  photoBridgeRectToStageStyle,
  photoGarmentImageStyle,
} from "@/lib/presentation/product-photo-bridge-css";
import {
  hasRuntimeVisualCompensation,
  resolveRuntimeVisualCompensation,
  runtimeVisualCompensationLayerStyle,
} from "@/lib/presentation/visual-compensation";
import { resolveGeometryRuntimePhotoBridge } from "@/lib/designer-geometry-v2/geometry-runtime-photo-bridge";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import type { ResultPanelDisplayLayer } from "@/lib/result-panel/result-panel-display-preview";
import type { DesignLayer } from "@/lib/types";
import { PreviewDesignLayer } from "./PreviewDesignLayer";
import "./ResultPanelProductPreview.css";

/** Dev-only — bypass browser disk cache for updated garment PNGs on refresh. */
function resolveDevelopmentGarmentAssetSrc(
  garmentAssetUrl: string,
  fileVersion?: string | number,
): string {
  if (process.env.NODE_ENV !== "development") {
    return garmentAssetUrl;
  }
  const joiner = garmentAssetUrl.includes("?") ? "&" : "?";
  if (fileVersion != null && fileVersion !== "") {
    return `${garmentAssetUrl}${joiner}v=${encodeURIComponent(String(fileVersion))}`;
  }
  return `${garmentAssetUrl}${joiner}t=${Date.now()}`;
}

export interface ResultPanelProductPreviewDesignerProps {
  side: Side;
  size: Size;
  previewLayers: DesignLayer[];
  display?: ResultPanelDisplayLayer;
  alt?: string;
}

/**
 * Phase 68.6 — UA photo background + dedicated Photo Bridge stage + PreviewDesignLayer.
 * Artwork stage bypasses Legacy VGP camera; layer CSS % from designer-display-projection only.
 */
export function ResultPanelProductPreviewDesigner({
  side,
  size,
  previewLayers,
  display,
  alt = "商品預覽圖",
}: ResultPanelProductPreviewDesignerProps) {
  const geometryRuntime = useGeometryRuntime();
  const effectiveGeometryVersion =
    geometryRuntime.getEffectiveGeometryVersion("resultPanel");

  const bridge = useMemo(
    () =>
      resolveGeometryRuntimePhotoBridge({
        side,
        size,
        geometryVersion: effectiveGeometryVersion,
      }),
    [side, size, effectiveGeometryVersion],
  );
  const photoStageStyle = useMemo(
    () => photoBridgeRectToStageStyle(bridge.photoArtworkStage),
    [bridge.photoArtworkStage],
  );
  const visualCompensation = useMemo(
    () =>
      resolveRuntimeVisualCompensation({
        side,
        geometryVersion: effectiveGeometryVersion,
        surface: "resultPanel",
      }),
    [side, effectiveGeometryVersion],
  );
  const visualCompensationStyle = useMemo(
    () => runtimeVisualCompensationLayerStyle(visualCompensation),
    [visualCompensation],
  );
  const usesVisualCompensation = hasRuntimeVisualCompensation(visualCompensation);
  const photoFrameStyle = useMemo(
    () =>
      designerProjectionPhotoFrameStyle(
        bridge.canvasWidth,
        bridge.canvasHeight,
      ),
    [bridge.canvasWidth, bridge.canvasHeight],
  );
  const visibleLayers = useMemo(
    () => sortLayersByZIndex(previewLayers).filter((layer) => layer.visible),
    [previewLayers],
  );
  const garmentAssetSrc = useMemo(
    () =>
      display?.garmentAssetUrl
        ? resolveDevelopmentGarmentAssetSrc(display.garmentAssetUrl)
        : undefined,
    [display?.garmentAssetUrl],
  );

  const layerNodes = visibleLayers.map((layer) => (
    <PreviewDesignLayer
      key={layer.id}
      layer={layer}
      side={side}
      size={size}
    />
  ));

  if (!garmentAssetSrc) {
    return <p className="text-xs text-zinc-500">商品圖載入中…</p>;
  }

  return (
    <div
      className="result-panel-photo-hero w-full"
      data-presentation-engine="designer-projection-v2"
      data-result-panel-render-mode="designer_projection"
      data-geometry-runtime-version={effectiveGeometryVersion}
      data-presentation-size={size}
      data-photo-stage-left={bridge.photoArtworkStage.leftPercent.toFixed(2)}
      data-photo-stage-top={bridge.photoArtworkStage.topPercent.toFixed(2)}
      data-designer-stage-top={bridge.designerArtworkStage.topPercent.toFixed(2)}
      data-visual-compensation-active={usesVisualCompensation ? "true" : "false"}
      style={designerProjectionPhotoHeroStyle()}
    >
      <div
        className="result-panel-photo-frame"
        data-photo-bridge-frame
        style={photoFrameStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={garmentAssetSrc}
          alt=""
          aria-hidden
          className="result-panel-photo-garment block h-auto w-full max-w-none"
          style={photoGarmentImageStyle()}
        />
        <div
          data-photo-artwork-stage
          data-preview-runtime
          className="pointer-events-none overflow-visible [container-type:size]"
          style={photoStageStyle}
          aria-label={alt}
        >
          {usesVisualCompensation ? (
            <div
              data-product-preview-visual-compensation
              className="pointer-events-none"
              style={visualCompensationStyle}
            >
              {layerNodes}
            </div>
          ) : (
            layerNodes
          )}
        </div>
      </div>
    </div>
  );
}
