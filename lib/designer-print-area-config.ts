/**
 * Designer Print Area Config — 設計器專用印刷區（依尺碼 × 面別）
 * ─────────────────────────────────────────────────────────
 * 與 Template Profile / Production / Export 分離；本步僅提供資料與查詢 API。
 * Blue = 最大可印刷區；Orange（Recommended）= 建議安全區。
 *
 * Front：DESIGNER_PRINT_AREA_ROWS
 * Back：DESIGNER_PRINT_AREA_ROWS_BACK（M 38×45 · Orange 32×42 對齊 Back Safe Zone）
 */

import type { ProductSizeCode } from "./product-size-config";
import { findProductSizeRow } from "./product-size-config";

export interface DesignerPrintAreaCm {
  widthCm: number;
  heightCm: number;
}

export interface DesignerPrintAreaRow {
  size: ProductSizeCode;
  blue: DesignerPrintAreaCm;
  recommended: DesignerPrintAreaCm;
}

/** 設計器尺碼 → Blue / Recommended 印刷區（cm） */
export const DESIGNER_PRINT_AREA_ROWS: readonly DesignerPrintAreaRow[] = [
  {
    size: "90",
    blue: { widthCm: 18, heightCm: 24 },
    recommended: { widthCm: 14, heightCm: 19 },
  },
  {
    size: "110",
    blue: { widthCm: 22, heightCm: 30 },
    recommended: { widthCm: 17, heightCm: 24 },
  },
  {
    size: "130",
    blue: { widthCm: 25, heightCm: 35 },
    recommended: { widthCm: 19, heightCm: 28 },
  },
  {
    size: "150",
    blue: { widthCm: 29, heightCm: 41 },
    recommended: { widthCm: 22, heightCm: 33 },
  },
  {
    size: "160",
    blue: { widthCm: 32, heightCm: 44 },
    recommended: { widthCm: 24, heightCm: 35 },
  },
  {
    size: "GS",
    blue: { widthCm: 29, heightCm: 41 },
    recommended: { widthCm: 22, heightCm: 33 },
  },
  {
    size: "GM",
    blue: { widthCm: 32, heightCm: 44 },
    recommended: { widthCm: 24, heightCm: 35 },
  },
  {
    size: "GL",
    blue: { widthCm: 35, heightCm: 46 },
    recommended: { widthCm: 26, heightCm: 37 },
  },
  {
    size: "S",
    blue: { widthCm: 35, heightCm: 46 },
    recommended: { widthCm: 26, heightCm: 37 },
  },
  {
    size: "M",
    blue: { widthCm: 35, heightCm: 50 },
    recommended: { widthCm: 26, heightCm: 40 },
  },
  {
    size: "L",
    blue: { widthCm: 38, heightCm: 52 },
    recommended: { widthCm: 29, heightCm: 42 },
  },
  {
    size: "XL",
    blue: { widthCm: 40, heightCm: 55 },
    recommended: { widthCm: 30, heightCm: 44 },
  },
  {
    size: "XXL",
    blue: { widthCm: 42, heightCm: 58 },
    recommended: { widthCm: 32, heightCm: 46 },
  },
  {
    size: "XXXL",
    blue: { widthCm: 45, heightCm: 60 },
    recommended: { widthCm: 34, heightCm: 48 },
  },
] as const;

/**
 * 背面設計器尺碼 → Blue / Recommended（cm）
 * M baseline：Template Profile + Factory Calibration 38×45；Orange = Back Safe Zone 32×42
 * 其他尺碼：自 M 等比縮放（與 Front 尺碼曲線平行）
 */
