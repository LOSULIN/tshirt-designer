/** 快速旋轉：0–360° 正規化 */
export function normalizeRotationDegrees0To360(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

/** 順時針 90°（右轉 ⟳） */
export function rotateClockwise90(rotation: number): number {
  return (normalizeRotationDegrees0To360(rotation) + 90) % 360;
}

/** 逆時針 90°（左轉 ⟲） */
export function rotateCounterClockwise90(rotation: number): number {
  return (normalizeRotationDegrees0To360(rotation) - 90 + 360) % 360;
}
