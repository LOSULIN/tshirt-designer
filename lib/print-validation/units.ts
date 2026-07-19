/** Physical unit conversions — validation only; no render side effects. */

export const CM_PER_INCH = 2.54;
export const PT_PER_INCH = 72;
export const CM_PER_PT = CM_PER_INCH / PT_PER_INCH;
export const PT_PER_CM = PT_PER_INCH / CM_PER_INCH;
export const MM_PER_CM = 10;

export function cmToPt(cm: number): number {
  return cm * PT_PER_CM;
}

export function ptToCm(pt: number): number {
  return pt * CM_PER_PT;
}

export function cmToMm(cm: number): number {
  return cm * MM_PER_CM;
}

export function mmToCm(mm: number): number {
  return mm / MM_PER_CM;
}

export function formatPt(pt: number): string {
  return `${Math.round(pt * 10) / 10} pt`;
}

export function formatMm(mm: number): string {
  return `${Math.round(mm * 100) / 100} mm`;
}

export function formatCm(cm: number): string {
  return `${Math.round(cm * 100) / 100} cm`;
}
