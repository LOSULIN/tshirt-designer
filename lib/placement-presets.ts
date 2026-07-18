import { type LayerCmRect, type PrintAreaCmBounds } from "./design-cm";
import { DESIGNER_WORKSPACE_REFERENCE_SIZE } from "./designer-workspace";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
import type { DesignLayer } from "./types";
import type { Side } from "./constants";
import { PRINT_AREA_OFFSET_CM } from "./coordinates/print-area-offset";
import {
  GARMENT_FRONT_CENTER_COLLAR_TO_TOP_CM,
  resolveFactoryLeftChestAnchorCm,
  resolveGarmentAnchorYFromCollarCm,
  resolveGarmentBackUpperAnchorYCm,
  resolveGarmentCenterAnchorXCm,
  resolveGarmentLeftChestLogoAnchorCm,
} from "./garment-anchor-runtime";
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
  | "front-a5-portrait"
  | "front-a5-landscape"
  | "back-center-text"
  | "back-center-a4-portrait"
  | "back-a5-portrait"
  | "back-a5-landscape"
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
  /** 版型錨點（設計中心）於 Garment Blue 印刷區 cm 座標 */
  anchorX_cm: number;
  anchorY_cm: number;
}

/** @deprecated 內部用；請用 resolveGarmentCenterAnchorXCm */
function presetCenterX(size: string): number {
  return resolveGarmentCenterAnchorXCm(size);
}

/** @deprecated 內部用；請用 resolveGarmentAnchorYFromCollarCm */
function presetAnchorYFromCollarTopCm(
  side: Side,
  collarToDesignTopCm: number,
  heightCm: number,
): number {
  return resolveGarmentAnchorYFromCollarCm(
    side,
    collarToDesignTopCm,
    heightCm,
  );
}

function presetLeftChestAnchor(size: string): Pick<
  PlacementPreset,
  "anchorX_cm" | "anchorY_cm"
> {
  return resolveFactoryLeftChestAnchorCm(size);
}

/** 左胸 Logo 共用錨點（與 10×10 相同中心，6/8/10 僅尺寸不同） */
function getLeftChestLogoAnchor(
  size: string,
): Pick<PlacementPreset, "anchorX_cm" | "anchorY_cm"> {
  return resolveGarmentLeftChestLogoAnchorCm(size);
}

/** 左胸文字：與 Logo 共用工廠錨點中心 */
const LEFT_CHEST_TEXT_WIDTH_CM = 10;
const LEFT_CHEST_TEXT_HEIGHT_CM = 3;
const CENTER_CHEST_TEXT_WIDTH_CM = 29;
const CENTER_CHEST_TEXT_HEIGHT_CM = 10;

const FRONT_CENTER_COLLAR_TO_TOP_CM = GARMENT_FRONT_CENTER_COLLAR_TO_TOP_CM;
const A4_PORTRAIT_WIDTH_CM = 21;
const A4_PORTRAIT_HEIGHT_CM = 29.7;
const A5_PORTRAIT_WIDTH_CM = 15;
const A5_PORTRAIT_HEIGHT_CM = 21;
const A3_PORTRAIT_WIDTH_CM = 29.7;
const A3_PORTRAIT_HEIGHT_CM = 42;
const CENTER_LOGO_CM = 25;
const BACK_TEXT_WIDTH_CM = 30;
const BACK_TEXT_HEIGHT_CM = 12;
const BACK_CENTER_CM = 25;

/** Placement 錨點一律以固定 Design Workspace（M）為基準，不依商品尺碼漂移 */
const PLACEMENT_WORKSPACE_SIZE = DESIGNER_WORKSPACE_REFERENCE_SIZE;

function placementWorkspacePrintArea(side: Side): PrintAreaCmBounds {
  return resolveGarmentPrintAreaCm(PLACEMENT_WORKSPACE_SIZE, side);
}

/**
 * Workspace 儲存座標 → 各尺碼 Garment 印刷區 cm（Preview 等 size-aware Runtime 用）。
 * 線性比例映射；Placement 錨點已凍結在 M workspace。
 */
