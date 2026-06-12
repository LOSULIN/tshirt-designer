import { type LayerCmRect, type PrintAreaCmBounds } from "./design-cm";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
import { getTextLayerCmRect } from "./text-layer";
import type { DesignLayer } from "./types";
import type { Side } from "./constants";
import { PRINT_AREA_OFFSET_CM } from "./coordinates/print-area-offset";
import { GARMENT_MAX_PRINT_AREA_CM } from "./garment-print-config";
import {
  ADULT_TSHIRT_TEMPLATE_SPEC,
  getTemplatePxPerCm,
} from "./shirt-template";

export type PlacementPresetId =
  | "left-chest-logo"
  | "center-chest-logo"
  | "center-chest-a4-portrait"
  | "center-chest-a4-landscape"
  | "back-center-text"
  | "back-center-a3"
  | "back-collar-tag";

export type PlacementPresetOrientation = "portrait" | "landscape" | "square";

export interface PlacementPreset {
  id: PlacementPresetId;
  label: string;
  shortLabel: string;
  sides: Side[];
  width_cm: number;
  height_cm: number;
  orientation: PlacementPresetOrientation;
  /** 版型錨點（設計中心）於印刷區 cm 座標 */
  anchorX_cm: number;
  anchorY_cm: number;
}

/** 印刷區水平中心（正面 35cm → 17.5、背面 38cm → 19） */
function presetCenterX(side: Side): number {
  return GARMENT_MAX_PRINT_AREA_CM[side].widthCm / 2;
}

/**
 * 領口下緣至設計上緣 (cm) → 印刷區內 anchorY（設計中心）。
 * 印刷區上緣 = 領口 + PRINT_AREA_OFFSET_CM[side]。
 */
function presetAnchorYFromCollarTopCm(
  side: Side,
  collarToDesignTopCm: number,
  heightCm: number,
): number {
  const yTopInPrintArea =
    collarToDesignTopCm - PRINT_AREA_OFFSET_CM[side];
  return yTopInPrintArea + heightCm / 2;
}

/** 左胸 Logo：著用者左胸（平面正面視圖偏右），距衣身中心線 */
const LEFT_CHEST_OFFSET_FROM_CENTER_CM = 8;
/** 左胸 Logo：領口下 8~10cm，取中值 */
const LEFT_CHEST_COLLAR_TO_TOP_CM = 9;

const FRONT_CENTER_COLLAR_TO_TOP_CM = PRINT_AREA_OFFSET_CM.front;
const A4_PORTRAIT_WIDTH_CM = 21;
const A4_PORTRAIT_HEIGHT_CM = 29.7;
/** 背面 30×12／直式 A3：後領下 6~8cm，取中值（上緣對齊） */
const BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM = 7;
const A3_PORTRAIT_WIDTH_CM = 29.7;
const A3_PORTRAIT_HEIGHT_CM = 42;

function backUpperDesignAnchorY(heightCm: number): number {
  return presetAnchorYFromCollarTopCm(
    "back",
    BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM,
    heightCm,
  );
}
/** 後領小標：後領正下方 2~4cm，取中值 */
const BACK_COLLAR_TAG_COLLAR_TO_TOP_CM = 3;

/** 推薦印刷版型（領口基準 + 設計器印刷區 cm 座標） */
export const PLACEMENT_PRESETS: readonly PlacementPreset[] = [
  {
    id: "left-chest-logo",
    label: "左胸 Logo",
    shortLabel: "左胸 10×10",
    sides: ["front"],
    width_cm: 10,
    height_cm: 10,
    anchorX_cm:
      presetCenterX("front") + LEFT_CHEST_OFFSET_FROM_CENTER_CM,
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      LEFT_CHEST_COLLAR_TO_TOP_CM,
      10,
    ),
    orientation: "square",
  },
  {
    id: "center-chest-logo",
    label: "胸前 Logo",
    shortLabel: "胸前 25×25",
    sides: ["front"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: presetCenterX("front"),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      FRONT_CENTER_COLLAR_TO_TOP_CM,
      25,
    ),
    orientation: "square",
  },
  {
    id: "center-chest-a4-portrait",
    label: "胸前 A4 直式",
    shortLabel: "A4 直式",
    sides: ["front"],
    width_cm: A4_PORTRAIT_WIDTH_CM,
    height_cm: A4_PORTRAIT_HEIGHT_CM,
    anchorX_cm: presetCenterX("front"),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      FRONT_CENTER_COLLAR_TO_TOP_CM,
      A4_PORTRAIT_HEIGHT_CM,
    ),
    orientation: "portrait",
  },
  {
    id: "center-chest-a4-landscape",
    label: "胸前 A4 橫式",
    shortLabel: "A4 橫式",
    sides: ["front"],
    width_cm: A4_PORTRAIT_HEIGHT_CM,
    height_cm: A4_PORTRAIT_WIDTH_CM,
    anchorX_cm: presetCenterX("front"),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      FRONT_CENTER_COLLAR_TO_TOP_CM,
      A4_PORTRAIT_WIDTH_CM,
    ),
    orientation: "landscape",
  },
  {
    id: "back-center-text",
    label: "背面文字",
    shortLabel: "背面 30×12",
    sides: ["back"],
    width_cm: 30,
    height_cm: 12,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: backUpperDesignAnchorY(12),
    orientation: "landscape",
  },
  {
    id: "back-center-a3",
    label: "背面直式 A3",
    shortLabel: "背面直式 A3",
    sides: ["back"],
    width_cm: A3_PORTRAIT_WIDTH_CM,
    height_cm: A3_PORTRAIT_HEIGHT_CM,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: backUpperDesignAnchorY(A3_PORTRAIT_HEIGHT_CM),
    orientation: "portrait",
  },
  {
    id: "back-collar-tag",
    label: "後領小標",
    shortLabel: "後領 6×4",
    sides: ["back"],
    width_cm: 6,
    height_cm: 4,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "back",
      BACK_COLLAR_TAG_COLLAR_TO_TOP_CM,
      4,
    ),
    orientation: "landscape",
  },
] as const;

