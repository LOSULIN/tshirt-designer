#!/usr/bin/env node
/**
 * 驗證 garment-print-config 資料完整性
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const src = readFileSync(join(ROOT, "lib/garment-print-config.ts"), "utf8");

const SIZES = ["XS", "S", "M", "L", "XL", "2L"];
const SIDES = ["front", "back"];

assert.ok(src.includes("GARMENT_PRINT_SAFE_ZONE_CM_FRONT"), "正面表存在");
assert.ok(src.includes("GARMENT_PRINT_SAFE_ZONE_CM_BACK"), "背面表存在");

for (const side of SIDES) {
  for (const size of SIZES) {
    const re = new RegExp(
      `${size === "2L" ? '"2L"' : size}:\\s*\\{\\s*safeWidthCm:\\s*(\\d+),\\s*safeHeightCm:\\s*(\\d+)`,
    );
    const block =
      side === "front"
        ? src.split("GARMENT_PRINT_SAFE_ZONE_CM_FRONT")[1].split(
            "GARMENT_PRINT_SAFE_ZONE_CM_BACK",
          )[0]
        : src.split("GARMENT_PRINT_SAFE_ZONE_CM_BACK")[1].split("} as const;")[0];
    assert.ok(re.test(block), `${side} ${size} 有 safeWidth/safeHeight`);
  }
}

// spot check
assert.ok(src.includes("safeWidthCm: 26"), "M 正面寬 26");
assert.ok(src.includes('"2L": { safeWidthCm: 38'), "2L 背面寬 38");

console.log("verify-garment-print-config: OK");
