import {
  analyzeImagePrintQuality,
  isRasterImageLayer,
  PRINT_QUALITY_TARGET_DPI,
} from "@/lib/image-print-quality";
import type { DesignLayer } from "@/lib/types";

export type ResultPanelDpiTier = "ok" | "caution" | "low";

export interface ResultPanelDpiView {
  dpi: number;
  tier: ResultPanelDpiTier;
  statusIcon: string;
  statusLabel: string;
  statusClassName: string;
  dpiClassName: string;
}

/** UI-only：取所有點陣圖層最低 DPI（最差品質） */
export function getResultPanelRasterDpi(layers: DesignLayer[]): number | null {
  const rasterLayers = layers.filter(isRasterImageLayer);
  if (rasterLayers.length === 0) return null;

  return Math.min(
    ...rasterLayers.map((layer) => analyzeImagePrintQuality(layer).dpi),
  );
}

export function getResultPanelDpiView(
  layers: DesignLayer[],
): ResultPanelDpiView {
  const measured = getResultPanelRasterDpi(layers);
  const dpi =
    measured ?? PRINT_QUALITY_TARGET_DPI;

  if (dpi >= PRINT_QUALITY_TARGET_DPI) {
    return {
      dpi,
      tier: "ok",
      statusIcon: "✓",
      statusLabel: "可印製",
      statusClassName: "text-emerald-700",
      dpiClassName: "text-emerald-700",
    };
  }

  if (dpi >= 230) {
    return {
      dpi,
      tier: "caution",
      statusIcon: "△",
      statusLabel: "建議提升解析度",
      statusClassName: "text-amber-700",
      dpiClassName: "text-amber-700",
    };
  }

  return {
    dpi,
    tier: "low",
    statusIcon: "✕",
    statusLabel: "解析度不足",
    statusClassName: "text-red-700",
    dpiClassName: "text-red-700",
  };
}
