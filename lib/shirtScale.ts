import { type ApparelSize, toApparelSize } from "./sizes";

/** 尺碼僅影響 shirt 視覺縮放；不影響 print area / design layer */
export const SHIRT_SCALE = {
  XS: 0.9,
  S: 0.95,
  M: 1,
  L: 1.05,
  XL: 1.1,
  "2L": 1.1,
} as const satisfies Record<ApparelSize, number>;

export function getShirtScale(size: ApparelSize | string): number {
  return SHIRT_SCALE[toApparelSize(size)];
}

export function getShirtScaleTransform(size: ApparelSize | string): string {
  return `scale(${getShirtScale(size)})`;
}