/** 新增物件時使用的版型框（cm，左上原點） */
export function getPlacementPresetLayerPlacement(
  preset: PlacementPreset,
): {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
} {
  const target = getPlacementPresetTargetRect(preset);
  return {
    x_cm: target.x_cm,
    y_cm: target.y_cm,
    width_cm: target.width_cm,
    height_cm: target.height_cm,
  };
}

export interface PlacementPresetCalibrationRow {
  id: PlacementPresetId;
  label: string;
  templateCm: { widthCm: number; heightCm: number };
  canvasPx: { widthPx: number; heightPx: number };
  position: {
    anchorX_cm: number;
    anchorY_cm: number;
    x_cm: number;
    y_cm: number;
  };
  collarToTopCm: number;
  positionOk: boolean;
}

/** 由印刷區座標反推領口下緣至設計上緣 (cm) */
export function getPlacementPresetCollarToTopCm(
  preset: PlacementPreset,
): number {
  const side = preset.sides[0]!;
  const rect = getPlacementPresetTargetRect(preset);
  return rect.y_cm + PRINT_AREA_OFFSET_CM[side];
}

function isPlacementPresetPositionOk(preset: PlacementPreset): boolean {
  const collarTop = getPlacementPresetCollarToTopCm(preset);
  switch (preset.id) {
    case "left-chest-logo":
      return collarTop >= 8 && collarTop <= 10;
    case "center-chest-logo":
    case "center-chest-a4-portrait":
    case "center-chest-a4-landscape":
      return Math.abs(collarTop - PRINT_AREA_OFFSET_CM.front) < 0.01;
    case "back-center-text":
    case "back-center-a3":
      return collarTop >= 6 && collarTop <= 8;
    case "back-collar-tag":
      return collarTop >= 2 && collarTop <= 4;
    default:
      return true;
  }
}

export function buildPlacementPresetCalibrationRow(
  preset: PlacementPreset,
): PlacementPresetCalibrationRow {
  const pxPerCm = getTemplatePxPerCm();
  const rect = getPlacementPresetTargetRect(preset);
  return {
    id: preset.id,
    label: preset.label,
    templateCm: {
      widthCm: preset.width_cm,
      heightCm: preset.height_cm,
    },
    canvasPx: {
      widthPx: Math.round(preset.width_cm * pxPerCm * 10) / 10,
      heightPx: Math.round(preset.height_cm * pxPerCm * 10) / 10,
    },
    position: {
      anchorX_cm: preset.anchorX_cm,
      anchorY_cm: preset.anchorY_cm,
      x_cm: Math.round(rect.x_cm * 10) / 10,
      y_cm: Math.round(rect.y_cm * 10) / 10,
    },
    collarToTopCm: Math.round(getPlacementPresetCollarToTopCm(preset) * 10) / 10,
    positionOk: isPlacementPresetPositionOk(preset),
  };
}

export function buildPlacementPresetCalibrationReport(
  side: Side,
): PlacementPresetCalibrationRow[] {
  return getPlacementPresetsForSide(side).map(buildPlacementPresetCalibrationRow);
}

export function getPlacementPresetTemplatePxPerCm(): number {
  return getTemplatePxPerCm();
}

export function getPlacementPresetTemplateCanvasPx(): {
  widthPx: number;
  heightPx: number;
} {
  return {
    widthPx: ADULT_TSHIRT_TEMPLATE_SPEC.widthPx,
    heightPx: ADULT_TSHIRT_TEMPLATE_SPEC.heightPx,
  };
}

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
 * 套用版型：物件外框 = 模板 width_cm × height_cm（不依圖片原始比例縮放）。
 */
export function applyLayerPlacementPreset(
  layer: DesignLayer,
  preset: PlacementPreset,
  printArea: PrintAreaCmBounds,
  _options?: { largePrintMode?: boolean },
): DesignLayer {
  const rasterFit = {
    maxPrintWidth_cm: preset.width_cm,
    maxPrintHeight_cm: preset.height_cm,
  };
  const target = getPlacementPresetTargetRect(preset);

  if (layer.type === "text") {
    const current = getTextLayerCmRect(layer);
    if (current.width_cm <= 0 || current.height_cm <= 0) {
      return layer;
    }
    const factor = Math.min(
      target.width_cm / current.width_cm,
      target.height_cm / current.height_cm,
    );
    return fitTextLayer(
      {
        ...layer,
        scale: layer.scale * factor,
      },
      printArea,
      {
        anchorCenter: {
          x_cm: preset.anchorX_cm,
          y_cm: preset.anchorY_cm,
        },
      },
    );
  }

  if (layer.type === "shape") {
    return fitShapeLayer(
      {
        ...layer,
        width_cm: target.width_cm,
        height_cm: target.height_cm,
        scale: 1,
        x_cm: target.x_cm,
        y_cm: target.y_cm,
      },
      printArea,
    );
  }

  return fitImageLayer(
    {
      ...layer,
      width_cm: target.width_cm,
      height_cm: target.height_cm,
      scale: 1,
      x_cm: target.x_cm,
      y_cm: target.y_cm,
    },
    printArea,
    rasterFit,
  );
}
