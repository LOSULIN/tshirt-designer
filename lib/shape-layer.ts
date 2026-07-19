import { getPrintAreaCmBounds, type PrintAreaCmBounds } from "./design-cm";
import type { ShapeDesignLayer, ShapeKind } from "./types";
import { nanoid } from "nanoid";
import { defaultLayerName, getNextZIndex } from "./layers";
import type { DesignLayer } from "./types";
import {
  DESIGNER_DEFAULTS,
  DESIGNER_SHAPE_FALLBACK_STROKE_CM,
} from "./designer-defaults";

export const SHAPE_KIND_OPTIONS: { id: ShapeKind; label: string }[] = [
  { id: "rectangle", label: "矩形" },
  { id: "circle", label: "圓形" },
  { id: "line", label: "線條" },
  { id: "arrow", label: "箭頭" },
];

const DEFAULT_SHAPE_SIZE: Record<
  ShapeKind,
  { width_cm: number; height_cm: number }
> = {
  rectangle: { width_cm: 16, height_cm: 10 },
  circle: { width_cm: 12, height_cm: 12 },
  line: { width_cm: 20, height_cm: 0.6 },
  arrow: { width_cm: 20, height_cm: 4 },
};

export function createDefaultShapeLayer(
  kind: ShapeKind,
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): ShapeDesignLayer {
  const { width_cm, height_cm } = DEFAULT_SHAPE_SIZE[kind];
  return {
    id: nanoid(),
    name: defaultLayerName(layers, "shape"),
    type: "shape",
    shapeKind: kind,
    visible: true,
    locked: false,
    zIndex: getNextZIndex(layers),
    x_cm: (printArea.width - width_cm) / 2,
    y_cm: (printArea.height - height_cm) / 2,
    width_cm,
    height_cm,
    scale: 1,
    rotation: 0,
    fill: kind === "line" || kind === "arrow" ? "transparent" : "#3b82f6",
    stroke: "#1e3a8a",
    strokeWidth_cm:
      kind === "line"
        ? DESIGNER_DEFAULTS.line.strokeWidth_cm
        : kind === "arrow"
          ? DESIGNER_DEFAULTS.arrow.strokeWidth_cm
          : kind === "rectangle"
            ? DESIGNER_DEFAULTS.rectangle.strokeWidth_cm
            : DESIGNER_DEFAULTS.ellipse.strokeWidth_cm,
    opacity: 1,
  };
}

export function normalizeShapeDesignLayer(
  layer: ShapeDesignLayer,
): ShapeDesignLayer {
  return {
    ...layer,
    fill: layer.fill ?? "#3b82f6",
    stroke: layer.stroke ?? "#1e3a8a",
    strokeWidth_cm: layer.strokeWidth_cm ?? DESIGNER_SHAPE_FALLBACK_STROKE_CM,
    opacity: layer.opacity ?? 1,
  };
}

export function drawShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  layer: ShapeDesignLayer,
  pxPerCm: number,
  rect: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
) {
  const x = rect.x_cm * pxPerCm;
  const y = rect.y_cm * pxPerCm;
  const w = rect.width_cm * pxPerCm;
  const h = rect.height_cm * pxPerCm;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const strokePx = layer.strokeWidth_cm * pxPerCm;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.fillStyle = layer.fill;
  ctx.strokeStyle = layer.stroke;
  ctx.lineWidth = strokePx;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const left = -w / 2;
  const top = -h / 2;

  switch (layer.shapeKind) {
    case "rectangle":
      if (layer.fill !== "transparent") {
        ctx.fillRect(left, top, w, h);
      }
      if (strokePx > 0) {
        ctx.strokeRect(left, top, w, h);
      }
      break;
    case "circle": {
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      if (layer.fill !== "transparent") ctx.fill();
      if (strokePx > 0) ctx.stroke();
      break;
    }
    case "line":
      ctx.beginPath();
      ctx.moveTo(left, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();
      break;
    case "arrow": {
      const shaftEnd = w / 2 - Math.min(h, w * 0.2);
      ctx.beginPath();
      ctx.moveTo(left, 0);
      ctx.lineTo(shaftEnd, 0);
      ctx.stroke();
      const head = Math.min(h * 1.2, w * 0.22);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(shaftEnd, -head / 2);
      ctx.lineTo(shaftEnd, head / 2);
      ctx.closePath();
      if (layer.fill !== "transparent") ctx.fill();
      if (strokePx > 0) ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
