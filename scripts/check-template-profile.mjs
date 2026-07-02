#!/usr/bin/env node
/**
 * 驗證 public/template-profiles/*.json 符合 TemplateProfile 結構。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, "../public/template-profiles");

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function requireObject(value, label) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} 必須為 object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} 必須為非空字串`);
  }
}

function requireNumber(value, label) {
  if (!isFiniteNumber(value)) {
    fail(`${label} 必須為有效數字`);
  }
}

function requireKeys(obj, keys, label) {
  for (const key of keys) {
    if (!(key in obj)) {
      fail(`${label} 缺少欄位: ${key}`);
    }
  }
}

function validateSidePrintAreaCm(area, label) {
  const o = requireObject(area, label);
  requireKeys(o, ["widthCm", "heightCm"], label);
  requireNumber(o.widthCm, `${label}.widthCm`);
  requireNumber(o.heightCm, `${label}.heightCm`);
}

function validateCanvas(canvas, fileLabel) {
  const o = requireObject(canvas, `${fileLabel} canvas`);
  requireKeys(o, ["widthPx", "heightPx", "format", "pathPattern"], `${fileLabel} canvas`);
  requireNumber(o.widthPx, `${fileLabel} canvas.widthPx`);
  requireNumber(o.heightPx, `${fileLabel} canvas.heightPx`);
  if (o.format !== "png") {
    fail(`${fileLabel} canvas.format 必須為 "png"`);
  }
  requireString(o.pathPattern, `${fileLabel} canvas.pathPattern`);
}

function validateGarment(garment, fileLabel) {
  const o = requireObject(garment, `${fileLabel} garment`);
  requireKeys(
    o,
    [
      "baselineChestCm",
      "baselineLengthCm",
      "armpitChestWidthPx",
      "bodyLengthPx",
      "pxPerCm",
    ],
    `${fileLabel} garment`,
  );
  requireNumber(o.baselineChestCm, `${fileLabel} garment.baselineChestCm`);
  requireNumber(o.baselineLengthCm, `${fileLabel} garment.baselineLengthCm`);
  requireNumber(o.armpitChestWidthPx, `${fileLabel} garment.armpitChestWidthPx`);
  requireNumber(o.bodyLengthPx, `${fileLabel} garment.bodyLengthPx`);
  requireNumber(o.pxPerCm, `${fileLabel} garment.pxPerCm`);
}

function validatePrint(print, fileLabel) {
  const o = requireObject(print, `${fileLabel} print`);
  requireKeys(
    o,
    [
      "chestReferencePx",
      "pxPerCm",
      "maxPrintAreaCm",
      "productionPrintAreaMm",
      "printAreaOffsetCm",
    ],
    `${fileLabel} print`,
  );
  requireNumber(o.chestReferencePx, `${fileLabel} print.chestReferencePx`);
  requireNumber(o.pxPerCm, `${fileLabel} print.pxPerCm`);

  const maxPrint = requireObject(o.maxPrintAreaCm, `${fileLabel} print.maxPrintAreaCm`);
  requireKeys(maxPrint, ["front", "back"], `${fileLabel} print.maxPrintAreaCm`);
  validateSidePrintAreaCm(maxPrint.front, `${fileLabel} print.maxPrintAreaCm.front`);
  validateSidePrintAreaCm(maxPrint.back, `${fileLabel} print.maxPrintAreaCm.back`);

  const production = requireObject(
    o.productionPrintAreaMm,
    `${fileLabel} print.productionPrintAreaMm`,
  );
  requireKeys(production, ["width_mm", "height_mm"], `${fileLabel} print.productionPrintAreaMm`);
  requireNumber(production.width_mm, `${fileLabel} print.productionPrintAreaMm.width_mm`);
  requireNumber(production.height_mm, `${fileLabel} print.productionPrintAreaMm.height_mm`);

  const offset = requireObject(o.printAreaOffsetCm, `${fileLabel} print.printAreaOffsetCm`);
  requireKeys(offset, ["front", "back"], `${fileLabel} print.printAreaOffsetCm`);
  requireNumber(offset.front, `${fileLabel} print.printAreaOffsetCm.front`);
  requireNumber(offset.back, `${fileLabel} print.printAreaOffsetCm.back`);
}

function validateMeasurement(measurement, fileLabel) {
  const o = requireObject(measurement, `${fileLabel} measurement`);
  requireKeys(
    o,
    ["collarAnchorYPx", "calibrationLine", "containerCenterPx", "silhouetteScale"],
    `${fileLabel} measurement`,
  );

  const collar = requireObject(o.collarAnchorYPx, `${fileLabel} measurement.collarAnchorYPx`);
  requireKeys(collar, ["front", "back"], `${fileLabel} measurement.collarAnchorYPx`);
  requireNumber(collar.front, `${fileLabel} measurement.collarAnchorYPx.front`);
  requireNumber(collar.back, `${fileLabel} measurement.collarAnchorYPx.back`);

  const line = requireObject(o.calibrationLine, `${fileLabel} measurement.calibrationLine`);
  requireKeys(line, ["leftXPx", "rightXPx", "yPx", "chestPx"], `${fileLabel} measurement.calibrationLine`);
  requireNumber(line.leftXPx, `${fileLabel} measurement.calibrationLine.leftXPx`);
  requireNumber(line.rightXPx, `${fileLabel} measurement.calibrationLine.rightXPx`);
  requireNumber(line.yPx, `${fileLabel} measurement.calibrationLine.yPx`);
  requireNumber(line.chestPx, `${fileLabel} measurement.calibrationLine.chestPx`);

  const center = requireObject(o.containerCenterPx, `${fileLabel} measurement.containerCenterPx`);
  requireKeys(center, ["x", "y"], `${fileLabel} measurement.containerCenterPx`);
  requireNumber(center.x, `${fileLabel} measurement.containerCenterPx.x`);
  requireNumber(center.y, `${fileLabel} measurement.containerCenterPx.y`);

  requireNumber(o.silhouetteScale, `${fileLabel} measurement.silhouetteScale`);
  if (o.silhouetteScale <= 0) {
    fail(`${fileLabel} measurement.silhouetteScale 必須 > 0`);
  }
}

function validateTemplateProfile(profile, fileName) {
  const fileLabel = fileName;
  requireObject(profile, fileLabel);
  requireKeys(profile, ["id", "canvas", "garment", "print", "measurement"], fileLabel);
  requireString(profile.id, `${fileLabel} id`);

  validateCanvas(profile.canvas, fileLabel);
  validateGarment(profile.garment, fileLabel);
  validatePrint(profile.print, fileLabel);
  validateMeasurement(profile.measurement, fileLabel);

  const expectedId = fileName.replace(/\.json$/, "");
  if (profile.id !== expectedId) {
    fail(`${fileLabel} id "${profile.id}" 與檔名 "${expectedId}" 不一致`);
  }
}

function main() {
  if (!fs.existsSync(PROFILE_DIR)) {
    fail(`目錄不存在: ${PROFILE_DIR}`);
  }

  const files = fs
    .readdirSync(PROFILE_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    fail(`未找到任何 profile：${PROFILE_DIR}/*.json`);
  }

  for (const fileName of files) {
    const filePath = path.join(PROFILE_DIR, fileName);
    let profile;
    try {
      profile = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      fail(`${fileName} JSON 解析失敗: ${err.message}`);
    }
    validateTemplateProfile(profile, fileName);
    ok(`${fileName} — canvas / garment / print / measurement 完整`);
  }

  console.log("\nTemplate Profile Validation Passed");
}

main();
