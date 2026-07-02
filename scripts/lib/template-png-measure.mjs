/**
 * 成人 T 恤模板 PNG 量測共用函式（領口、HPS、腋下胸寬、衣長）。
 * 供 measure-template-calibration.mjs 與其他量測腳本使用。
 */

export function readPngRgbaSync(fp, fs, zlib) {
  const buffer = fs.readFileSync(fp);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let inPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inPos++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) row[x] = inflated[inPos++];
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const curr = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const raw = row[i];
      const a = i >= bpp ? curr[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = raw;
      if (filter === 1) v = (raw + a) & 0xff;
      else if (filter === 2) v = (raw + b) & 0xff;
      else if (filter === 3) v = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      curr[i] = v;
    }
  }
  return { width, height, data: out };
}

function idx(w, x, y) {
  return (y * w + x) * 4;
}

export function detectSegmentationMode(filePath, data, w, h) {
  if (filePath.includes("white")) return "white-shirt";
  let dark = 0;
  let samples = 0;
  for (let y = 400; y < 900; y += 40) {
    for (let x = 200; x < 800; x += 40) {
      const i = idx(w, x, y);
      if (data[i] < 100) dark++;
      samples++;
    }
  }
  return dark / samples > 0.3 ? "dark-shirt" : "white-shirt";
}

export function isShirt(data, w, h, x, y, mode) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const i = idx(w, x, y);
  const a = data[i + 3];
  if (a < 16) return false;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (mode === "white-shirt") return !(r >= 252 && g >= 252 && b >= 252);
  return !(r >= 248 && g >= 248 && b >= 248);
}

