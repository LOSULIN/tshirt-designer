import { type LayerCmRect, type PrintAreaCmBounds } from "./design-cm";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
import type { DesignLayer } from "./types";
import type { Side } from "./constants";
import { PRINT_AREA_OFFSET_CM } from "./coordinates/print-area-offset";
import { getDesignerBluePrintArea } from "./designer-print-area-config";
import {
  ADULT_TSHIRT_TEMPLATE_SPEC,
  getTemplatePxPerCm,
} from "./shirt-template";

export type PlacementPresetId =
  | "left-chest-logo"
  | "left-chest-logo-6"
  | "left-chest-logo-8"
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

/** 印刷區水平中心（Designer Blue widthCm / 2） */
function presetCenterX(size: string): number {
  return getDesignerBluePrintArea(size).widthCm / 2;
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

/** 左胸錨點 X：Designer Blue 寬度比例（平面視圖著用者左胸偏右） */
const LEFT_CHEST_ANCHOR_X_RATIO = 0.72;

function presetLeftChestAnchorX(size: string): number {
  return getDesignerBluePrintArea(size).widthCm * LEFT_CHEST_ANCHOR_X_RATIO;
}

/** 左胸 Logo：領口下 8~10cm，取中值 */
const LEFT_CHEST_COLLAR_TO_TOP_CM = 9;
/** 左胸 Logo 共用錨點（與 10×10 相同中心，6/8/10 僅尺寸不同） */
const LEFT_CHEST_LOGO_REFERENCE_HEIGHT_CM = 10;

function getLeftChestLogoAnchor(
  size: string,
): Pick<PlacementPreset, "anchorX_cm" | "anchorY_cm"> {
  return {
    anchorX_cm: presetLeftChestAnchorX(size),
    anchorY_cm: presetAnchorYFromCollarTopCm(
      "front",
      LEFT_CHEST_COLLAR_TO_TOP_CM,
      LEFT_CHEST_LOGO_REFERENCE_HEIGHT_CM,
    ),
  };
}

/** 左胸文字：Logo 下方（Logo 上緣 9cm + 高 6cm） */
const LEFT_CHEST_TEXT_COLLAR_TO_TOP_CM = 15;
const LEFT_CHEST_TEXT_WIDTH_CM = 10;
const LEFT_CHEST_TEXT_HEIGHT_CM = 3;
const CENTER_CHEST_TEXT_WIDTH_CM = 29;
const CENTER_CHEST_TEXT_HEIGHT_CM = 10;

const FRONT_CENTER_COLLAR_TO_TOP_CM = PRINT_AREA_OFFSET_CM.front;
const A4_PORTRAIT_WIDTH_CM = 21;
const A4_PORTRAIT_HEIGHT_CM = 29.7;
const A4_PORTRAIT_ASPECT = A4_PORTRAIT_WIDTH_CM / A4_PORTRAIT_HEIGHT_CM;
const A3_PORTRAIT_WIDTH_CM = 29.7;
const A3_PORTRAIT_HEIGHT_CM = 42;
const A3_PORTRAIT_ASPECT = A3_PORTRAIT_WIDTH_CM / A3_PORTRAIT_HEIGHT_CM;
const A4_BLUE_HEIGHT_RATIO = 0.6;
const A3_BLUE_HEIGHT_RATIO = 0.85;
/** 背面大圖／直式 A4／A3：後領下 6~8cm，取中值（上緣對齊） */
const BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM = 7;
const CENTER_LOGO_MAX_CM = 25;
const CENTER_LOGO_BLUE_WIDTH_RATIO = 0.71;
const CENTER_LOGO_BLUE_HEIGHT_RATIO = 0.5;
const CENTER_TEXT_MAX_WIDTH_CM = 29;
const CENTER_TEXT_BLUE_WIDTH_RATIO = 0.83;
const BACK_TEXT_MAX_WIDTH_CM = 30;
const BACK_TEXT_BLUE_WIDTH_RATIO = 0.85;

function presetCenterLogoSizeCm(size: string): {
  widthCm: number;
  heightCm: number;
} {
  const blue = getDesignerBluePrintArea(size);
  return {
    widthCm: Math.min(
      CENTER_LOGO_MAX_CM,
      blue.widthCm * CENTER_LOGO_BLUE_WIDTH_RATIO,
    ),
    heightCm: Math.min(
      CENTER_LOGO_MAX_CM,
      blue.heightCm * CENTER_LOGO_BLUE_HEIGHT_RATIO,
    ),
  };
}

function presetCenterTextWidthCm(size: string): number {
  const blue = getDesignerBluePrintArea(size);
  return Math.min(
    CENTER_TEXT_MAX_WIDTH_CM,
    blue.widthCm * CENTER_TEXT_BLUE_WIDTH_RATIO,
  );
}

function presetBackTextWidthCm(size: string): number {
  const blue = getDesignerBluePrintArea(size);
  return Math.min(
    BACK_TEXT_MAX_WIDTH_CM,
    blue.widthCm * BACK_TEXT_BLUE_WIDTH_RATIO,
  );
}

function presetBackCenterSizeCm(size: string): {
  widthCm: number;
  heightCm: number;
} {
  return presetCenterLogoSizeCm(size);
}

function presetA4PortraitSizeCm(size: string): {
  widthCm: number;
  heightCm: number;
} {
  const blue = getDesignerBluePrintArea(size);
  const heightCm = Math.min(
    A4_PORTRAIT_HEIGHT_CM,
    blue.heightCm * A4_BLUE_HEIGHT_RATIO,
  );
  return {
    widthCm: heightCm * A4_PORTRAIT_ASPECT,
    heightCm,
  };
}

function presetA3PortraitSizeCm(size: string): {
  widthCm: number;
  heightCm: number;
} {
  const blue = getDesignerBluePrintArea(size);
  const heightCm = Math.min(
    A3_PORTRAIT_HEIGHT_CM,
    blue.heightCm * A3_BLUE_HEIGHT_RATIO,
  );
  return {
    widthCm: heightCm * A3_PORTRAIT_ASPECT,
    heightCm,
  };
}

function backUpperDesignAnchorY(heightCm: number): number {
  return presetAnchorYFromCollarTopCm(
    "back",
    BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM,
    heightCm,
  );
}

/** 推薦印刷版型（領口基準 + Designer Blue 印刷區 cm 座標） */
export function buildPlacementPresets(size: string): PlacementPreset[] {
  const centerTextWidthCm = presetCenterTextWidthCm(size);
  const centerLogoSizeCm = presetCenterLogoSizeCm(size);
  const backTextWidthCm = presetBackTextWidthCm(size);
  const backCenterSizeCm = presetBackCenterSizeCm(size);
  const a4PortraitSizeCm = presetA4PortraitSizeCm(size);
  const a3PortraitSizeCm = presetA3PortraitSizeCm(size);

  return [
    {
      id: "left-chest-logo",
      label: "左胸 LOGO 10×10",
      shortLabel: "左胸 10×10",
      sides: ["front"],
      width_cm: 10,
      height_cm: 10,
      ...getLeftChestLogoAnchor(size),
      orientation: "square",
    },
    {
      id: "left-chest-logo-6",
      label: "左胸 LOGO 6×6",
      shortLabel: "左胸 6×6",
      sides: ["front"],
      width_cm: 6,
      height_cm: 6,
      ...getLeftChestLogoAnchor(size),
      orientation: "square",
    },
    {
      id: "left-chest-logo-8",
      label: "左胸 LOGO 8×8",
      shortLabel: "左胸 8×8",
      sides: ["front"],
      width_cm: 8,
      height_cm: 8,
      ...getLeftChestLogoAnchor(size),
      orientation: "square",
    },
    {
      id: "left-chest-text",
      label: "左胸文字",
      shortLabel: "左胸 10×3",
      sides: ["front"],
      width_cm: LEFT_CHEST_TEXT_WIDTH_CM,
      height_cm: LEFT_CHEST_TEXT_HEIGHT_CM,
      anchorX_cm: presetLeftChestAnchorX(size),
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
      width_cm: centerTextWidthCm,
      height_cm: CENTER_CHEST_TEXT_HEIGHT_CM,
      anchorX_cm: presetCenterX(size),
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
      width_cm: centerLogoSizeCm.widthCm,
      height_cm: centerLogoSizeCm.heightCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        centerLogoSizeCm.heightCm,
      ),
      orientation: "square",
    },
    {
      id: "center-chest-a4-portrait",
      label: "胸前 A4 直式",
      shortLabel: "A4 直式",
      sides: ["front"],
      width_cm: a4PortraitSizeCm.widthCm,
      height_cm: a4PortraitSizeCm.heightCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        a4PortraitSizeCm.heightCm,
      ),
      orientation: "portrait",
    },
    {
      id: "center-chest-a4-landscape",
      label: "胸前 A4 橫式",
      shortLabel: "A4 橫式",
      sides: ["front"],
      width_cm: a4PortraitSizeCm.heightCm,
      height_cm: a4PortraitSizeCm.widthCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        a4PortraitSizeCm.widthCm,
      ),
      orientation: "landscape",
    },
    {
      id: "back-center-text",
      label: "背面文字",
      shortLabel: "背面 30×12",
      sides: ["back"],
      width_cm: backTextWidthCm,
      height_cm: 12,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: backUpperDesignAnchorY(12),
      orientation: "landscape",
    },
    {
      id: "back-center-a4-portrait",
      label: "背面直式 A4",
      shortLabel: "背面 A4 直式",
      sides: ["back"],
      width_cm: a4PortraitSizeCm.widthCm,
      height_cm: a4PortraitSizeCm.heightCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: backUpperDesignAnchorY(a4PortraitSizeCm.heightCm),
      orientation: "portrait",
    },
    {
      id: "back-center-a3-portrait",
      label: "背面 A3 直式",
      shortLabel: "背面 A3 直式",
      sides: ["back"],
      width_cm: a3PortraitSizeCm.widthCm,
      height_cm: a3PortraitSizeCm.heightCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: backUpperDesignAnchorY(a3PortraitSizeCm.heightCm),
      orientation: "portrait",
    },
    {
      id: "back-center-25",
      label: "背面 25×25",
      shortLabel: "背面 25×25",
      sides: ["back"],
      width_cm: backCenterSizeCm.widthCm,
      height_cm: backCenterSizeCm.heightCm,
      anchorX_cm: presetCenterX(size),
      anchorY_cm: backUpperDesignAnchorY(backCenterSizeCm.heightCm),
      orientation: "square",
    },
  ];
}

