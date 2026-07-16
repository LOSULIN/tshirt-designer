import {
  getProductPrintAreaForSide,
  isCalibrationRectActive,
} from "./calibration";
import {
  computeCoordinateMapping,
  resolveCalibrationReferences,
} from "./coordinate-mapping";
import { mergeCalibrationSide, resolveEditableCalibrationRect } from "./calibration-rect";
import type {
  CalibrationRect,
  ProductCalibration,
  ProductSide,
  RenderResult,
} from "./render-types";
import type { RenderTestCaseDefinition } from "./render-testcases";
import type { CoordinateMappingTransform } from "./coordinate-mapping";
import {
  MAPPING_VALIDATION_TOLERANCE_PX,
  validateMappingAlignment,
} from "./coordinate-mapping-validation";

export type ValidationStatus = "pass" | "fail" | "pending";

export interface ValidationDetail {
  label: string;
  status: ValidationStatus;
  message: string;
}

export interface RenderValidationOutcome {
  testId: string;
  status: ValidationStatus;
  details: ValidationDetail[];
  printRect: CalibrationRect;
  designerPrintRect: CalibrationRect;
  mapping: CoordinateMappingTransform;
}

export interface RenderValidationSummary {
  total: number;
  passed: number;
  failed: number;
  outcomes: RenderValidationOutcome[];
}

const PIXEL_TOLERANCE = 18;
const RENDER_PLACEMENT_TOLERANCE_PX = 1;

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function getPixel(data: ImageData, x: number, y: number): Rgba {
  const index = (y * data.width + x) * 4;
  return {
    r: data.data[index],
    g: data.data[index + 1],
    b: data.data[index + 2],
    a: data.data[index + 3],
  };
}

function colorDistance(a: Rgba, b: Rgba): number {
  return (
    Math.abs(a.r - b.r) +
    Math.abs(a.g - b.g) +
    Math.abs(a.b - b.b) +
    Math.abs(a.a - b.a)
  );
}

function hexToRgba(hex: string): Rgba {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: 255,
  };
}

function matchesColor(pixel: Rgba, target: Rgba, tolerance = PIXEL_TOLERANCE): boolean {
  return colorDistance(pixel, target) <= tolerance;
}

function getCanvasImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d unavailable");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function findColorBounds(
  data: ImageData,
  rect: CalibrationRect,
  target: Rgba,
): CalibrationRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(data.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(data.height, Math.ceil(rect.y + rect.height));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (matchesColor(getPixel(data, x, y), target)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function findColorCentroid(
  data: ImageData,
  rect: CalibrationRect,
  target: Rgba,
): { x: number; y: number } | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(data.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(data.height, Math.ceil(rect.y + rect.height));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (matchesColor(getPixel(data, x, y), target)) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count === 0) return null;
  return { x: sumX / count, y: sumY / count };
}

function findCornerCentroid(
  data: ImageData,
  rect: CalibrationRect,
  target: Rgba,
  corner: "tl" | "tr" | "bl" | "br",
): { x: number; y: number } | null {
  const searchW = Math.max(24, Math.round(rect.width * 0.15));
  const searchH = Math.max(24, Math.round(rect.height * 0.15));
  const regions: CalibrationRect = {
    tl: { x: rect.x, y: rect.y, width: searchW, height: searchH },
    tr: {
      x: rect.x + rect.width - searchW,
      y: rect.y,
      width: searchW,
      height: searchH,
    },
    bl: {
      x: rect.x,
      y: rect.y + rect.height - searchH,
      width: searchW,
      height: searchH,
    },
    br: {
      x: rect.x + rect.width - searchW,
      y: rect.y + rect.height - searchH,
      width: searchW,
      height: searchH,
    },
  }[corner];

  return findColorCentroid(data, regions, target);
}

function detail(
  label: string,
  status: ValidationStatus,
  message: string,
): ValidationDetail {
  return { label, status, message };
}

function pass(label: string, message: string): ValidationDetail {
  return detail(label, "pass", message);
}

function fail(label: string, message: string): ValidationDetail {
  return detail(label, "fail", message);
}

export function resolveValidationCalibration(
  fileCalibration: ProductCalibration,
  side: ProductSide,
  garmentBounds: { width: number; height: number },
): {
  calibration: ProductCalibration;
  printRect: CalibrationRect;
  designerPrintRect: CalibrationRect;
  mapping: CoordinateMappingTransform;
} {
  const existing = getProductPrintAreaForSide(fileCalibration, side);
  const printRect = resolveEditableCalibrationRect(existing, garmentBounds);
  const calibration = mergeCalibrationSide(fileCalibration, side, printRect);
  const refs = resolveCalibrationReferences(calibration, side);
  const designerPrintRect = refs?.designer ?? printRect;
  const productPrintRect = refs?.product ?? printRect;
  const mapping = computeCoordinateMapping(designerPrintRect, productPrintRect);
  const active = isCalibrationRectActive(productPrintRect);
  return {
    calibration,
    printRect: active ? productPrintRect : printRect,
    designerPrintRect,
    mapping,
  };
}

export function validateRenderTestCase(
  testCase: RenderTestCaseDefinition,
  renderResult: RenderResult,
  garmentBaseline: HTMLCanvasElement,
  printRect: CalibrationRect,
  designerPrintRect: CalibrationRect,
  mapping: CoordinateMappingTransform,
): RenderValidationOutcome {
  const data = getCanvasImageData(renderResult.canvas);
  const baseline = getCanvasImageData(garmentBaseline);
  const details: ValidationDetail[] = [];
  const marker = hexToRgba(testCase.markerColor);

  if (testCase.checks.includes("width-height")) {
    const bounds = findColorBounds(data, printRect, marker);
    if (!bounds) {
      details.push(fail("Width", "未偵測到滿版標記色"));
      details.push(fail("Height", "未偵測到滿版標記色"));
    } else {
      const widthOk = Math.abs(bounds.width - printRect.width) <= RENDER_PLACEMENT_TOLERANCE_PX;
      const heightOk = Math.abs(bounds.height - printRect.height) <= RENDER_PLACEMENT_TOLERANCE_PX;
      details.push(
        widthOk
          ? pass("Width", `${bounds.width}px ≈ ${printRect.width}px`)
          : fail("Width", `${bounds.width}px ≠ ${printRect.width}px`),
      );
      details.push(
        heightOk
          ? pass("Height", `${bounds.height}px ≈ ${printRect.height}px`)
          : fail("Height", `${bounds.height}px ≠ ${printRect.height}px`),
      );

      const mappingCheck = validateMappingAlignment(
        {
          x: 0,
          y: 0,
          width: designerPrintRect.width,
          height: designerPrintRect.height,
        },
        mapping,
        bounds,
        MAPPING_VALIDATION_TOLERANCE_PX,
      );
      details.push(
        mappingCheck.passed
          ? pass("Mapping", mappingCheck.details.join(" · "))
          : fail("Mapping", mappingCheck.details.join(" · ")),
      );
    }
  }

  if (testCase.checks.includes("center")) {
    const centroid = findColorCentroid(data, printRect, hexToRgba("#22c55e"));
    const expectedX = printRect.x + printRect.width / 2;
    const expectedY = printRect.y + printRect.height / 2;
    if (!centroid) {
      details.push(fail("Center", "未偵測到十字標記"));
    } else {
      const dx = Math.abs(centroid.x - expectedX);
      const dy = Math.abs(centroid.y - expectedY);
      const ok = dx <= RENDER_PLACEMENT_TOLERANCE_PX && dy <= RENDER_PLACEMENT_TOLERANCE_PX;
      details.push(
        ok
          ? pass("Center", `Δx=${dx.toFixed(1)} Δy=${dy.toFixed(1)}`)
          : fail("Center", `偏移 Δx=${dx.toFixed(1)} Δy=${dy.toFixed(1)}`),
      );
    }
  }

  if (testCase.checks.includes("offset")) {
    const blue = hexToRgba("#2563eb");
    const centroid = findColorCentroid(data, printRect, blue);
    const offsetX = Math.round(designerPrintRect.width * 0.12);
    const offsetY = Math.round(designerPrintRect.height * 0.1);
    const size = Math.round(
      Math.min(designerPrintRect.width, designerPrintRect.height) * 0.18,
    );
    const expectedX =
      printRect.x + offsetX * mapping.scaleX + (size * mapping.scaleX) / 2;
    const expectedY =
      printRect.y + offsetY * mapping.scaleY + (size * mapping.scaleY) / 2;
    if (!centroid) {
      details.push(fail("Offset", "未偵測到 Logo 標記"));
    } else {
      const dx = Math.abs(centroid.x - expectedX);
      const dy = Math.abs(centroid.y - expectedY);
      const ok = dx <= RENDER_PLACEMENT_TOLERANCE_PX + 1 && dy <= RENDER_PLACEMENT_TOLERANCE_PX + 1;
      details.push(
        ok
          ? pass("Offset", `Δx=${dx.toFixed(1)} Δy=${dy.toFixed(1)}`)
          : fail("Offset", `偏移 Δx=${dx.toFixed(1)} Δy=${dy.toFixed(1)}`),
      );
    }
  }

  if (testCase.checks.includes("xy")) {
    const corners = [
      { label: "TL", color: hexToRgba("#ef4444"), corner: "tl" as const, ex: printRect.x + 5, ey: printRect.y + 5 },
      {
        label: "TR",
        color: hexToRgba("#22c55e"),
        corner: "tr" as const,
        ex: printRect.x + printRect.width - 5,
        ey: printRect.y + 5,
      },
      {
        label: "BL",
        color: hexToRgba("#3b82f6"),
        corner: "bl" as const,
        ex: printRect.x + 5,
        ey: printRect.y + printRect.height - 5,
      },
      {
        label: "BR",
        color: hexToRgba("#f59e0b"),
        corner: "br" as const,
        ex: printRect.x + printRect.width - 5,
        ey: printRect.y + printRect.height - 5,
      },
    ];
    for (const item of corners) {
      const centroid = findCornerCentroid(data, printRect, item.color, item.corner);
      if (!centroid) {
        details.push(fail(`X/Y ${item.label}`, "未偵測到角點"));
        continue;
      }
      const dx = Math.abs(centroid.x - item.ex);
      const dy = Math.abs(centroid.y - item.ey);
      const ok = dx <= RENDER_PLACEMENT_TOLERANCE_PX + 2 && dy <= RENDER_PLACEMENT_TOLERANCE_PX + 2;
      details.push(
        ok
          ? pass(`X/Y ${item.label}`, `(${centroid.x.toFixed(0)}, ${centroid.y.toFixed(0)})`)
          : fail(`X/Y ${item.label}`, `期望 (${item.ex}, ${item.ey})`),
      );
    }
  }

  if (testCase.checks.includes("safe-area")) {
    const magenta = hexToRgba("#d946ef");
    let leaked = 0;
    const margin = Math.round(Math.min(printRect.width, printRect.height) * 0.12);
    const inner: CalibrationRect = {
      x: printRect.x + margin,
      y: printRect.y + margin,
      width: printRect.width - margin * 2,
      height: printRect.height - margin * 2,
    };

    const x0 = Math.max(0, Math.floor(printRect.x));
    const y0 = Math.max(0, Math.floor(printRect.y));
    const x1 = Math.min(data.width, Math.ceil(printRect.x + printRect.width));
    const y1 = Math.min(data.height, Math.ceil(printRect.y + printRect.height));

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const inInner =
          x >= inner.x &&
          x < inner.x + inner.width &&
          y >= inner.y &&
          y < inner.y + inner.height;
        if (!inInner && matchesColor(getPixel(data, x, y), magenta)) {
          leaked++;
        }
      }
    }

    details.push(
      leaked === 0
        ? pass("Print Area", "Artwork 未超出安全區")
        : fail("Print Area", `偵測到 ${leaked} 個外溢像素`),
    );
  }

  if (testCase.checks.includes("scale")) {
    const bounds = findColorBounds(data, printRect, marker);
    if (!bounds) {
      details.push(fail("Scale", "未偵測到 35×50 標記"));
    } else {
      const aspect = bounds.width / bounds.height;
      const expected = 35 / 50;
      const ok = Math.abs(aspect - expected) <= 0.02;
      details.push(
        ok
          ? pass("Scale", `比例 ${aspect.toFixed(3)} ≈ ${expected.toFixed(3)}`)
          : fail("Scale", `比例 ${aspect.toFixed(3)} ≠ ${expected.toFixed(3)}`),
      );
    }
  }

  if (testCase.checks.includes("alpha")) {
    const teal = hexToRgba("#14b8a6");
    const cx = Math.round(printRect.x + printRect.width / 2);
    const cy = Math.round(printRect.y + printRect.height / 2);
    const cornerX = Math.round(printRect.x + 12);
    const cornerY = Math.round(printRect.y + 12);

    const opaque = matchesColor(getPixel(data, cx, cy), teal);
    const renderCorner = getPixel(data, cornerX, cornerY);
    const baseCorner = getPixel(baseline, cornerX, cornerY);
    const transparentPreserved = colorDistance(renderCorner, baseCorner) <= PIXEL_TOLERANCE;

    details.push(
      opaque
        ? pass("Alpha opaque", "不透明區域已合成")
        : fail("Alpha opaque", "不透明區域未對齊"),
    );
    details.push(
      transparentPreserved
        ? pass("Alpha transparent", "透明區保留底圖")
        : fail("Alpha transparent", "透明區未保留底圖"),
    );
  }

  const status: ValidationStatus = details.every((item) => item.status === "pass")
    ? "pass"
    : details.some((item) => item.status === "fail")
      ? "fail"
      : "pending";

  return {
    testId: testCase.id,
    status,
    details,
    printRect,
    designerPrintRect,
    mapping,
  };
}

