/**
 * ResultPanel display-only preview metadata (does not replace ProductExportPreview).
 */

import type { Side } from "@/lib/constants";
import type { ProductExportPreview } from "@/lib/export/product-export";
import type { RealityCalibrationMetrics } from "./reality-calibration";

export interface ResultPanelDisplayLayer {
  garmentAssetUrl: string;
  mockupArtworkUrl: string;
  artworkPlacement: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  reality: RealityCalibrationMetrics;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ResultPanelDisplayPreview extends ProductExportPreview {
  /** Presentation-only split layers for reality calibration display. */
  display: ResultPanelDisplayLayer;
}

export function isResultPanelDisplayPreview(
  preview: ProductExportPreview | null | undefined,
): preview is ResultPanelDisplayPreview {
  return Boolean(
    preview &&
      "display" in preview &&
      (preview as ResultPanelDisplayPreview).display?.garmentAssetUrl,
  );
}

export function resolveResultPanelDisplaySide(
  side: Side,
): "front" | "back" {
  return side === "back" ? "back" : "front";
}
