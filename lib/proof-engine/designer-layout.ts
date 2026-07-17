/**
 * Designer Preview Layout — Factory Proof PDF 與 PreviewGarmentView 共用定位來源。
 * 僅供 PDF 渲染讀取；不修改 Designer UI、layer state 或 export 演算法。
 *
 * 層級（與 PreviewGarmentView 一致）：
 * ShirtContainerFrame → DesignerGarmentPresentation → PreviewGarmentVisual → shirt
 * 同層：Factory Overlay（print area）→ Artwork Stage
 */

import type { Side } from "../constants";
import { scaleGarmentY } from "../coordinates/garment";
import {
  getCollarAnchorYPx,
  getPrintAreaOffsetCm,
} from "../coordinates/print-area-offset";
import {
  getDesignerFactoryOverlayTemplatePx,
  getPreviewContainerWidthOverHeight,
} from "../coordinates/preview";
import {
  BACK_COLLAR_VISUAL_COMPENSATION_PX,
  getDesignerMockupVisualOffsetPx,
} from "../garment-template-calibration";
import {
  getPreviewGarmentVisualScale,
  PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE,
} from "../preview-runtime";
import { getRuntimeTemplateCanvas } from "../template-profile/runtime";
import type { PdfMockupContentAreaPt } from "./generators/pdf-mockup-layout";

/** @1024×1536 模板空間矩形（Y 自上而下） */
export interface DesignerLayoutRect {
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
}

/** Designer Preview 完整版面（模板像素空間） */
export interface DesignerPreviewLayout {
  side: Side;
  containerWidthPx: number;
  containerHeightPx: number;
  garmentVisualScale: number;
  shirtPresentationOffsetPx: { x: number; y: number };
  shirt: DesignerLayoutRect;
  printArea: DesignerLayoutRect;
  collarBottomPx: number;
  collarCenterXPx: number;
  printAreaOffsetCm: number;
}

/** PDF 渲染放置（點座標，Y 自下而上） */
export interface DesignerPdfRenderPlacement {
  contentArea: PdfMockupContentAreaPt;
  shirt: { x: number; y: number; widthPt: number; heightPt: number };
  printAreaLeftPt: number;
  printAreaBottomPt: number;
  printAreaTopPt: number;
  printAreaRenderWidthPt: number;
  printAreaRenderHeightPt: number;
  collarCenterPt: { x: number; y: number };
  templateToPtScale: number;
}

/** FlatShirtDesignView compact — 與 Designer 右側預覽外框一致 */
export const DESIGNER_PREVIEW_FIT_RATIO = 0.95;

/**
 * Factory Proof PDF — 領口定位線視覺基準校正（模板 px @ 1024×1536，Y 向下為正）。
 * 僅調整 PDF「領口下緣」標示線起點；不影響 Print Area、Artwork、Designer、Export。
 *
 * 未來 Hoodie / Polo / 童裝 / 女版可在此擴充面別或款式覆寫。
 */
export const PDF_COLLAR_ANCHOR_VISUAL_OFFSET_PX_BY_SIDE = {
  front: 0,
  /**
   * 背面羅紋下緣高於 COLLAR_ANCHOR_Y（見 garment-template-calibration）。
   * 負值 = 標示線上移，對齊真正後領下緣。
   */
  back: -BACK_COLLAR_VISUAL_COMPENSATION_PX,
} as const satisfies Record<Side, number>;

export function getPdfCollarAnchorVisualOffsetPx(side: Side): number {
  return PDF_COLLAR_ANCHOR_VISUAL_OFFSET_PX_BY_SIDE[side];
}

/** PDF 領口下緣 Y（模板空間，top-down）— 僅供定位線標示 */
function resolvePdfCollarBottomPx(
  side: Side,
  garmentVisualScale: number,
  containerHeight: number,
): number {
  const anchorY =
    getCollarAnchorYPx(side) + getPdfCollarAnchorVisualOffsetPx(side);
  return scaleGarmentY(anchorY, garmentVisualScale, containerHeight);
}

function scaleShirtRectFromContainerCenter(
  containerWidth: number,
  containerHeight: number,
  garmentVisualScale: number,
  presentationOffset: { x: number; y: number },
): DesignerLayoutRect {
  const widthPx = containerWidth * garmentVisualScale;
  const heightPx = containerHeight * garmentVisualScale;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  return {
    leftPx: centerX - widthPx / 2 + presentationOffset.x,
    topPx: centerY - heightPx / 2 + presentationOffset.y,
    widthPx,
    heightPx,
  };
}

