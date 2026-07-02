/**
 * Template Profile — 模板座標基準描述（純資料型別）。
 * 本模組不 import runtime；Profile 實例於後續 Step 建立。
 */

/** 模板畫布規格（PNG 像素空間） */
export interface TemplateProfileCanvas {
  widthPx: number;
  heightPx: number;
  format: "png";
  /** 例如 `/templates/adult-tshirt-{color}-{side}.png` */
  pathPattern: string;
}

/** 成衣剪影視覺基準（模板 PNG 上的衣身量測） */
export interface TemplateProfileGarment {
  /** 基準尺碼胸寬（cm）— 與 baseline 剪影對應 */
  baselineChestCm: number;
  /** 基準尺碼衣長（cm） */
  baselineLengthCm: number;
  /** 腋下胸寬（px @ baseline） */
  armpitChestWidthPx: number;
  /** 衣長 HPS→下擺（px @ baseline） */
  bodyLengthPx: number;
  /** 剪影 px/cm（armpitChestWidthPx ÷ baselineChestCm） */
  pxPerCm: number;
}

/** 印刷／設計 overlay 座標契約（layer cm、藍框、preview 換算） */
export interface TemplateProfilePrint {
  /** 標定胸寬參考線（px） */
  chestReferencePx: number;
  /** overlay 1 cm → px */
  pxPerCm: number;
  /** 設計器藍框最大印刷區（cm）— 依面別在 Profile 實例中填入 */
  maxPrintAreaCm: {
    front: { widthCm: number; heightCm: number };
    back: { widthCm: number; heightCm: number };
  };
  /** 工廠匯出固定印刷區（mm） */
  productionPrintAreaMm: {
    width_mm: number;
    height_mm: number;
  };
  /** 領口下緣至印刷區上緣（cm） */
  printAreaOffsetCm: {
    front: number;
    back: number;
  };
}

/** 領口錨點與印刷區上緣 offset（runtime 定位用） */
export interface TemplateProfileCollarSide {
  anchorYPx: number;
  printOffsetCm: number;
}

export interface TemplateProfileCollar {
  front: TemplateProfileCollarSide;
  back: TemplateProfileCollarSide;
}

/** 量測錨點與標定線（供校正、對照、debug） */
export interface TemplateProfileMeasurement {
  /** 領口錨點 Y（px @ baseline、scale=1） */
  collarAnchorYPx: {
    front: number;
    back: number;
  };
  /** Preview 標定胸寬線（% 或 px，依 Profile 實例約定） */
  calibrationLine: {
    leftXPx: number;
    rightXPx: number;
    yPx: number;
    chestPx: number;
  };
  /** 畫布中心（px） */
  containerCenterPx: {
    x: number;
    y: number;
  };
  /**
   * 衣服 PNG 視覺補償（僅 ShirtVisualScale；不影響印刷 overlay）。
   * 建議值 = print.chestReferencePx / garment.armpitChestWidthPx
   */
  silhouetteScale: number;
  /** 量測方法／來源備註（例如 legacy-concave、measure-template-calibration） */
  source?: string;
}

/** 單一模板產品的完整座標基準描述 */
export interface TemplateProfile {
  id: string;
  canvas: TemplateProfileCanvas;
  garment: TemplateProfileGarment;
  print: TemplateProfilePrint;
  collar: TemplateProfileCollar;
  measurement: TemplateProfileMeasurement;
}