export function summarizeValidation(
  outcomes: RenderValidationOutcome[],
): RenderValidationSummary {
  const passed = outcomes.filter((o) => o.status === "pass").length;
  const failed = outcomes.filter((o) => o.status === "fail").length;
  return {
    total: outcomes.length,
    passed,
    failed,
    outcomes,
  };
}

export function createDifferenceOverlay(
  renderCanvas: HTMLCanvasElement,
  garmentCanvas: HTMLCanvasElement,
  printRect: CalibrationRect,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = renderCanvas.width;
  canvas.height = renderCanvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const renderData = getCanvasImageData(renderCanvas);
  const garmentData = getCanvasImageData(garmentCanvas);
  const output = ctx.createImageData(canvas.width, canvas.height);

  const x0 = Math.max(0, Math.floor(printRect.x));
  const y0 = Math.max(0, Math.floor(printRect.y));
  const x1 = Math.min(canvas.width, Math.ceil(printRect.x + printRect.width));
  const y1 = Math.min(canvas.height, Math.ceil(printRect.y + printRect.height));

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const inPrint = x >= x0 && x < x1 && y >= y0 && y < y1;
      if (!inPrint) {
        output.data[i + 3] = 0;
        continue;
      }
      const diff = colorDistance(
        getPixel(renderData, x, y),
        getPixel(garmentData, x, y),
      );
      const heat = Math.min(255, diff * 4);
      output.data[i] = heat;
      output.data[i + 1] = 0;
      output.data[i + 2] = 255 - heat;
      output.data[i + 3] = diff > 8 ? 180 : 40;
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
}
