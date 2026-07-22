"use client";

import type { Side, Size } from "@/lib/constants";
import {
  getActiveResultPanelRenderMode,
  isDesignerProjectionRenderMode,
  type ResultPanelRenderMode,
} from "@/lib/presentation/result-panel-render-mode";
import type { ResultPanelDisplayLayer } from "@/lib/result-panel/result-panel-display-preview";
import { resolveVisibleGarmentProportion } from "@/lib/result-panel/visible-garment-proportion";
import { visibleGarmentProportionToCss } from "@/lib/result-panel/visible-garment-proportion-css";
import type { DesignLayer } from "@/lib/types";
import { ResultPanelProductPreviewDesigner } from "./ResultPanelProductPreviewDesigner";
import { ResultPanelProductPreviewLegacy } from "./ResultPanelProductPreviewLegacy";

export interface ResultPanelProductPreviewProps {
  productUrl: string;
  side: Side;
  size: Size;
  previewLayers: DesignLayer[];
  display?: ResultPanelDisplayLayer;
  renderMode?: ResultPanelRenderMode;
  alt?: string;
}

/**
 * ResultPanel hero preview — designer projection (default) or legacy (reality cal).
 */
export function ResultPanelProductPreview({
  productUrl,
  side,
  size,
  previewLayers,
  display,
  renderMode,
  alt = "商品預覽圖",
}: ResultPanelProductPreviewProps) {
  const mode = renderMode ?? getActiveResultPanelRenderMode();
  const profile = resolveVisibleGarmentProportion(size);
  const styles = visibleGarmentProportionToCss(profile);
  const { layout } = styles;
  const profileMeta = {
    visibleHeightRatio: profile.visibleHeightRatio,
    visibleSourceHeightFraction: layout.visibleSourceHeightFraction,
    topAnchorPercent: profile.topAnchorPercent,
    applyTopAnchor: layout.applyTopAnchor,
    viewportHeightPercent: layout.viewportHeightPercent,
  };

  if (isDesignerProjectionRenderMode(mode)) {
    return (
      <ResultPanelProductPreviewDesigner
        side={side}
        size={size}
        previewLayers={previewLayers}
        display={display}
        alt={alt}
      />
    );
  }

  return (
    <ResultPanelProductPreviewLegacy
      productUrl={productUrl}
      size={size}
      display={display}
      styles={styles}
      profileMeta={profileMeta}
      alt={alt}
    />
  );
}
