/**
 * Source:
 * TIIIGO official size chart
 *
 * 此檔案為商品尺寸主要資料來源。
 * 尺寸計算與顯示應優先使用此資料。
 *
 * TIIIGO 商品尺寸資料層（新版）
 * ─────────────────────────────
 * 與既有 `lib/sizes.ts` 並存；本檔僅供新版尺寸表讀取，不取代現行設計器邏輯。
 * 單位：公分（cm），平量。
 */

export const PRODUCT_SIZE_CONFIG_SOURCE = "TIIIGO 官方尺寸表" as const;

export type ProductSizeLineId = "children" | "fit" | "adult-standard";

/** 兒童款尺碼（身高號） */
export type ChildrenSizeCode = "90" | "110" | "130" | "150" | "160";

/** 合身版尺碼 */
export type FitSizeCode = "GS" | "GM" | "GL";

/** 成人標準版尺碼 */
export type AdultStandardSizeCode = "S" | "M" | "L" | "XL" | "XXL" | "XXXL";

export interface GarmentSizeMeasurement {
  /** 衣長（cm） */
  length: number;
  /** 胸寬（cm） */
  chest: number;
  /** 肩寬（cm） */
  shoulder: number;
  /** 袖長（cm） */
  sleeve: number;
  /** 建議身高（cm 區間） */
  height: string;
}

export interface ChildrenSizeRow extends GarmentSizeMeasurement {
  size: ChildrenSizeCode;
}

export interface FitSizeRow extends GarmentSizeMeasurement {
  size: FitSizeCode;
}

export interface AdultStandardSizeRow extends GarmentSizeMeasurement {
  size: AdultStandardSizeCode;
}

export interface ProductSizeLineMeta {
  id: ProductSizeLineId;
  label: string;
}

export const PRODUCT_SIZE_LINES: readonly ProductSizeLineMeta[] = [
  { id: "children", label: "兒童款" },
  { id: "fit", label: "合身版 Fit" },
  { id: "adult-standard", label: "成人標準版" },
] as const;

/** 兒童款：90 / 110 / 130 / 150 / 160 */
export const CHILDREN_SIZE_ROWS: readonly ChildrenSizeRow[] = [
  {
    size: "90",
    length: 36,
    chest: 29,
    shoulder: 24,
    sleeve: 11,
    height: "85-95",
  },
  {
    size: "110",
    length: 44,
    chest: 33,
    shoulder: 30,
    sleeve: 13,
    height: "95-115",
  },
  {
    size: "130",
    length: 51,
    chest: 37,
    shoulder: 34,
    sleeve: 15,
    height: "115-135",
  },
  {
    size: "150",
    length: 59,
    chest: 43,
    shoulder: 38,
    sleeve: 17,
    height: "135-155",
  },
  {
    size: "160",
    length: 62,
    chest: 46,
    shoulder: 40,
    sleeve: 18,
    height: "155-165",
  },
] as const;

/** 合身版：GS / GM / GL */
export const FIT_SIZE_ROWS: readonly FitSizeRow[] = [
  {
    size: "GS",
    length: 59,
    chest: 43,
    shoulder: 36,
    sleeve: 16,
    height: "153-160",
  },
  {
    size: "GM",
    length: 62,
    chest: 46,
    shoulder: 39,
    sleeve: 17,
    height: "153-160",
  },
  {
    size: "GL",
    length: 65,
    chest: 49,
    shoulder: 42,
    sleeve: 18,
    height: "159-166",
  },
] as const;

/** 成人標準版：S / M / L / XL / XXL / XXXL */
export const ADULT_STANDARD_SIZE_ROWS: readonly AdultStandardSizeRow[] = [
  {
    size: "S",
    length: 65,
    chest: 49,
    shoulder: 42,
    sleeve: 19,
    height: "155-165",
  },
  {
    size: "M",
    length: 69,
    chest: 52,
    shoulder: 46,
    sleeve: 20,
    height: "165-175",
  },
  {
    size: "L",
    length: 73,
    chest: 55,
    shoulder: 50,
    sleeve: 22,
    height: "175-185",
  },
  {
    size: "XL",
    length: 77,
    chest: 58,
    shoulder: 54,
    sleeve: 24,
    height: "175-185",
  },
  {
    size: "XXL",
    length: 81,
    chest: 63,
    shoulder: 57,
    sleeve: 25,
    height: "180-190",
  },
  {
    size: "XXXL",
    length: 84,
    chest: 68,
    shoulder: 60,
    sleeve: 26,
    height: "180-195",
  },
] as const;

