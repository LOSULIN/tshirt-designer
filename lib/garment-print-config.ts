/**
 * Garment Print Config — 建議印刷安全區（依尺碼 × 面別）
 * ─────────────────────────────────────────────────────────
 * 設計器橘色 Guide 與藍框尺寸資料來源；匯出仍走 production。
 * 與 production 固定印刷區（35×50 cm）及現有 safe margin 分離。
 */

import type { Side } from "./constants";
import { findProductSizeRow } from "./product-size-config";
import type { ApparelSize } from "./sizes";
import { APPAREL_SIZES, toApparelSize } from "./sizes";

/** 官方成人 M 胸寬；橘框比例縮放基準 */
const BASELINE_CHEST_CM = findProductSizeRow("M")?.chest ?? 52;

/** 最大可印刷區（cm）— 設計器藍框；匯出仍走 production 35×50 */
export interface GarmentMaxPrintAreaCm {
  widthCm: number;
  heightCm: number;
}

/** 建議可印刷安全區（cm）— 設計器橘色 Guide */
export interface GarmentPrintSafeZoneCm {
  safeWidthCm: number;
  safeHeightCm: number;
}

/** 設計器藍框：正面 35×50、背面 38×45 */
export const GARMENT_MAX_PRINT_AREA_CM: Record<Side, GarmentMaxPrintAreaCm> = {
  front: { widthCm: 35, heightCm: 50 },
  back: { widthCm: 38, heightCm: 45 },
} as const;

export type GarmentPrintSafeZoneBySize = Record<
  ApparelSize,
  GarmentPrintSafeZoneCm
>;

export type GarmentPrintSafeZoneBySide = Record<Side, GarmentPrintSafeZoneBySize>;

/** 正面建議印刷安全區 */
export const GARMENT_PRINT_SAFE_ZONE_CM_FRONT: GarmentPrintSafeZoneBySize = {
  XS: { safeWidthCm: 20, safeHeightCm: 38 },
  S: { safeWidthCm: 23, safeHeightCm: 40 },
  M: { safeWidthCm: 26, safeHeightCm: 40 },
  L: { safeWidthCm: 29, safeHeightCm: 42 },
  XL: { safeWidthCm: 32, safeHeightCm: 45 },
  "2L": { safeWidthCm: 35, safeHeightCm: 45 },
} as const;

/** 背面建議印刷安全區 */
export const GARMENT_PRINT_SAFE_ZONE_CM_BACK: GarmentPrintSafeZoneBySize = {
  XS: { safeWidthCm: 26, safeHeightCm: 38 },
  S: { safeWidthCm: 29, safeHeightCm: 40 },
  M: { safeWidthCm: 32, safeHeightCm: 42 },
  L: { safeWidthCm: 35, safeHeightCm: 45 },
  XL: { safeWidthCm: 37, safeHeightCm: 45 },
  "2L": { safeWidthCm: 38, safeHeightCm: 45 },
} as const;

/** 面別 → 尺碼 → 建議安全區 */
export const GARMENT_PRINT_SAFE_ZONE_CM: GarmentPrintSafeZoneBySide = {
  front: GARMENT_PRINT_SAFE_ZONE_CM_FRONT,
  back: GARMENT_PRINT_SAFE_ZONE_CM_BACK,
} as const;

export function getGarmentMaxPrintAreaCm(side: Side): GarmentMaxPrintAreaCm {
  return GARMENT_MAX_PRINT_AREA_CM[side];
}

export function getGarmentPrintSafeZoneCm(
  side: Side,
  size: ApparelSize,
): GarmentPrintSafeZoneCm {
  return GARMENT_PRINT_SAFE_ZONE_CM[side][size];
}

function findProductSizeRowForSafeZone(size: string) {
  const direct = findProductSizeRow(size);
  if (direct) return direct;
  if (size === "2XL") return findProductSizeRow("XXL");
  return null;
}

function scaleSafeZoneFromOfficialChest(
  side: Side,
  chestCm: number,
): GarmentPrintSafeZoneCm {
  const base = GARMENT_PRINT_SAFE_ZONE_CM[side].M;
  const ratio = chestCm / BASELINE_CHEST_CM;
  return {
    safeWidthCm: base.safeWidthCm * ratio,
    safeHeightCm: base.safeHeightCm * ratio,
  };
}

/** 接受 UI `Size` 或 `2XL` 別名 */
export function getGarmentPrintSafeZoneCmForSize(
  side: Side,
  size: ApparelSize | string,
): GarmentPrintSafeZoneCm {
  const productRow = findProductSizeRowForSafeZone(size);
  if (productRow) {
    return scaleSafeZoneFromOfficialChest(side, productRow.chest);
  }
  return getGarmentPrintSafeZoneCm(side, toApparelSize(size));
}

export function listGarmentPrintSafeZoneEntries(
  side: Side,
): Array<{ size: ApparelSize; zone: GarmentPrintSafeZoneCm }> {
  return APPAREL_SIZES.map((size) => ({
    size,
    zone: GARMENT_PRINT_SAFE_ZONE_CM[side][size],
  }));
}

/** Garment Info 顯示：建議區在尺碼可印刷區內縮 5% */
const GARMENT_RECOMMENDED_PRINT_DISPLAY_INSET = 0.05;

export interface GarmentRecommendedPrintDisplayCm {
  widthCm: number;
  heightCm: number;
}

/** Garment Info「建議印製區域」顯示尺寸（僅 UI，不影響 Canvas／匯出） */
export function getGarmentRecommendedPrintDisplayCm(
  side: Side,
  size: ApparelSize | string,
): GarmentRecommendedPrintDisplayCm {
  const zone = getGarmentPrintSafeZoneCmForSize(side, size);
  const scale = 1 - GARMENT_RECOMMENDED_PRINT_DISPLAY_INSET;
  return {
    widthCm: zone.safeWidthCm * scale,
    heightCm: zone.safeHeightCm * scale,
  };
}