export function shirtBBox(data, w, h, mode) {
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isShirt(data, w, h, x, y, mode)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function isBoundary(data, w, h, x, y, mode) {
  if (!isShirt(data, w, h, x, y, mode)) return false;
  return (
    !isShirt(data, w, h, x - 1, y, mode) ||
    !isShirt(data, w, h, x + 1, y, mode) ||
    !isShirt(data, w, h, x, y - 1, mode) ||
    !isShirt(data, w, h, x, y + 1, mode)
  );
}

function isOuterLeft(data, w, h, x, y, mode) {
  return isShirt(data, w, h, x, y, mode) && !isShirt(data, w, h, x - 1, y, mode);
}

function isOuterRight(data, w, h, x, y, mode) {
  return isShirt(data, w, h, x, y, mode) && !isShirt(data, w, h, x + 1, y, mode);
}

function findShoulderPeak(data, w, h, bbox, mode, side) {
  const spanY = bbox.maxY - bbox.minY + 1;
  const yLimit = bbox.minY + Math.round(spanY * 0.12);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const xFrom =
    side === "left"
      ? Math.round(bbox.minX + w * 0.18)
      : Math.round(bbox.minX + w * 0.68);
  const xTo =
    side === "left"
      ? Math.round(bbox.minX + w * 0.32)
      : Math.round(bbox.minX + w * 0.82);

  let best = null;
  for (let y = bbox.minY; y <= yLimit; y++) {
    for (let x = xFrom; x <= xTo; x++) {
      const onOuter =
        side === "left"
          ? isOuterLeft(data, w, h, x, y, mode)
          : isOuterRight(data, w, h, x, y, mode);
      if (!onOuter) continue;
      const dist = Math.abs(x - centerX);
      if (!best || y < best.y || (y === best.y && dist < best.dist)) {
        best = { x, y, dist };
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

function findHemY(data, w, h, bbox, hpsX, mode) {
  for (let y = bbox.maxY; y >= bbox.minY; y--) {
    if (isShirt(data, w, h, hpsX, y, mode)) return y;
  }
  return bbox.maxY;
}

function findCollarLowest(data, w, h, bbox, mode, centerX) {
  const yMax = Math.min(h, bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.22));
  const samples = [];

  for (const cx of [
    centerX - 24,
    centerX - 12,
    centerX,
    centerX + 12,
    centerX + 24,
  ]) {
    let inGap = false;
    let sawTop = false;
    let lowY = null;

    for (let y = bbox.minY; y < yMax; y++) {
      const on = isShirt(data, w, h, cx, y, mode);
      if (on) {
        if (!sawTop) sawTop = true;
        else if (inGap) {
          lowY = y;
          break;
        }
      } else if (sawTop) {
        inGap = true;
      }
    }

    if (lowY == null) {
      for (let y = bbox.minY; y < yMax; y++) {
        if (isShirt(data, w, h, cx, y, mode)) lowY = y;
      }
    }

    if (lowY != null) samples.push({ cx, y: lowY });
  }

  const collarLowY = Math.max(...samples.map((s) => s.y));
  const collarLowX = samples.find((s) => s.y === collarLowY)?.cx ?? centerX;
  return { collarLowY, collarLowX, samples };
}

function torsoChestAtY(data, w, h, y, centerX, mode) {
  let leftArmpit = null;
  for (let x = 0; x <= centerX; x++) {
    if (isShirt(data, w, h, x, y, mode)) leftArmpit = x;
  }
  let rightArmpit = null;
  for (let x = w - 1; x >= centerX; x--) {
    if (isShirt(data, w, h, x, y, mode)) rightArmpit = x;
  }
  if (leftArmpit == null || rightArmpit == null || rightArmpit <= leftArmpit) {
    return null;
  }
  return {
    y,
    leftArmpit: { x: leftArmpit, y },
    rightArmpit: { x: rightArmpit, y },
    chestWidthPx: rightArmpit - leftArmpit,
  };
}

function isShirtLegacy(data, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const i = idx(w, x, y);
  const a = data[i + 3];
  if (a < 16) return false;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return !(r >= 248 && g >= 248 && b >= 248);
}

function isBoundaryLegacy(data, w, h, x, y) {
  if (!isShirtLegacy(data, w, h, x, y)) return false;
  return (
    !isShirtLegacy(data, w, h, x - 1, y) ||
    !isShirtLegacy(data, w, h, x + 1, y) ||
    !isShirtLegacy(data, w, h, x, y - 1) ||
    !isShirtLegacy(data, w, h, x, y + 1)
  );
}

/** 與 measure-template-garment.mjs 相同：固定腋下凹點帶 + 非 mode 輪廓 */
function findArmpitLegacyConcave(data, w, h, bbox, hps) {
  const bodyH = bbox.maxY - hps.y;
  const yStart = hps.y + Math.round(bodyH * 0.14);
  const yEnd = hps.y + Math.round(bodyH * 0.3);

  function findInZone(xMin, xMax, score) {
    let best = null;
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xMin; x <= xMax; x++) {
        if (!isBoundaryLegacy(data, w, h, x, y)) continue;
        if (!best || score(best, { x, y }) > 0) best = { x, y };
      }
    }
    return best;
  }

  const leftArmpit = findInZone(170, 280, (a, b) => b.x - a.x || b.y - a.y);
  const rightArmpit = findInZone(740, 850, (a, b) => a.x - b.x || b.y - a.y);
  if (!leftArmpit || !rightArmpit) return null;

  const chestY = Math.round((leftArmpit.y + rightArmpit.y) / 2);
  return {
    leftArmpit,
    rightArmpit,
    chestY,
    chestWidthPx: rightArmpit.x - leftArmpit.x,
    yStart,
    yEnd,
    method: "legacy-concave",
  };
}

function findArmpitTorsoProfile(data, w, h, bbox, mode, printRefChestPx = 612) {
  const centerX = Math.round((bbox.minX + bbox.maxX) / 2);
  const scanStart = bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.24);
  const scanEnd = bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.4);

  const rows = [];
  for (let y = scanStart; y <= scanEnd; y++) {
    const row = torsoChestAtY(data, w, h, y, centerX, mode);
    if (row) rows.push(row);
  }
  if (!rows.length) return null;

  const minRow = rows.reduce((a, b) =>
    a.chestWidthPx < b.chestWidthPx ? a : b,
  );
  const closestRow = rows.reduce((best, row) => {
    const d = Math.abs(row.chestWidthPx - printRefChestPx);
    if (!best || d < best.delta) return { ...row, delta: d };
    return best;
  }, null);

  return {
    minTorso: {
      leftArmpit: minRow.leftArmpit,
      rightArmpit: minRow.rightArmpit,
      chestY: minRow.y,
      chestWidthPx: minRow.chestWidthPx,
      method: "torso-profile-min",
    },
    closestToPrintRef: closestRow
      ? {
          leftArmpit: closestRow.leftArmpit,
          rightArmpit: closestRow.rightArmpit,
          chestY: closestRow.y,
          chestWidthPx: closestRow.chestWidthPx,
          deltaFromPrintRefPx: closestRow.delta,
          method: "torso-closest-to-print-ref",
        }
      : null,
    scanRange: { yStart: scanStart, yEnd: scanEnd },
  };
}

function selectPrimaryArmpit(methods) {
  if (methods.legacyConcave) return { ...methods.legacyConcave, selectedAs: "primary" };
  if (methods.torsoProfile?.closestToPrintRef) {
    return { ...methods.torsoProfile.closestToPrintRef, selectedAs: "primary" };
  }
  if (methods.torsoProfile?.minTorso) {
    return { ...methods.torsoProfile.minTorso, selectedAs: "primary" };
  }
  if (methods.boundaryZone) return { ...methods.boundaryZone, selectedAs: "primary" };
  return null;
}