export const CHILDREN_SIZE_CODES: readonly ChildrenSizeCode[] =
  CHILDREN_SIZE_ROWS.map((row) => row.size);

export const FIT_SIZE_CODES: readonly FitSizeCode[] = FIT_SIZE_ROWS.map(
  (row) => row.size,
);

export const ADULT_STANDARD_SIZE_CODES: readonly AdultStandardSizeCode[] =
  ADULT_STANDARD_SIZE_ROWS.map((row) => row.size);

const CHILDREN_SIZE_BY_CODE: Record<ChildrenSizeCode, ChildrenSizeRow> =
  Object.fromEntries(CHILDREN_SIZE_ROWS.map((row) => [row.size, row])) as Record<
    ChildrenSizeCode,
    ChildrenSizeRow
  >;

const FIT_SIZE_BY_CODE: Record<FitSizeCode, FitSizeRow> = Object.fromEntries(
  FIT_SIZE_ROWS.map((row) => [row.size, row]),
) as Record<FitSizeCode, FitSizeRow>;

const ADULT_STANDARD_SIZE_BY_CODE: Record<
  AdultStandardSizeCode,
  AdultStandardSizeRow
> = Object.fromEntries(
  ADULT_STANDARD_SIZE_ROWS.map((row) => [row.size, row]),
) as Record<AdultStandardSizeCode, AdultStandardSizeRow>;

export function isChildrenSizeCode(value: unknown): value is ChildrenSizeCode {
  return (
    typeof value === "string" &&
    CHILDREN_SIZE_CODES.includes(value as ChildrenSizeCode)
  );
}

export function isFitSizeCode(value: unknown): value is FitSizeCode {
  return (
    typeof value === "string" && FIT_SIZE_CODES.includes(value as FitSizeCode)
  );
}

export function isAdultStandardSizeCode(
  value: unknown,
): value is AdultStandardSizeCode {
  return (
    typeof value === "string" &&
    ADULT_STANDARD_SIZE_CODES.includes(value as AdultStandardSizeCode)
  );
}

export function getChildrenSizeRow(size: ChildrenSizeCode): ChildrenSizeRow {
  return CHILDREN_SIZE_BY_CODE[size];
}

export function getFitSizeRow(size: FitSizeCode): FitSizeRow {
  return FIT_SIZE_BY_CODE[size];
}

export function getAdultStandardSizeRow(
  size: AdultStandardSizeCode,
): AdultStandardSizeRow {
  return ADULT_STANDARD_SIZE_BY_CODE[size];
}

export function getProductSizeRows(
  line: "children",
): readonly ChildrenSizeRow[];
export function getProductSizeRows(line: "fit"): readonly FitSizeRow[];
export function getProductSizeRows(
  line: "adult-standard",
): readonly AdultStandardSizeRow[];
export function getProductSizeRows(line: ProductSizeLineId) {
  switch (line) {
    case "children":
      return CHILDREN_SIZE_ROWS;
    case "fit":
      return FIT_SIZE_ROWS;
    case "adult-standard":
      return ADULT_STANDARD_SIZE_ROWS;
  }
}

export type ProductSizeCode =
  | ChildrenSizeCode
  | FitSizeCode
  | AdultStandardSizeCode;

export type ProductSizeRow =
  | ChildrenSizeRow
  | FitSizeRow
  | AdultStandardSizeRow;

/** 依尺碼代碼查詢官方尺寸列（新版 UI 顯示用） */
export function findProductSizeRow(sizeCode: string): ProductSizeRow | null {
  if (isChildrenSizeCode(sizeCode)) return getChildrenSizeRow(sizeCode);
  if (isFitSizeCode(sizeCode)) return getFitSizeRow(sizeCode);
  if (isAdultStandardSizeCode(sizeCode)) {
    return getAdultStandardSizeRow(sizeCode);
  }
  return null;
}
