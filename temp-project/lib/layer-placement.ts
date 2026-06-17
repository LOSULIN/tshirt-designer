import type { PrintAreaCmBounds } from "./design-cm";
import { fitLayerTransform } from "./geometry";

/** 新圖層錯開放置，避免全部堆在印刷區中央 */
export function getStaggeredPlacement(
  printArea: PrintAreaCmBounds,
  width_cm: number,
  height_cm: number,
  existingCount: number,
): { x_cm: number; y_cm: number } {
  const centerX = (printArea.width - width_cm) / 2;
  const centerY = (printArea.height - height_cm) / 2;

  if (existingCount <= 0) {
    return { x_cm: centerX, y_cm: centerY };
  }

  const stepCm = 2.2;
  const ring = Math.ceil(existingCount / 6);
  const slot = (existingCount - 1) % 6;
  const angle = (slot / 6) * Math.PI * 2 + ring * 0.35;
  const radius = ring * stepCm;

  const fitted = fitLayerTransform(
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius,
    width_cm,
    height_cm,
    1,
    0,
    printArea,
  );

  return { x_cm: fitted.x, y_cm: fitted.y };
}
