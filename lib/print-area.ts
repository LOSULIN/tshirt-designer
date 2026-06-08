import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DESIGN_SAFE_MARGIN,
  EXPORT_DPI,
  type Gender,
  type Side,
} from "./constants";

export interface PrintAreaConfigEntry {
  collarOffsetCm: number;
  printWidthCm: number;
  printHeightCm: number;
  safeWidthCm: number;
  safeHeightCm: number;
}

export interface PrintAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PrintAreaBounds = Pick<PrintAreaRect, "width" | "height">;

const ADULT_PRINT_WIDTH_CM = 32;
const ADULT_PRINT_HEIGHT_CM = 40;
const ADULT_SAFE_WIDTH_CM = 30;
const ADULT_SAFE_HEIGHT_CM = 38;
const FEMALE_SCALE = 0.88;

/** 畫布邏輯座標：成人男款 420 units = 32cm */
const CANVAS_UNITS_PER_CM = 420 / ADULT_PRINT_WIDTH_CM;
/** 領口偏移：成人男款 y = 300 = 6.5cm */
const CANVAS_COLLAR_UNITS_PER_CM = 300 / 6.5;

export function cmToExportPx(cm: number): number {
  return Math.round((cm / 2.54) * EXPORT_DPI);
}

export const PRINT_AREA_CONFIG: Record<Gender, PrintAreaConfigEntry> = {
  male: {
    collarOffsetCm: 6.5,
    printWidthCm: ADULT_PRINT_WIDTH_CM,
    printHeightCm: ADULT_PRINT_HEIGHT_CM,
    safeWidthCm: ADULT_SAFE_WIDTH_CM,
    safeHeightCm: ADULT_SAFE_HEIGHT_CM,
  },
  female: {
    collarOffsetCm: 6,
    printWidthCm: ADULT_PRINT_WIDTH_CM * FEMALE_SCALE,
    printHeightCm: ADULT_PRINT_HEIGHT_CM * FEMALE_SCALE,
    safeWidthCm: ADULT_SAFE_WIDTH_CM * FEMALE_SCALE,
    safeHeightCm: ADULT_SAFE_HEIGHT_CM * FEMALE_SCALE,
  },
  "child-male": {
    collarOffsetCm: 5,
    printWidthCm: 24,
    printHeightCm: 30,
    safeWidthCm: 24 * (ADULT_SAFE_WIDTH_CM / ADULT_PRINT_WIDTH_CM),
    safeHeightCm: 30 * (ADULT_SAFE_HEIGHT_CM / ADULT_PRINT_HEIGHT_CM),
  },
  "child-female": {
    collarOffsetCm: 5,
    printWidthCm: 24,
    printHeightCm: 30,
    safeWidthCm: 24 * (ADULT_SAFE_WIDTH_CM / ADULT_PRINT_WIDTH_CM),
    safeHeightCm: 30 * (ADULT_SAFE_HEIGHT_CM / ADULT_PRINT_HEIGHT_CM),
  },
};

export function getPrintAreaForGender(gender: Gender): PrintAreaRect {
  const config = PRINT_AREA_CONFIG[gender];
  const width = Math.round(config.printWidthCm * CANVAS_UNITS_PER_CM);
  const height = Math.round(config.printHeightCm * CANVAS_UNITS_PER_CM);
  const y = Math.round(config.collarOffsetCm * CANVAS_COLLAR_UNITS_PER_CM);

  return {
    x: (CANVAS_WIDTH - width) / 2,
    y,
    width,
    height,
  };
}

export function getSafePrintAreaForGender(gender: Gender): PrintAreaRect {
  const print = getPrintAreaForGender(gender);
  return {
    x: print.width * DESIGN_SAFE_MARGIN,
    y: print.height * DESIGN_SAFE_MARGIN,
    width: print.width * (1 - DESIGN_SAFE_MARGIN * 2),
    height: print.height * (1 - DESIGN_SAFE_MARGIN * 2),
  };
}

export function getExportDimensionsForGender(gender: Gender) {
  const config = PRINT_AREA_CONFIG[gender];
  return {
    width: cmToExportPx(config.printWidthCm),
    height: cmToExportPx(config.printHeightCm),
  };
}

export function getExportScaleForGender(gender: Gender) {
  const print = getPrintAreaForGender(gender);
  const exp = getExportDimensionsForGender(gender);
  return {
    scaleX: exp.width / print.width,
    scaleY: exp.height / print.height,
  };
}

export function getCanvasPrintAreaStyle(gender: Gender) {
  const print = getPrintAreaForGender(gender);
  return {
    left: `${(print.x / CANVAS_WIDTH) * 100}%`,
    top: `${(print.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(print.width / CANVAS_WIDTH) * 100}%`,
    height: `${(print.height / CANVAS_HEIGHT) * 100}%`,
  };
}

export function getFlatShirtPrintAreaStyle(gender: Gender, side: Side) {
  void side;
  const print = getPrintAreaForGender(gender);
  return {
    left: `${(print.x / CANVAS_WIDTH) * 100}%`,
    top: `${(print.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(print.width / CANVAS_WIDTH) * 100}%`,
  };
}

export function getExportMetaForGender(gender: Gender) {
  const { width, height } = getExportDimensionsForGender(gender);
  const config = PRINT_AREA_CONFIG[gender];
  return {
    format: "png" as const,
    width,
    height,
    dpi: EXPORT_DPI,
    background: "transparent" as const,
    printAreaCm: {
      width: config.printWidthCm,
      height: config.printHeightCm,
      collarOffset: config.collarOffsetCm,
      safeWidth: config.safeWidthCm,
      safeHeight: config.safeHeightCm,
    },
    designArea: {
      width,
      height,
      safeMargin: DESIGN_SAFE_MARGIN,
      widthTargetRatio: 0.875,
    },
  };
}
