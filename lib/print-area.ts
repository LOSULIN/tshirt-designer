import type { Side } from "./constants";
import {
  PRINT_AREA,
  PRINT_AREA_HEIGHT_CM,
  PRINT_AREA_WIDTH_CM,
  PRINT_COLLAR_OFFSET_CM,
  PRINT_REFERENCE,
  SHIRT_CONTAINER_HEIGHT,
  SHIRT_CONTAINER_WIDTH,
  UI_SCALE,
  cmToUiUnits,
  getFixedPrintAreaContainerPct,
  getFixedPrintAreaUiSize,
  getPrintAreaContainerStyle,
  getPrintAreaVisualAreaRatio,
  getPrintScale,
  getPrintScaleRankOrder,
  getShirtContainerAspectRatio,
  getShirtContainerWidthOverHeight,
  getBaselineNaturalPrintScale,
  getVisualPrintScale,
} from "./printArea";

export {
  PRINT_AREA,
  PRINT_AREA_WIDTH_CM,
  PRINT_AREA_HEIGHT_CM,
  PRINT_COLLAR_OFFSET_CM,
  PRINT_REFERENCE,
  SHIRT_CONTAINER_HEIGHT,
  SHIRT_CONTAINER_WIDTH,
  UI_SCALE,
  cmToUiUnits,
  getBaselineNaturalPrintScale,
  getFixedPrintAreaContainerPct,
  getFixedPrintAreaUiSize,
  getPrintAreaContainerStyle,
  getPrintAreaVisualAreaRatio,
  getPrintScale,
  getPrintScaleRankOrder,
  getShirtContainerAspectRatio,
  getShirtContainerWidthOverHeight,
  getVisualPrintScale,
  type PrintAreaContainerStyle,
  type PrintScale,
} from "./printArea";

export { type ApparelSize } from "./sizes";

const EXPORT_DPI = 300;

export const DESIGN_SAFE_MARGIN = 0.05;

/** 設計座標：1 單位 = 0.1 cm */
export const DESIGN_UNITS_PER_CM = 10;

export interface PrintAreaBounds {
  width: number;
  height: number;
}

export const ADULT_UNISEX_PRINT_SPEC = {
  printWidthCm: PRINT_AREA_WIDTH_CM,
  printHeightCm: PRINT_AREA_HEIGHT_CM,
  safeWidthCm: 33,
  safeHeightCm: 48,
  frontCollarOffsetCm: PRINT_COLLAR_OFFSET_CM.front,
  backCollarOffsetCm: PRINT_COLLAR_OFFSET_CM.back,
} as const;

export const ADULT_UNISEX_PRINT_BOUNDS: PrintAreaBounds = {
  width: cmToDesignUnits(PRINT_AREA_WIDTH_CM),
  height: cmToDesignUnits(PRINT_AREA_HEIGHT_CM),
};

/** 舊版 1024×1536 畫布推導的圖層座標空間（僅供遷移） */
export const LEGACY_CANVAS_PRINT_BOUNDS: PrintAreaBounds = {
  width: 420,
  height: 480,
};

export function cmToDesignUnits(cm: number): number {
  return cm * DESIGN_UNITS_PER_CM;
}

export function designUnitsToCm(units: number): number {
  return units / DESIGN_UNITS_PER_CM;
}

export function cmToExportPx(cm: number): number {
  return Math.round(cm * (EXPORT_DPI / 2.54));
}

export function getGridSizeDesignUnits(gridSizeCm = 2.5): number {
  return cmToDesignUnits(gridSizeCm);
}

export function getPrintAreaBounds(): PrintAreaBounds {
  return ADULT_UNISEX_PRINT_BOUNDS;
}

export function getExportDimensions() {
  return {
    width: cmToExportPx(PRINT_AREA_WIDTH_CM),
    height: cmToExportPx(PRINT_AREA_HEIGHT_CM),
  };
}

export function getExportScale() {
  const print = getPrintAreaBounds();
  const exp = getExportDimensions();
  return {
    scaleX: exp.width / print.width,
    scaleY: exp.height / print.height,
  };
}

export function getSafePrintAreaBounds(): PrintAreaBounds {
  const print = getPrintAreaBounds();
  const inset = DESIGN_SAFE_MARGIN;
  return {
    width: print.width * (1 - inset * 2),
    height: print.height * (1 - inset * 2),
  };
}

export function getExportMeta(side: Side = "front") {
  const { width, height } = getExportDimensions();
  return {
    format: "png" as const,
    width,
    height,
    dpi: EXPORT_DPI,
    background: "transparent" as const,
    printAreaCm: {
      width: ADULT_UNISEX_PRINT_SPEC.printWidthCm,
      height: ADULT_UNISEX_PRINT_SPEC.printHeightCm,
      collarOffset:
        side === "front"
          ? ADULT_UNISEX_PRINT_SPEC.frontCollarOffsetCm
          : ADULT_UNISEX_PRINT_SPEC.backCollarOffsetCm,
      safeWidth: ADULT_UNISEX_PRINT_SPEC.safeWidthCm,
      safeHeight: ADULT_UNISEX_PRINT_SPEC.safeHeightCm,
    },
    designArea: {
      width,
      height,
      safeMargin: DESIGN_SAFE_MARGIN,
      widthTargetRatio: 0.875,
      designUnitsPerCm: DESIGN_UNITS_PER_CM,
      designBounds: getPrintAreaBounds(),
    },
  };
}

export function layersUseLegacyCanvasUnits(layers: readonly unknown[]): boolean {
  if (layers.length === 0) return false;
  const bounds = getPrintAreaBounds();
  return layers.some((raw) => {
    const layer = raw as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      scale?: number;
    };
    if (
      layer.x == null ||
      layer.y == null ||
      layer.width == null ||
      layer.height == null
    ) {
      return false;
    }
    const scale = layer.scale ?? 1;
    const scaledW = layer.width * scale;
    const scaledH = layer.height * scale;
    return (
      layer.x + scaledW > bounds.width + 1 ||
      layer.y + scaledH > bounds.height + 1 ||
      layer.width > bounds.width + 1
    );
  });
}

export function migrateLayersFromLegacyCanvasUnits(
  layers: readonly unknown[],
): unknown[] {
  if (!layersUseLegacyCanvasUnits(layers)) return [...layers];

  const bounds = getPrintAreaBounds();
  const sx = bounds.width / LEGACY_CANVAS_PRINT_BOUNDS.width;
  const sy = bounds.height / LEGACY_CANVAS_PRINT_BOUNDS.height;

  return layers.map((raw) => {
    const layer = raw as {
      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
      fontSize?: number;
    };
    return {
      ...(raw as object),
      x: layer.x * sx,
      y: layer.y * sy,
      width: layer.width * sx,
      height: layer.height * sy,
      ...(typeof layer.fontSize === "number"
        ? { fontSize: layer.fontSize * sy }
        : {}),
    };
  });
}

export const DESIGN_AREA_WIDTH = getExportDimensions().width;
export const DESIGN_AREA_HEIGHT = getExportDimensions().height;