export const DESIGNER_PRINT_AREA_ROWS_BACK: readonly DesignerPrintAreaRow[] = [
  {
    size: "90",
    blue: { widthCm: 20, heightCm: 22 },
    recommended: { widthCm: 17, heightCm: 20 },
  },
  {
    size: "110",
    blue: { widthCm: 24, heightCm: 27 },
    recommended: { widthCm: 21, heightCm: 25 },
  },
  {
    size: "130",
    blue: { widthCm: 27, heightCm: 32 },
    recommended: { widthCm: 23, heightCm: 29 },
  },
  {
    size: "150",
    blue: { widthCm: 31, heightCm: 37 },
    recommended: { widthCm: 27, heightCm: 35 },
  },
  {
    size: "160",
    blue: { widthCm: 35, heightCm: 40 },
    recommended: { widthCm: 30, heightCm: 37 },
  },
  {
    size: "GS",
    blue: { widthCm: 31, heightCm: 37 },
    recommended: { widthCm: 27, heightCm: 35 },
  },
  {
    size: "GM",
    blue: { widthCm: 35, heightCm: 40 },
    recommended: { widthCm: 30, heightCm: 37 },
  },
  {
    size: "GL",
    blue: { widthCm: 38, heightCm: 41 },
    recommended: { widthCm: 32, heightCm: 39 },
  },
  {
    size: "S",
    blue: { widthCm: 38, heightCm: 41 },
    recommended: { widthCm: 29, heightCm: 40 },
  },
  {
    size: "M",
    blue: { widthCm: 38, heightCm: 45 },
    recommended: { widthCm: 32, heightCm: 42 },
  },
  {
    size: "L",
    blue: { widthCm: 41, heightCm: 47 },
    recommended: { widthCm: 35, heightCm: 45 },
  },
  {
    size: "XL",
    blue: { widthCm: 43, heightCm: 50 },
    recommended: { widthCm: 37, heightCm: 45 },
  },
  {
    size: "XXL",
    blue: { widthCm: 46, heightCm: 52 },
    recommended: { widthCm: 38, heightCm: 45 },
  },
  {
    size: "XXXL",
    blue: { widthCm: 49, heightCm: 54 },
    recommended: { widthCm: 42, heightCm: 50 },
  },
] as const;

export const DESIGNER_PRINT_AREA_SIZE_CODES: readonly ProductSizeCode[] =
  DESIGNER_PRINT_AREA_ROWS.map((row) => row.size);

const DESIGNER_PRINT_AREA_BY_SIZE: Record<
  ProductSizeCode,
  DesignerPrintAreaRow
> = Object.fromEntries(
  DESIGNER_PRINT_AREA_ROWS.map((row) => [row.size, row]),
) as Record<ProductSizeCode, DesignerPrintAreaRow>;

const DESIGNER_PRINT_AREA_BACK_BY_SIZE: Record<
  ProductSizeCode,
  DesignerPrintAreaRow
> = Object.fromEntries(
  DESIGNER_PRINT_AREA_ROWS_BACK.map((row) => [row.size, row]),
) as Record<ProductSizeCode, DesignerPrintAreaRow>;

const DEFAULT_DESIGNER_PRINT_AREA_SIZE: ProductSizeCode = "M";

function normalizeDesignerPrintAreaSize(size: string): ProductSizeCode | null {
  if (size === "2XL") return "XXL";
  const row = findProductSizeRow(size);
  if (row && row.size in DESIGNER_PRINT_AREA_BY_SIZE) {
    return row.size as ProductSizeCode;
  }
  return null;
}

function resolveDesignerPrintAreaRow(size: string): DesignerPrintAreaRow {
  const code =
    normalizeDesignerPrintAreaSize(size) ?? DEFAULT_DESIGNER_PRINT_AREA_SIZE;
  return DESIGNER_PRINT_AREA_BY_SIZE[code];
}

function resolveDesignerBackPrintAreaRow(size: string): DesignerPrintAreaRow {
  const code =
    normalizeDesignerPrintAreaSize(size) ?? DEFAULT_DESIGNER_PRINT_AREA_SIZE;
  return DESIGNER_PRINT_AREA_BACK_BY_SIZE[code];
}

/** 正面設計器藍框（最大可印刷區，cm） */
export function getDesignerBluePrintArea(size: string): DesignerPrintAreaCm {
  return { ...resolveDesignerPrintAreaRow(size).blue };
}

/** 正面設計器建議印刷區（橘框，cm） */
export function getDesignerRecommendedPrintArea(
  size: string,
): DesignerPrintAreaCm {
  return { ...resolveDesignerPrintAreaRow(size).recommended };
}

/** 背面設計器藍框（最大可印刷區，cm） */
export function getDesignerBackBluePrintArea(size: string): DesignerPrintAreaCm {
  return { ...resolveDesignerBackPrintAreaRow(size).blue };
}

/** 背面設計器建議印刷區（橘框，cm）— Back Safe Zone */
export function getDesignerBackRecommendedPrintArea(
  size: string,
): DesignerPrintAreaCm {
  return { ...resolveDesignerBackPrintAreaRow(size).recommended };
}

export function getDesignerPrintAreaRow(
  size: string,
): DesignerPrintAreaRow | null {
  const code = normalizeDesignerPrintAreaSize(size);
  return code ? DESIGNER_PRINT_AREA_BY_SIZE[code] : null;
}

export function getDesignerBackPrintAreaRow(
  size: string,
): DesignerPrintAreaRow | null {
  const code = normalizeDesignerPrintAreaSize(size);
  return code ? DESIGNER_PRINT_AREA_BACK_BY_SIZE[code] : null;
}
