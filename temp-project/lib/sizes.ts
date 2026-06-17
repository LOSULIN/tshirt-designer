/**
 * 成人 T 恤尺寸表（純資料）
 * chest：胸寬（cm）；length：衣長（cm）
 */

export type ApparelSize = "XS" | "S" | "M" | "L" | "XL" | "2L";

export interface SizeMeasurement {
  size: ApparelSize;
  /** 胸寬（cm） */
  chestCm: number;
  /** 衣長（cm） */
  lengthCm: number;
}

export const APPAREL_SIZES: readonly ApparelSize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2L",
] as const;

export const ADULT_TSHIRT_SIZE_MEASUREMENTS: readonly SizeMeasurement[] = [
  { size: "XS", chestCm: 44, lengthCm: 60 },
  { size: "S", chestCm: 47, lengthCm: 65 },
  { size: "M", chestCm: 50, lengthCm: 68 },
  { size: "L", chestCm: 53, lengthCm: 71 },
  { size: "XL", chestCm: 56, lengthCm: 73 },
  { size: "2L", chestCm: 59, lengthCm: 75 },
] as const;

export const ADULT_TSHIRT_SIZE_BY_CODE: Record<
  ApparelSize,
  SizeMeasurement
> = Object.fromEntries(
  ADULT_TSHIRT_SIZE_MEASUREMENTS.map((entry) => [entry.size, entry]),
) as Record<ApparelSize, SizeMeasurement>;

export function getSizeMeasurement(size: ApparelSize): SizeMeasurement {
  return ADULT_TSHIRT_SIZE_BY_CODE[size];
}

export function isApparelSize(value: unknown): value is ApparelSize {
  return (
    typeof value === "string" &&
    APPAREL_SIZES.includes(value as ApparelSize)
  );
}

/** 舊代碼 `2XL` → 資料層 `2L` */
export function normalizeApparelSize(value: unknown): ApparelSize | null {
  if (value === "2XL") return "2L";
  return isApparelSize(value) ? value : null;
}

/** UI / 設計器 `Size` 轉資料層尺碼 */
export function toApparelSize(value: string): ApparelSize {
  return normalizeApparelSize(value) ?? "M";
}

/** 成衣展示寬高比（胸寬 / 衣長），用於 UI `aspect-ratio` */
export function getGarmentWidthOverHeight(size: ApparelSize): number {
  const { chestCm, lengthCm } = getSizeMeasurement(size);
  return chestCm / lengthCm;
}
