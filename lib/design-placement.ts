import { DESIGN_SAFE_MARGIN, DESIGN_WIDTH_TARGET_RATIO } from "./constants";
import type { PrintAreaBounds } from "./print-area";

/** 依 T-Shirt 印刷規格自動等比例置入設計區（含 5% 安全邊界、寬度優先 85%~90%） */
export function getAutoFitPlacement(
  imageWidth: number,
  imageHeight: number,
  printArea: PrintAreaBounds,
): { x: number; y: number; width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      width: 0,
      height: 0,
      x: printArea.width / 2,
      y: printArea.height / 2,
    };
  }

  const safeW = printArea.width * (1 - DESIGN_SAFE_MARGIN * 2);
  const safeH = printArea.height * (1 - DESIGN_SAFE_MARGIN * 2);
  const widthTarget = printArea.width * DESIGN_WIDTH_TARGET_RATIO;

  // 寬度優先填滿設計區 85%~90%
  let fitW = Math.min(widthTarget, safeW);
  let fitH = (imageHeight / imageWidth) * fitW;

  // 高度超出安全區時改依高度縮放
  if (fitH > safeH) {
    fitH = safeH;
    fitW = (imageWidth / imageHeight) * fitH;
  }

  // 確保不超出安全邊界
  fitW = Math.min(fitW, safeW);
  fitH = Math.min(fitH, safeH);

  return {
    width: fitW,
    height: fitH,
    x: (printArea.width - fitW) / 2,
    y: (printArea.height - fitH) / 2,
  };
}
