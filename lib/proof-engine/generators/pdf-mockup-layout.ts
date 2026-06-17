/**
 * PDF 校稿 Mockup 放置 — 與 Mockup PNG Export 相同像素比例、完整顯示（contain）。
 */

import type { Side } from "../../constants";
import { getDesignerPrintAreaCmBounds } from "../../design-cm";
import {
  getFlatMockupPrintAreaRectPx,
  MOCKUP_EXPORT_SCALE,
  MOCKUP_FLAT_CONTAINER,
} from "../../coordinates/mockup";
import { COLLAR_ANCHOR_Y_PX_BY_SIDE } from "../../coordinates/print-area-offset";

export interface PdfMockupContentAreaPt {
  originX: number;
  originY: number;
  maxWidthPt: number;
  maxHeightPt: number;
}

export type PdfMockupFitMode = "contain";

export interface PdfMockupPlacement {
  x: number;
  y: number;
  drawWidthPt: number;
  drawHeightPt: number;
  scale: number;
  fitMode: PdfMockupFitMode;
  mockupOriginalWidthPx: number;
  mockupOriginalHeightPx: number;
  embeddedWidthPx: number | null;
  embeddedHeightPx: number | null;
  printAreaWidthCm: number;
  printAreaHeightCm: number;
  printAreaRenderWidthPt: number;
  printAreaRenderHeightPt: number;
  printAreaLeftPt: number;
  printAreaBottomPt: number;
  printAreaTopPt: number;
  collarCenterPt: { x: number; y: number };
  contentOriginX: number;
  contentOriginY: number;
  contentWidthPt: number;
  contentHeightPt: number;
}

export function getCanonicalMockupExportPx(): {
  widthPx: number;
  heightPx: number;
} {
  return {
    widthPx: MOCKUP_FLAT_CONTAINER.width * MOCKUP_EXPORT_SCALE,
    heightPx: MOCKUP_FLAT_CONTAINER.height * MOCKUP_EXPORT_SCALE,
  };
}

/** 與 mockup-export 相同之匯出印刷區（基準畫布 × exportScale） */
function getMockupPngPrintAreaRectPx(side: Side) {
  const base = getFlatMockupPrintAreaRectPx(
    MOCKUP_FLAT_CONTAINER.width,
    MOCKUP_FLAT_CONTAINER.height,
    side,
  );
  return {
    left: base.left * MOCKUP_EXPORT_SCALE,
    top: base.top * MOCKUP_EXPORT_SCALE,
    width: base.width * MOCKUP_EXPORT_SCALE,
    height: base.height * MOCKUP_EXPORT_SCALE,
  };
}

/**
 * Mockup PNG → PDF pt：uniform contain，完整顯示、保留 overlay 比例。
 */
export function computePdfMockupPlacement(
  side: Side,
  contentArea: PdfMockupContentAreaPt,
  embeddedImageSize?: { width: number; height: number },
): PdfMockupPlacement {
  const { widthPx: mockupW, heightPx: mockupH } = getCanonicalMockupExportPx();

  const scaleX = contentArea.maxWidthPt / mockupW;
  const scaleY = contentArea.maxHeightPt / mockupH;
  const scale = Math.min(scaleX, scaleY);
  const drawW = mockupW * scale;
  const drawH = mockupH * scale;

  const x = contentArea.originX + (contentArea.maxWidthPt - drawW) / 2;
  const y = contentArea.originY + (contentArea.maxHeightPt - drawH) / 2;

  const printAreaCm = getDesignerPrintAreaCmBounds(side);
  const printRectPx = getMockupPngPrintAreaRectPx(side);

  const normLeft = printRectPx.left / mockupW;
  const normTop = printRectPx.top / mockupH;
  const normW = printRectPx.width / mockupW;
  const normH = printRectPx.height / mockupH;

  const printAreaLeftPt = x + normLeft * drawW;
  const printAreaBottomPt = y + drawH - (normTop + normH) * drawH;
  const printAreaWidthPt = normW * drawW;
  const printAreaHeightPt = normH * drawH;
  const printAreaTopPt = printAreaBottomPt + printAreaHeightPt;

  const collarYpx = COLLAR_ANCHOR_Y_PX_BY_SIDE[side] * MOCKUP_EXPORT_SCALE;
  const collarCenterPt = {
    x: x + drawW / 2,
    y: y + drawH - (collarYpx / mockupH) * drawH,
  };

  return {
    x,
    y,
    drawWidthPt: drawW,
    drawHeightPt: drawH,
    scale,
    fitMode: "contain",
    mockupOriginalWidthPx: mockupW,
    mockupOriginalHeightPx: mockupH,
    embeddedWidthPx: embeddedImageSize?.width ?? null,
    embeddedHeightPx: embeddedImageSize?.height ?? null,
    printAreaWidthCm: printAreaCm.width,
    printAreaHeightCm: printAreaCm.height,
    printAreaRenderWidthPt: printAreaWidthPt,
    printAreaRenderHeightPt: printAreaHeightPt,
    printAreaLeftPt,
    printAreaBottomPt,
    printAreaTopPt,
    collarCenterPt,
    contentOriginX: contentArea.originX,
    contentOriginY: contentArea.originY,
    contentWidthPt: contentArea.maxWidthPt,
    contentHeightPt: contentArea.maxHeightPt,
  };
}

export function logPdfMockupPlacementDebug(
  side: Side,
  placement: PdfMockupPlacement,
): void {
  if (typeof console === "undefined") return;

  console.group(`[PDF Mockup Debug] ${side}`);
  console.log("Mockup:", {
    originalWidth: placement.mockupOriginalWidthPx,
    originalHeight: placement.mockupOriginalHeightPx,
    placedWidth: Math.round(placement.drawWidthPt * 100) / 100,
    placedHeight: Math.round(placement.drawHeightPt * 100) / 100,
    scale: Math.round(placement.scale * 10000) / 10000,
    fitMode: placement.fitMode,
  });

  if (
    placement.embeddedWidthPx != null &&
    placement.embeddedHeightPx != null
  ) {
    console.log("Embedded PNG:", {
      width: placement.embeddedWidthPx,
      height: placement.embeddedHeightPx,
      matchesCanonical:
        placement.embeddedWidthPx === placement.mockupOriginalWidthPx &&
        placement.embeddedHeightPx === placement.mockupOriginalHeightPx,
    });
  }

  console.log("Print Area:", {
    width_cm: placement.printAreaWidthCm,
    height_cm: placement.printAreaHeightCm,
    pdfRenderWidth: Math.round(placement.printAreaRenderWidthPt * 100) / 100,
    pdfRenderHeight: Math.round(placement.printAreaRenderHeightPt * 100) / 100,
  });

  console.log("PDF container:", {
    originX: placement.contentOriginX,
    originY: placement.contentOriginY,
    widthPt: placement.contentWidthPt,
    heightPt: placement.contentHeightPt,
  });
  console.groupEnd();
}
