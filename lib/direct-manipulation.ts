/**
 * Direct manipulation：corner resize 幾何（cm 空間，支援旋轉）
 */

export type ResizeCorner = "nw" | "ne" | "sw" | "se";
export type ResizeEdge = "n" | "e" | "s" | "w";
export type ResizeHandle = ResizeCorner | ResizeEdge;

const EDGE_CURSORS: Record<ResizeEdge, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

const CORNER_FIXED_LOCAL: Record<
  ResizeCorner,
  (halfW: number, halfH: number) => { x: number; y: number }
> = {
  se: (hw, hh) => ({ x: -hw, y: -hh }),
  nw: (hw, hh) => ({ x: hw, y: hh }),
  ne: (hw, hh) => ({ x: -hw, y: hh }),
  sw: (hw, hh) => ({ x: hw, y: -hh }),
};

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function rotatePoint(x: number, y: number, rad: number) {
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

function localToGlobal(
  lx: number,
  ly: number,
  centerX: number,
  centerY: number,
  rotation: number,
) {
  const rotated = rotatePoint(lx, ly, degToRad(rotation));
  return { x: centerX + rotated.x, y: centerY + rotated.y };
}

function globalToLocal(
  gx: number,
  gy: number,
  centerX: number,
  centerY: number,
  rotation: number,
) {
  const dx = gx - centerX;
  const dy = gy - centerY;
  return rotatePoint(dx, dy, degToRad(-rotation));
}

export function computeCornerResizeCm({
  corner,
  pointerX,
  pointerY,
  originX,
  originY,
  originWidth,
  originHeight,
  rotation,
  minWidth = 0.5,
  minHeight = 0.5,
  lockAspect = true,
}: {
  corner: ResizeCorner;
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
  rotation: number;
  minWidth?: number;
  minHeight?: number;
  lockAspect?: boolean;
}): { x: number; y: number; width: number; height: number } {
  const halfW = originWidth / 2;
  const halfH = originHeight / 2;
  const centerX = originX + halfW;
  const centerY = originY + halfH;

  const fixedLocal = CORNER_FIXED_LOCAL[corner](halfW, halfH);
  const moveLocal = globalToLocal(pointerX, pointerY, centerX, centerY, rotation);

  let newW = Math.abs(moveLocal.x - fixedLocal.x);
  let newH = Math.abs(moveLocal.y - fixedLocal.y);

  if (lockAspect && originWidth > 0 && originHeight > 0) {
    const ratio = originWidth / originHeight;
    if (newW / newH > ratio) {
      newW = newH * ratio;
    } else {
      newH = newW / ratio;
    }
  }

  newW = Math.max(minWidth, newW);
  newH = Math.max(minHeight, newH);

  const newHalfW = newW / 2;
  const newHalfH = newH / 2;
  const newFixedLocal = CORNER_FIXED_LOCAL[corner](newHalfW, newHalfH);
  const newCenterLocal = {
    x: (newFixedLocal.x + moveLocal.x) / 2,
    y: (newFixedLocal.y + moveLocal.y) / 2,
  };
  const newCenter = localToGlobal(
    newCenterLocal.x,
    newCenterLocal.y,
    centerX,
    centerY,
    rotation,
  );

  return {
    x: newCenter.x - newHalfW,
    y: newCenter.y - newHalfH,
    width: newW,
    height: newH,
  };
}

export function clientPointToPrintCm(
  clientX: number,
  clientY: number,
  printAreaRect: DOMRect,
  printWidth: number,
  printHeight: number,
): { x: number; y: number } {
  return {
    x: ((clientX - printAreaRect.left) / printAreaRect.width) * printWidth,
    y: ((clientY - printAreaRect.top) / printAreaRect.height) * printHeight,
  };
}

export const RESIZE_CORNER_CURSORS: Record<ResizeCorner, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

export function getResizeHandleCursor(handle: ResizeHandle): string {
  if (handle in RESIZE_CORNER_CURSORS) {
    return RESIZE_CORNER_CURSORS[handle as ResizeCorner];
  }
  return EDGE_CURSORS[handle as ResizeEdge];
}

function computeEdgeResizeCm({
  edge,
  pointerX,
  pointerY,
  originX,
  originY,
  originWidth,
  originHeight,
  rotation,
  minWidth = 0.5,
  minHeight = 0.5,
}: {
  edge: ResizeEdge;
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
  rotation: number;
  minWidth?: number;
  minHeight?: number;
}): { x: number; y: number; width: number; height: number } {
  const halfW = originWidth / 2;
  const halfH = originHeight / 2;
  const centerX = originX + halfW;
  const centerY = originY + halfH;
  const moveLocal = globalToLocal(pointerX, pointerY, centerX, centerY, rotation);

  let newW = originWidth;
  let newH = originHeight;
  let centerLocalX = 0;
  let centerLocalY = 0;

  switch (edge) {
    case "e":
      newW = Math.max(minWidth, moveLocal.x + halfW);
      centerLocalX = (-halfW + moveLocal.x) / 2;
      break;
    case "w":
      newW = Math.max(minWidth, halfW - moveLocal.x);
      centerLocalX = (halfW + moveLocal.x) / 2;
      break;
    case "s":
      newH = Math.max(minHeight, moveLocal.y + halfH);
      centerLocalY = (-halfH + moveLocal.y) / 2;
      break;
    case "n":
      newH = Math.max(minHeight, halfH - moveLocal.y);
      centerLocalY = (halfH + moveLocal.y) / 2;
      break;
  }

  const newCenter = localToGlobal(
    centerLocalX,
    centerLocalY,
    centerX,
    centerY,
    rotation,
  );

  return {
    x: newCenter.x - newW / 2,
    y: newCenter.y - newH / 2,
    width: newW,
    height: newH,
  };
}

export function computeHandleResizeCm(
  params: {
    handle: ResizeHandle;
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
    rotation: number;
    minWidth?: number;
    minHeight?: number;
    lockAspect?: boolean;
  },
): { x: number; y: number; width: number; height: number } {
  const { handle, lockAspect = true, ...rest } = params;
  if (handle === "n" || handle === "e" || handle === "s" || handle === "w") {
    return computeEdgeResizeCm({ edge: handle, ...rest });
  }
  return computeCornerResizeCm({ corner: handle, lockAspect, ...rest });
}
