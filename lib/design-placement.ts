import {
  DESIGN_SAFE_MARGIN,
  DESIGN_WIDTH_TARGET_RATIO,
  PRINT_AREA,
} from "./constants";

/** 依 T-Shirt 印刷規格自動等比例置入設計區（含 5% 安全邊界、寬度優先 85%~90%） */
export function getAutoFitPlacement(
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      width: 0,
      height: 0,
      x: PRINT_AREA.width / 2,
      y: PRINT_AREA.height / 2,
    };
  }

  const safeW = PRINT_AREA.width * (1 - DESIGN_SAFE_MARGIN * 2);
  const safeH = PRINT_AREA.height * (1 - DESIGN_SAFE_MARGIN * 2);
  const widthTarget = PRINT_AREA.width * DESIGN_WIDTH_TARGET_RATIO;

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
    x: (PRINT_AREA.width - fitW) / 2,
    y: (PRINT_AREA.height - fitH) / 2,
  };
}