function findArmpitPoints(data, w, h, bbox, hps, mode, printRefChestPx = 612) {
  const legacyConcave = findArmpitLegacyConcave(data, w, h, bbox, hps);
  const torsoProfile = findArmpitTorsoProfile(
    data,
    w,
    h,
    bbox,
    mode,
    printRefChestPx,
  );

  const bodyH = bbox.maxY - hps.y;
  const yStart = hps.y + Math.round(bodyH * 0.14);
  const yEnd = hps.y + Math.round(bodyH * 0.3);
  const centerX = Math.round((bbox.minX + bbox.maxX) / 2);

  function findInZone(xMin, xMax, score) {
    let best = null;
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xMin; x <= xMax; x++) {
        if (!isBoundary(data, w, h, x, y, mode)) continue;
        if (!best || score(best, { x, y }) > 0) best = { x, y };
      }
    }
    return best;
  }

  const leftZoneMax = Math.round(bbox.minX + w * 0.32);
  const rightZoneMin = Math.round(bbox.minX + w * 0.68);
  const left = findInZone(
    Math.round(bbox.minX + w * 0.15),
    leftZoneMax,
    (a, b) => b.x - a.x || b.y - a.y,
  );
  const right = findInZone(
    rightZoneMin,
    Math.round(bbox.minX + w * 0.85),
    (a, b) => a.x - b.x || b.y - a.y,
  );

  const boundaryZone =
    left && right
      ? {
          leftArmpit: left,
          rightArmpit: right,
          chestY: Math.round((left.y + right.y) / 2),
          chestWidthPx: right.x - left.x,
          yStart,
          yEnd,
          method: "boundary-zone-mode",
        }
      : null;

  const methods = { legacyConcave, torsoProfile, boundaryZone };
  const primary = selectPrimaryArmpit(methods);

  return primary
    ? {
        ...primary,
        allMethods: methods,
      }
    : null;
}

/**
 * 量測單一模板 PNG 的成衣剪影與領口錨點。
 */
export function measureTemplatePng(filePath, fs, zlib, options = {}) {
  const printRefChestPx = options.printRefChestPx ?? 612;
  const { width, height, data } = readPngRgbaSync(filePath, fs, zlib);
  const mode = detectSegmentationMode(filePath, data, width, height);
  const bbox = shirtBBox(data, width, height, mode);
  const centerX = Math.round((bbox.minX + bbox.maxX) / 2);
  const centerY = Math.round((bbox.minY + bbox.maxY) / 2);
  const side = filePath.includes("-back") ? "back" : "front";

  const leftShoulder = findShoulderPeak(data, width, height, bbox, mode, "left");
  const rightShoulder = findShoulderPeak(
    data,
    width,
    height,
    bbox,
    mode,
    "right",
  );

  if (!leftShoulder || !rightShoulder) {
    return {
      ok: false,
      file: filePath.split("/").pop(),
      side,
      error: "shoulder peaks not found",
      canvas: { width, height },
      segmentationMode: mode,
      shirtBBox: bbox,
    };
  }

  const hps = {
    x: Math.round((leftShoulder.x + rightShoulder.x) / 2),
    y: Math.round((leftShoulder.y + rightShoulder.y) / 2),
  };

  const hemY = findHemY(data, width, height, bbox, hps.x, mode);
  const bodyLengthPx = hemY - hps.y;
  const collar = findCollarLowest(data, width, height, bbox, mode, centerX);
  const armpit = findArmpitPoints(
    data,
    width,
    height,
    bbox,
    hps,
    mode,
    printRefChestPx,
  );

  return {
    ok: true,
    file: filePath.split("/").pop(),
    side,
    canvas: { width, height },
    segmentationMode: mode,
    shirtBBox: bbox,
    containerCenter: { x: Math.round(width / 2), y: Math.round(height / 2) },
    garmentCenter: { x: centerX, y: centerY },
    shoulders: { left: leftShoulder, right: rightShoulder },
    hps,
    hem: { x: hps.x, y: hemY },
    bodyLengthPx,
    collarLowest: { x: collar.collarLowX, y: collar.collarLowY },
    collarSamples: collar.samples,
    armpit,
    armpitMethods: armpit?.allMethods ?? null,
    chestWidthPx: armpit?.chestWidthPx ?? null,
    armpitMethod: armpit?.method ?? null,
  };
}
