import { findProductSizeRow } from "./product-size-config";
import {
  APPAREL_SIZES,
  type ApparelSize,
  getSizeMeasurement,
  toApparelSize,
} from "./sizes";

/** 視覺縮放基準尺碼（scale = 1.0） */
export const GARMENT_SCALE_BASELINE_SIZE: ApparelSize = "M";

const LEGACY_BASELINE_CHEST_CM =
  getSizeMeasurement(GARMENT_SCALE_BASELINE_SIZE).chestCm;

/** 官方成人 M 胸寬；新版比例計算基準 */
export const BASELINE_CHEST_CM =
  findProductSizeRow("M")?.chest ?? LEGACY_BASELINE_CHEST_CM;

function buildShirtScaleFromChest(): Record<ApparelSize, number> {
  return Object.fromEntries(
    APPAREL_SIZES.map((size) => {
      const chestCm = getSizeMeasurement(size).chestCm;
      return [size, chestCm / LEGACY_BASELINE_CHEST_CM] as const;
    }),
  ) as Record<ApparelSize, number>;
}

/** 尺碼僅影響 shirt 視覺縮放；不影響 print area / design layer */
export const SHIRT_SCALE: Record<ApparelSize, number> =
  buildShirtScaleFromChest();

function findProductSizeRowForScale(size: string) {
  const direct = findProductSizeRow(size);
  if (direct) return direct;
  if (size === "2XL") return findProductSizeRow("XXL");
  return null;
}

export function getShirtScale(size: ApparelSize | string): number {
  const productRow = findProductSizeRowForScale(size);
  if (productRow) {
    return productRow.chest / BASELINE_CHEST_CM;
  }
  return SHIRT_SCALE[toApparelSize(size)];
}

export function getShirtScaleTransform(size: ApparelSize | string): string {
  return `scale(${getShirtScale(size)})`;
}

/** console.debug：單一尺碼的胸寬與 scale */
export function debugGarmentScale(size: ApparelSize | string): void {
  const productRow = findProductSizeRowForScale(size);
  const apparelSize = toApparelSize(size);
  const chestCm = productRow?.chest ?? getSizeMeasurement(apparelSize).chestCm;
  const scale = getShirtScale(size);
  console.debug(
    `[Garment Scale] Size: ${size}, Chest Width: ${chestCm}cm, Scale: ${scale}`,
  );
}

/** console.debug：全尺碼 scale 表（由胸寬推導） */
export function debugGarmentScaleTable(): void {
  console.debug(
    `[Garment Scale] Baseline: ${GARMENT_SCALE_BASELINE_SIZE} (${BASELINE_CHEST_CM}cm chest = 1.0)`,
  );
  for (const size of APPAREL_SIZES) {
    debugGarmentScale(size);
  }
}

debugGarmentScaleTable();
