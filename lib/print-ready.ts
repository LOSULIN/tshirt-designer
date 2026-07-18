/**
 * Print Ready — UI / 服務層（印刷就緒分析）。
 * 不修改 Designer / Export / Layer Runtime；僅組合既有 UI 品質與 Booster 計畫。
 */
import {
  getDesignerResolutionBoostPlan,
  TARGET_DPI,
  type ResolutionBoostPlan,
} from "./image-resolution-booster";
import {
  getArtworkDesignerPrintQuality,
  type DesignerPrintQualityView,
} from "./image-print-quality-ui";
import type { ImageDesignLayer } from "./types";

export const PRINT_READY_MIN_DPI = TARGET_DPI;

export type PrintQualityTierId =
  | "excellent"
  | "good"
  | "acceptable"
  | "low"
  | "critical";

export type OptimizationScaleTier = "direct" | "caution" | "blocked";

export interface PrintQualityTier {
  id: PrintQualityTierId;
  stars: number;
  minDpi: number;
  label: string;
  description: string;
}

export interface PrintReadyView {
  currentDpi: number;
  targetDpi: number;
  tier: PrintQualityTier;
  starDisplay: string;
  artworkPixelWidth: number;
  artworkPixelHeight: number;
  designerWidthCm: number;
  designerHeightCm: number;
  designerWidthCmDisplay: number;
  designerHeightCmDisplay: number;
  requiredPixelWidth: number;
  requiredPixelHeight: number;
  upscaleFactor: number;
  meetsPrintStandard: boolean;
  needsOptimization: boolean;
  canOptimize: boolean;
  optimizationScaleTier: OptimizationScaleTier;
  exceedsMaxDimensions: boolean;
  hasTransparentBackground: boolean;
  factoryDeliverable: boolean;
  factoryStatusLabel: string;
  optimizedDpiPreview: number;
}

const PRINT_QUALITY_TIERS: PrintQualityTier[] = [
  {
    id: "excellent",
    stars: 5,
    minDpi: 500,
    label: "Excellent",
    description: "500 DPI 以上",
  },
  {
    id: "good",
    stars: 4,
    minDpi: 300,
    label: "符合印刷",
    description: "300～499 DPI",
  },
  {
    id: "acceptable",
    stars: 3,
    minDpi: 220,
    label: "可印，但建議最佳化",
    description: "220～299 DPI",
  },
  {
    id: "low",
    stars: 2,
    minDpi: 150,
    label: "品質不足",
    description: "150～219 DPI",
  },
  {
    id: "critical",
    stars: 1,
    minDpi: 0,
    label: "不建議印刷",
    description: "150 DPI 以下",
  },
];

export function getPrintQualityTier(dpi: number): PrintQualityTier {
  if (dpi >= 500) return PRINT_QUALITY_TIERS[0]!;
  if (dpi >= 300) return PRINT_QUALITY_TIERS[1]!;
  if (dpi >= 220) return PRINT_QUALITY_TIERS[2]!;
  if (dpi >= 150) return PRINT_QUALITY_TIERS[3]!;
  return PRINT_QUALITY_TIERS[4]!;
}

export function formatStarRating(stars: number): string {
  const filled = Math.min(5, Math.max(0, Math.round(stars)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function classifyOptimizationScale(
  upscaleFactor: number,
): OptimizationScaleTier {
  if (upscaleFactor > 3) return "blocked";
  if (upscaleFactor > 2) return "caution";
  return "direct";
}

function roundDesignerCm(cm: number): number {
  return Math.round(cm);
}

function hasTransparentBackgroundHint(layer: ImageDesignLayer): boolean {
  const mime = layer.image.mimeType.toLowerCase();
  return mime === "image/png" || mime === "image/webp";
}

function buildPrintReadyView(
  layer: ImageDesignLayer,
  quality: DesignerPrintQualityView,
  plan: ResolutionBoostPlan,
): PrintReadyView {
  const tier = getPrintQualityTier(quality.dpi);
  const optimizationScaleTier = classifyOptimizationScale(plan.upscaleFactor);
  const meetsPrintStandard = quality.dpi >= PRINT_READY_MIN_DPI;
  const needsOptimization = !meetsPrintStandard;
  const canOptimize =
    needsOptimization &&
    optimizationScaleTier !== "blocked" &&
    plan.upscaleFactor > 1.001 &&
    !plan.exceedsMaxDimensions;

  let factoryStatusLabel: string;
  if (meetsPrintStandard) {
    factoryStatusLabel = "✔ 可直接交付工廠";
  } else if (canOptimize) {
    factoryStatusLabel = "建議最佳化後交付工廠";
  } else if (optimizationScaleTier === "blocked") {
    factoryStatusLabel = "解析度過低，請更換高解析圖片";
  } else {
    factoryStatusLabel = "尚未符合印刷規格";
  }

  return {
    currentDpi: quality.dpi,
    targetDpi: plan.targetDpi,
    tier,
    starDisplay: formatStarRating(tier.stars),
    artworkPixelWidth: quality.artworkPixelWidth,
    artworkPixelHeight: quality.artworkPixelHeight,
    designerWidthCm: quality.designerWidthCm,
    designerHeightCm: quality.designerHeightCm,
    designerWidthCmDisplay: roundDesignerCm(quality.designerWidthCm),
    designerHeightCmDisplay: roundDesignerCm(quality.designerHeightCm),
    requiredPixelWidth: plan.requiredPixelSize.widthPx,
    requiredPixelHeight: plan.requiredPixelSize.heightPx,
    upscaleFactor: plan.upscaleFactor,
    meetsPrintStandard,
    needsOptimization,
    canOptimize,
    optimizationScaleTier,
    exceedsMaxDimensions: plan.exceedsMaxDimensions,
    hasTransparentBackground: hasTransparentBackgroundHint(layer),
    factoryDeliverable: meetsPrintStandard,
    factoryStatusLabel,
    optimizedDpiPreview: PRINT_READY_MIN_DPI,
  };
}

export function getImageLayerPrintReady(
  layer: ImageDesignLayer,
  designerWidthCm: number,
  designerHeightCm: number,
  targetDpi: number = PRINT_READY_MIN_DPI,
): PrintReadyView {
  const quality = getArtworkDesignerPrintQuality(
    layer,
    designerWidthCm,
    designerHeightCm,
    targetDpi,
  );
  const plan = getDesignerResolutionBoostPlan(
    layer,
    designerWidthCm,
    designerHeightCm,
    targetDpi,
  );
  return buildPrintReadyView(layer, quality, plan);
}
