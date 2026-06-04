import { ELEMENT_SNAP_THRESHOLD } from "./constants";
import { getScaledSize } from "./geometry";

export interface SnapTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

interface ElementRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface ElementAlignmentGuides {
  vertical: number[];
  horizontal: number[];
}

export interface ElementSnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: ElementAlignmentGuides;
}

function toRect(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): ElementRect {
  const scaled = getScaledSize(width, height, scale);
  return {
    left: x,
    top: y,
    right: x + scaled.width,
    bottom: y + scaled.height,
    centerX: x + scaled.width / 2,
    centerY: y + scaled.height / 2,
    width: scaled.width,
    height: scaled.height,
  };
}

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((v) => Math.round(v * 100) / 100))].sort(
    (a, b) => a - b,
  );
}

export function applyElementAlignmentSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  others: SnapTarget[],
  threshold: number = ELEMENT_SNAP_THRESHOLD,
): ElementSnapResult {
  const drag = toRect(x, y, width, height, scale);
  const targets = others.map((o) =>
    toRect(o.x, o.y, o.width, o.height, o.scale),
  );

  let bestX: {
    dist: number;
    newX: number;
    guide: number;
  } | null = null;
  let bestY: {
    dist: number;
    newY: number;
    guide: number;
  } | null = null;

  for (const target of targets) {
    const xPairs: { dragEdge: number; targetEdge: number; newX: number; guide: number }[] =
      [
        { dragEdge: drag.left, targetEdge: target.left, newX: target.left, guide: target.left },
        {
          dragEdge: drag.left,
          targetEdge: target.right,
          newX: target.right,
          guide: target.right,
        },
        {
          dragEdge: drag.right,
          targetEdge: target.left,
          newX: target.left - drag.width,
          guide: target.left,
        },
        {
          dragEdge: drag.right,
          targetEdge: target.right,
          newX: target.right - drag.width,
          guide: target.right,
        },
        {
          dragEdge: drag.centerX,
          targetEdge: target.centerX,
          newX: target.centerX - drag.width / 2,
          guide: target.centerX,
        },
      ];

    for (const pair of xPairs) {
      const dist = Math.abs(pair.dragEdge - pair.targetEdge);
      if (dist <= threshold && (!bestX || dist < bestX.dist)) {
        bestX = { dist, newX: pair.newX, guide: pair.guide };
      }
    }

    const yPairs: { dragEdge: number; targetEdge: number; newY: number; guide: number }[] =
      [
        { dragEdge: drag.top, targetEdge: target.top, newY: target.top, guide: target.top },
        {
          dragEdge: drag.top,
          targetEdge: target.bottom,
          newY: target.bottom,
          guide: target.bottom,
        },
        {
          dragEdge: drag.bottom,
          targetEdge: target.top,
          newY: target.top - drag.height,
          guide: target.top,
        },
        {
          dragEdge: drag.bottom,
          targetEdge: target.bottom,
          newY: target.bottom - drag.height,
          guide: target.bottom,
        },
        {
          dragEdge: drag.centerY,
          targetEdge: target.centerY,
          newY: target.centerY - drag.height / 2,
          guide: target.centerY,
        },
      ];

    for (const pair of yPairs) {
      const dist = Math.abs(pair.dragEdge - pair.targetEdge);
      if (dist <= threshold && (!bestY || dist < bestY.dist)) {
        bestY = { dist, newY: pair.newY, guide: pair.guide };
      }
    }
  }

  const vertical: number[] = [];
  const horizontal: number[] = [];
  let nextX = x;
  let nextY = y;
  let snappedX = false;
  let snappedY = false;

  if (bestX) {
    nextX = bestX.newX;
    snappedX = true;
    vertical.push(bestX.guide);
  }

  if (bestY) {
    nextY = bestY.newY;
    snappedY = true;
    horizontal.push(bestY.guide);
  }

  return {
    x: nextX,
    y: nextY,
    snappedX,
    snappedY,
    guides: {
      vertical: uniqueSorted(vertical),
      horizontal: uniqueSorted(horizontal),
    },
  };
}

export function guidesEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
