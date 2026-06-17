import { type LayerCmRect, type PrintAreaCmBounds } from "./design-cm";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
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
  | "left-chest-text"
  | "center-chest-text"
  | "center-chest-logo"
  | "center-chest-a4-portrait"
  | "center-chest-a4-landscape"
  | "back-center-text"
  | "back-center-a4-portrait"
  | "back-center-a3-portrait"
  | "back-center-25";

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
/** 左胸文字：Logo 下方（Logo 上緣 9cm + 高 6cm） */
const LEFT_CHEST_TEXT_COLLAR_TO_TOP_CM = 15;
const LEFT_CHEST_TEXT_WIDTH_CM = 10;
const LEFT_CHEST_TEXT_HEIGHT_CM = 3;
const CENTER_CHEST_TEXT_WIDTH_CM = 29;
const CENTER_CHEST_TEXT_HEIGHT_CM = 10;

const FRONT_CENTER_COLLAR_TO_TOP_CM = PRINT_AREA_OFFSET_CM.front;
const A4_PORTRAIT_WIDTH_CM = 21;
const A4_PORTRAIT_HEIGHT_CM = 29.7;
const A3_PORTRAIT_WIDTH_CM = 29.7;
const A3_PORTRAIT_HEIGHT_CM = 42;
/** 背面大圖／直式 A4／A3：後領下 6~8cm，取中值（上緣對齊） */
const BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM = 7;
const BACK_CENTER_SQUARE_CM = 25;

function backUpperDesignAnchorY(heightCm: number): number {
  return presetAnchorYFromCollarTopCm(
    "back",
    BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM,
    heightCm,
  );
}

function backCenterAnchorY(heightCm: number): number {
  return GARMENT_MAX_PRINT_AREA_CM.back.heightCm / 2;
}

/** 推薦印刷版型（領口基準 + 設計器印刷區 cm 座標） */
export const PLACEMENT_PRESETS: readonly PlacementPreset[] = [
  {
    id: "left-chest-logo",
    label: "左胸 LOGO（6×6cm）",
    shortLabel: "左胸 6×6",
    sides: ["front"],
    width_cm: 6,
    height_cm: 6,
    anchorX_cm:
      presetCenterX("front") + LEFT_CHEST_OFFSET_FROM_CENTER_CM,
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      LEFT_CHEST_COLLAR_TO_TOP_CM,
      6,
    ),
    orientation: "square",
  },
  {
    id: "left-chest-text",
    label: "左胸文字",
    shortLabel: "左胸 10×3",
    sides: ["front"],
    width_cm: LEFT_CHEST_TEXT_WIDTH_CM,
    height_cm: LEFT_CHEST_TEXT_HEIGHT_CM,
    anchorX_cm:
      presetCenterX("front") + LEFT_CHEST_OFFSET_FROM_CENTER_CM,
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      LEFT_CHEST_TEXT_COLLAR_TO_TOP_CM,
      LEFT_CHEST_TEXT_HEIGHT_CM,
    ),
    orientation: "landscape",
  },
  {
    id: "center-chest-text",
    label: "胸前文字",
    shortLabel: "胸前 29×10",
    sides: ["front"],
    width_cm: CENTER_CHEST_TEXT_WIDTH_CM,
    height_cm: CENTER_CHEST_TEXT_HEIGHT_CM,
    anchorX_cm: presetCenterX("front"),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      FRONT_CENTER_COLLAR_TO_TOP_CM,
      CENTER_CHEST_TEXT_HEIGHT_CM,
    ),
    orientation: "landscape",
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
    id: "back-center-a4-portrait",
    label: "背面直式 A4",
    shortLabel: "背面 A4 直式",
    sides: ["back"],
    width_cm: A4_PORTRAIT_WIDTH_CM,
    height_cm: A4_PORTRAIT_HEIGHT_CM,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: backUpperDesignAnchorY(A4_PORTRAIT_HEIGHT_CM),
    orientation: "portrait",
  },
  {
    id: "back-center-a3-portrait",
    label: "背面 A3 直式",
    shortLabel: "背面 A3 直式",
    sides: ["back"],
    width_cm: A3_PORTRAIT_WIDTH_CM,
    height_cm: A3_PORTRAIT_HEIGHT_CM,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: backUpperDesignAnchorY(A3_PORTRAIT_HEIGHT_CM),
    orientation: "portrait",
  },
  {
    id: "back-center-25",
    label: "背面 25×25",
    shortLabel: "背面 25×25",
    sides: ["back"],
    width_cm: BACK_CENTER_SQUARE_CM,
    height_cm: BACK_CENTER_SQUARE_CM,
    anchorX_cm: presetCenterX("back"),
    anchorY_cm: backCenterAnchorY(BACK_CENTER_SQUARE_CM),
    orientation: "square",
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
    case "left-chest-text":
      return collarTop >= 14 && collarTop <= 16;
    case "center-chest-text":
    case "center-chest-logo":
    case "center-chest-a4-portrait":
    case "center-chest-a4-landscape":
      return Math.abs(collarTop - PRINT_AREA_OFFSET_CM.front) < 0.01;
    case "back-center-text":
    case "back-center-a4-portrait":
    case "back-center-a3-portrait":
      return collarTop >= 6 && collarTop <= 8;
    case "back-center-25": {
      const rect = getPlacementPresetTargetRect(preset);
      const centerY = rect.y_cm + rect.height_cm / 2;
      const printCenterY = GARMENT_MAX_PRINT_AREA_CM.back.heightCm / 2;
      return Math.abs(centerY - printCenterY) < 0.5;
    }
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
    return fitTextLayer(
      {
        ...layer,
        keepRatio: false,
        width_cm: target.width_cm,
        height_cm: target.height_cm,
        x_cm: target.x_cm,
        y_cm: target.y_cm,
      },
      printArea,
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