/** @deprecated 請用 buildPlacementPresets(size)；預設 M 尺碼 */
export const PLACEMENT_PRESETS: readonly PlacementPreset[] =
  buildPlacementPresets("M");

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

function isPlacementPresetPositionOk(
  preset: PlacementPreset,
  size: string,
): boolean {
  const collarTop = getPlacementPresetCollarToTopCm(preset);
  switch (preset.id) {
    case "left-chest-logo":
    case "left-chest-logo-6":
    case "left-chest-logo-8": {
      const rect = getPlacementPresetTargetRect(preset);
      const centerY = rect.y_cm + rect.height_cm / 2;
      const refCenterY = getLeftChestLogoAnchor(size).anchorY_cm;
      return (
        collarTop >= 8 &&
        collarTop <= 10 &&
        Math.abs(centerY - refCenterY) < 0.01
      );
    }
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
    case "back-center-25":
      return collarTop >= 6 && collarTop <= 8;
    default:
      return true;
  }
}

export function buildPlacementPresetCalibrationRow(
  preset: PlacementPreset,
  size: string = "M",
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
    positionOk: isPlacementPresetPositionOk(preset, size),
  };
}

export function buildPlacementPresetCalibrationReport(
  side: Side,
  size: string = "M",
): PlacementPresetCalibrationRow[] {
  return getPlacementPresetsForSide(side, size).map((preset) =>
    buildPlacementPresetCalibrationRow(preset, size),
  );
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
  size: string = "M",
): PlacementPreset | undefined {
  return buildPlacementPresets(size).find((preset) => preset.id === id);
}

export function getPlacementPresetsForSide(
  side: Side,
  size: string = "M",
): PlacementPreset[] {
  return buildPlacementPresets(size).filter((preset) =>
    preset.sides.includes(side),
  );
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