/**
 * 解析 Designer Preview 版面 — 與 PreviewGarmentView 相同來源。
 * Print Area：`getDesignerFactoryOverlayTemplatePx(side, M)`（同 getPreviewArtworkStageStyle）
 */
export function resolveDesignerPreviewLayout(side: Side): DesignerPreviewLayout {
  const canvas = getRuntimeTemplateCanvas();
  const garmentVisualScale = getPreviewGarmentVisualScale();
  const shirtPresentationOffset = getDesignerMockupVisualOffsetPx(side);

  const factoryBlue = getDesignerFactoryOverlayTemplatePx(
    side,
    PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE,
  ).blue;

  const collarBottomPx = resolvePdfCollarBottomPx(
    side,
    garmentVisualScale,
    canvas.heightPx,
  );

  return {
    side,
    containerWidthPx: canvas.widthPx,
    containerHeightPx: canvas.heightPx,
    garmentVisualScale,
    shirtPresentationOffsetPx: shirtPresentationOffset,
    shirt: scaleShirtRectFromContainerCenter(
      canvas.widthPx,
      canvas.heightPx,
      garmentVisualScale,
      shirtPresentationOffset,
    ),
    printArea: {
      leftPx: factoryBlue.leftPx,
      topPx: factoryBlue.topPx,
      widthPx: factoryBlue.widthPx,
      heightPx: factoryBlue.heightPx,
    },
    collarBottomPx,
    collarCenterXPx: canvas.widthPx / 2,
    printAreaOffsetCm: getPrintAreaOffsetCm(side),
  };
}

/** Designer 預覽視口 — 固定 1024×1536 比例 */
export function getDesignerPreviewContentArea(
  panelArea: PdfMockupContentAreaPt,
  fitRatio: number = DESIGNER_PREVIEW_FIT_RATIO,
): PdfMockupContentAreaPt {
  const widthOverHeight = getPreviewContainerWidthOverHeight();
  const maxW = panelArea.maxWidthPt * fitRatio;
  const maxH = panelArea.maxHeightPt * fitRatio;
  const drawW = Math.min(maxW, maxH * widthOverHeight);
  const drawH = drawW / widthOverHeight;
  return {
    originX: panelArea.originX + (panelArea.maxWidthPt - drawW) / 2,
    originY: panelArea.originY + (panelArea.maxHeightPt - drawH) / 2,
    maxWidthPt: drawW,
    maxHeightPt: drawH,
  };
}

function templateTopDownRectToPdf(
  layout: DesignerPreviewLayout,
  viewport: PdfMockupContentAreaPt,
  rect: DesignerLayoutRect,
  scale: number,
): { x: number; y: number; widthPt: number; heightPt: number } {
  const x = viewport.originX + rect.leftPx * scale;
  const widthPt = rect.widthPx * scale;
  const heightPt = rect.heightPx * scale;
  const y =
    viewport.originY + viewport.maxHeightPt - (rect.topPx + rect.heightPx) * scale;
  return { x, y, widthPt, heightPt };
}

/** 模板像素 → PDF pt（均勻縮放，對齊 Designer 外框） */
export function mapDesignerLayoutToPdf(
  layout: DesignerPreviewLayout,
  panelArea: PdfMockupContentAreaPt,
): DesignerPdfRenderPlacement {
  const contentArea = getDesignerPreviewContentArea(panelArea);
  const scale = contentArea.maxWidthPt / layout.containerWidthPx;

  const shirt = templateTopDownRectToPdf(layout, contentArea, layout.shirt, scale);
  const printAreaPdf = templateTopDownRectToPdf(
    layout,
    contentArea,
    layout.printArea,
    scale,
  );

  const printAreaTopPt = printAreaPdf.y + printAreaPdf.heightPt;
  const collarCenterPt = {
    x: contentArea.originX + layout.collarCenterXPx * scale,
    y:
      contentArea.originY +
      contentArea.maxHeightPt -
      layout.collarBottomPx * scale,
  };

  return {
    contentArea,
    shirt,
    printAreaLeftPt: printAreaPdf.x,
    printAreaBottomPt: printAreaPdf.y,
    printAreaTopPt,
    printAreaRenderWidthPt: printAreaPdf.widthPt,
    printAreaRenderHeightPt: printAreaPdf.heightPt,
    collarCenterPt,
    templateToPtScale: scale,
  };
}
