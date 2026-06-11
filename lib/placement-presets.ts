import { getLayerEffectiveCmRect, type LayerCmRect, type PrintAreaCmBounds } from "./design-cm";
import { getImageFitOptions } from "./image-print-quality";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
import type { DesignLayer } from "./types";
import type { Side } from "./constants";

export type PlacementPresetId =
  | "left-chest-logo"
  | "center-chest-logo"
  | "center-chest-a4"
  | "back-center-text"
  | "back-center-a3"
  | "back-collar-tag";

export interface PlacementPreset {
  id: PlacementPresetId;
  label: string;
  shortLabel: string;
  sides: Side[];
  width_cm: number;
  height_cm: number;
  /** 版型錨點（設計中心）於印刷區 cm 座標 */
  anchorX_cm: number;
  anchorY_cm: number;
}

/** 推薦印刷版型（35×50 cm 印刷區） */
export const PLACEMENT_PRESETS: readonly PlacementPreset[] = [
  {
    id: "left-chest-logo",
    label: "左胸 Logo",
    shortLabel: "左胸 10×10",
    sides: ["front"],
    width_cm: 10,
    height_cm: 10,
    anchorX_cm: 10,
    anchorY_cm: 12,
  },
  {
    id: "center-chest-logo",
    label: "胸前 Logo",
    shortLabel: "胸前 25×25",
    sides: ["front"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: 17.5,
    anchorY_cm: 16,
  },
  {
    id: "center-chest-a4",
    label: "胸前大圖 (A4)",
    shortLabel: "胸前 A4",
    sides: ["front"],
    width_cm: 21,
    height_cm: 29.7,
    anchorX_cm: 17.5,
    anchorY_cm: 20,
  },
  {
    id: "back-center-text",
    label: "背面文字",
    shortLabel: "背面 30×12",
    sides: ["back"],
    width_cm: 30,
    height_cm: 12,
    anchorX_cm: 17.5,
    anchorY_cm: 24,
  },
  {
    id: "back-center-a3",
    label: "背面大圖 (A3)",
    shortLabel: "背面 A3",
    sides: ["back"],
    width_cm: 29.7,
    height_cm: 42,
    anchorX_cm: 17.5,
    anchorY_cm: 28,
  },
  {
    id: "back-collar-tag",
    label: "後領小標",
    shortLabel: "後領 6×4",
    sides: ["back"],
    width_cm: 6,
    height_cm: 4,
    anchorX_cm: 17.5,
    anchorY_cm: 5,
  },
] as const;

export function getPlacementPresetById(
  id: PlacementPresetId,
): PlacementPreset | undefined {
  return PLACEMENT_PRESETS.find((preset) => preset.id === id);
}

export function getPlacementPresetsForSide(side: Side): PlacementPreset[] {
  return PLACEMENT_PRESETS.filter((preset) => preset.sides.includes(side));
}

/** 版型目標框（左上 + 寬高） */
export function getPlacementPresetTargetRect(
  preset: PlacementPreset,
): LayerCmRect {
  return {
    x_cm: preset.anchorX_cm - preset.width_cm / 2,
    y_cm: preset.anchorY_cm - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
}

/**
 * 等比例縮放至版型框內（contain），置中於版型區域。
 */
export function applyLayerPlacementPreset(
  layer: DesignLayer,
  preset: PlacementPreset,
  printArea: PrintAreaCmBounds,
  options?: { largePrintMode?: boolean },
): DesignLayer {
  const rasterFit = getImageFitOptions(options?.largePrintMode ?? false);
  const target = getPlacementPresetTargetRect(preset);
  const current = getLayerEffectiveCmRect(layer);

  if (current.width_cm <= 0 || current.height_cm <= 0) {
    return layer;
  }

  const factor = Math.min(
    target.width_cm / current.width_cm,
    target.height_cm / current.height_cm,
  );

  const fittedW = current.width_cm * factor;
  const fittedH = current.height_cm * factor;
  const x_cm = target.x_cm + (target.width_cm - fittedW) / 2;
  const y_cm = target.y_cm + (target.height_cm - fittedH) / 2;

  if (layer.type === "text") {
    return fitTextLayer(
      {
        ...layer,
        scale: layer.scale * factor,
      },
      printArea,
      {
        anchorCenter: {
          x_cm: x_cm + fittedW / 2,
          y_cm: y_cm + fittedH / 2,
        },
      },
    );
  }

  if (layer.type === "shape") {
    return fitShapeLayer(
      {
        ...layer,
        width_cm: fittedW,
        height_cm: fittedH,
        scale: 1,
        x_cm,
        y_cm,
      },
      printArea,
    );
  }

  return fitImageLayer(
    {
      ...layer,
      x_cm,
      y_cm,
      scale: layer.scale * factor,
    },
    printArea,
    rasterFit,
  );
}