export function mapWorkspaceLayerCmRectToGarmentPrintArea(
  rect: LayerCmRect,
  side: Side,
  size: string,
): LayerCmRect {
  if (size === PLACEMENT_WORKSPACE_SIZE) return rect;
  const workspace = placementWorkspacePrintArea(side);
  const garment = resolveGarmentPrintAreaCm(size, side);
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function backUpperDesignAnchorY(heightCm: number): number {
  return resolveGarmentBackUpperAnchorYCm(heightCm);
}

/** 推薦印刷版型（固定 Workspace 錨點；size 僅保留 API 相容） */
export function buildPlacementPresets(size: string): PlacementPreset[] {
  void size;
  const ws = PLACEMENT_WORKSPACE_SIZE;
  return [
    {
      id: "left-chest-logo",
      label: "左胸 LOGO 10×10",
      shortLabel: "左胸 10×10",
      sides: ["front"],
      width_cm: 10,
      height_cm: 10,
      ...getLeftChestLogoAnchor(ws),
      orientation: "square",
    },
    {
      id: "left-chest-logo-6",
      label: "左胸 LOGO 6×6",
      shortLabel: "左胸 6×6",
      sides: ["front"],
      width_cm: 6,
      height_cm: 6,
      ...getLeftChestLogoAnchor(ws),
      orientation: "square",
    },
    {
      id: "left-chest-logo-8",
      label: "左胸 LOGO 8×8",
      shortLabel: "左胸 8×8",
      sides: ["front"],
      width_cm: 8,
      height_cm: 8,
      ...getLeftChestLogoAnchor(ws),
      orientation: "square",
    },
    {
      id: "left-chest-text",
      label: "左胸文字",
      shortLabel: "左胸 10×3",
      sides: ["front"],
      width_cm: LEFT_CHEST_TEXT_WIDTH_CM,
      height_cm: LEFT_CHEST_TEXT_HEIGHT_CM,
      ...presetLeftChestAnchor(ws),
      orientation: "landscape",
    },
    {
      id: "center-chest-text",
      label: "胸前文字",
      shortLabel: "胸前 29×10",
      sides: ["front"],
      width_cm: CENTER_CHEST_TEXT_WIDTH_CM,
      height_cm: CENTER_CHEST_TEXT_HEIGHT_CM,
      anchorX_cm: presetCenterX(ws),
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
      width_cm: CENTER_LOGO_CM,
      height_cm: CENTER_LOGO_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        CENTER_LOGO_CM,
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
      anchorX_cm: presetCenterX(ws),
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
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        A4_PORTRAIT_WIDTH_CM,
      ),
      orientation: "landscape",
    },
    {
      id: "front-a5-portrait",
      label: "A5 直式",
      shortLabel: "A5 直式",
      sides: ["front"],
      width_cm: A5_PORTRAIT_WIDTH_CM,
      height_cm: A5_PORTRAIT_HEIGHT_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        A5_PORTRAIT_HEIGHT_CM,
      ),
      orientation: "portrait",
    },
    {
      id: "front-a5-landscape",
      label: "A5 橫式",
      shortLabel: "A5 橫式",
      sides: ["front"],
      width_cm: A5_PORTRAIT_HEIGHT_CM,
      height_cm: A5_PORTRAIT_WIDTH_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: presetAnchorYFromCollarTopCm(
        "front",
        FRONT_CENTER_COLLAR_TO_TOP_CM,
        A5_PORTRAIT_WIDTH_CM,
      ),
      orientation: "landscape",
    },
    {
      id: "back-center-text",
      label: "背面文字",
      shortLabel: "背面 30×12",
      sides: ["back"],
      width_cm: BACK_TEXT_WIDTH_CM,
      height_cm: BACK_TEXT_HEIGHT_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: backUpperDesignAnchorY(BACK_TEXT_HEIGHT_CM),
      orientation: "landscape",
    },
    {
      id: "back-a5-portrait",
      label: "A5 直式",
      shortLabel: "A5 直式",
      sides: ["back"],
      width_cm: A5_PORTRAIT_WIDTH_CM,
      height_cm: A5_PORTRAIT_HEIGHT_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: backUpperDesignAnchorY(A5_PORTRAIT_HEIGHT_CM),
      orientation: "portrait",
    },
    {
      id: "back-a5-landscape",
      label: "A5 橫式",
      shortLabel: "A5 橫式",
      sides: ["back"],
      width_cm: A5_PORTRAIT_HEIGHT_CM,
      height_cm: A5_PORTRAIT_WIDTH_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: backUpperDesignAnchorY(A5_PORTRAIT_WIDTH_CM),
      orientation: "landscape",
    },
    {
      id: "back-center-a4-portrait",
      label: "背面直式 A4",
      shortLabel: "背面 A4 直式",
      sides: ["back"],
      width_cm: A4_PORTRAIT_WIDTH_CM,
      height_cm: A4_PORTRAIT_HEIGHT_CM,
      anchorX_cm: presetCenterX(ws),
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
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: backUpperDesignAnchorY(A3_PORTRAIT_HEIGHT_CM),
      orientation: "portrait",
    },
    {
      id: "back-center-25",
      label: "背面 25×25",
      shortLabel: "背面 25×25",
      sides: ["back"],
      width_cm: BACK_CENTER_CM,
      height_cm: BACK_CENTER_CM,
      anchorX_cm: presetCenterX(ws),
      anchorY_cm: backUpperDesignAnchorY(BACK_CENTER_CM),
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
    case "left-chest-logo-8":
    case "left-chest-text": {
      const rect = getPlacementPresetTargetRect(preset);
      const centerX = rect.x_cm + rect.width_cm / 2;
      const centerY = rect.y_cm + rect.height_cm / 2;
      const ref = resolveFactoryLeftChestAnchorCm(PLACEMENT_WORKSPACE_SIZE);
      return (
        Math.abs(centerX - ref.anchorX_cm) < 0.01 &&
        Math.abs(centerY - ref.anchorY_cm) < 0.01
      );
    }
    case "center-chest-text":
    case "center-chest-logo":
    case "center-chest-a4-portrait":
    case "center-chest-a4-landscape":
    case "front-a5-portrait":
    case "front-a5-landscape":
      return Math.abs(collarTop - PRINT_AREA_OFFSET_CM.front) < 0.01;
    case "back-center-text":
    case "back-center-a4-portrait":
    case "back-center-a3-portrait":
    case "back-center-25":
    case "back-a5-portrait":
    case "back-a5-landscape":
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
  void printArea;
  const side = preset.sides[0] ?? "front";
  const workspacePrintArea = placementWorkspacePrintArea(side);
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
      workspacePrintArea,
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
      workspacePrintArea,
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
    workspacePrintArea,
    rasterFit,
  );
}
