import { DESIGN_SAFE_MARGIN, DESIGN_WIDTH_TARGET_RATIO } from "./constants";
import type { PrintAreaCmBounds } from "./design-cm";
import { fitLayerTransform } from "./geometry";

/** 依 T-Shirt 印刷規格自動等比例置入設計區（cm，含 5% 安全邊界） */
export function getAutoFitPlacement(
  imageWidth: number,
  imageHeight: number,
  printArea: PrintAreaCmBounds,
): { x_cm: number; y_cm: number; width_cm: number; height_cm: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      width_cm: 0,
      height_cm: 0,
      x_cm: printArea.width / 2,
      y_cm: printArea.height / 2,
    };
  }

  const safeW = printArea.width * (1 - DESIGN_SAFE_MARGIN * 2);
  const safeH = printArea.height * (1 - DESIGN_SAFE_MARGIN * 2);
  const widthTarget = printArea.width * DESIGN_WIDTH_TARGET_RATIO;

  let fitW = Math.min(widthTarget, safeW);
  let fitH = (imageHeight / imageWidth) * fitW;

  if (fitH > safeH) {
    fitH = safeH;
    fitW = (imageWidth / imageHeight) * fitH;
  }

  fitW = Math.min(fitW, safeW);
  fitH = Math.min(fitH, safeH);

  const centered = fitLayerTransform(
    (printArea.width - fitW) / 2,
    (printArea.height - fitH) / 2,
    fitW,
    fitH,
    1,
    0,
    printArea,
  );

  return {
    width_cm: fitW,
    height_cm: fitH,
    x_cm: centered.x,
    y_cm: centered.y,
  };
}
