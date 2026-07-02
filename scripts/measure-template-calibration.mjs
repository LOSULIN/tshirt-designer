#!/usr/bin/env node
/**
 * 模板座標基準量測工具
 * ─────────────────────
 * 對照兩套座標系統，產出 JSON 報告 + SVG overlay（不修改任何 runtime 程式碼）。
 *
 * 用法：
 *   node scripts/measure-template-calibration.mjs                    # white-front 參考
 *   node scripts/measure-template-calibration.mjs --all              # 全部 adult 模板
 *   node scripts/measure-template-calibration.mjs path/to/template.png # 指定檔案
 *
 * 輸出：
 *   public/guides/template-calibration-report.json
 *   public/guides/<template>-calibration.svg
 *   public/guides/<template>-calibration.png（若 sharp 可用）
 *   public/template-profiles/<profile-id>.json
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { measureTemplatePng } from "./lib/template-png-measure.mjs";
import { readCodebaseCalibrationConstants } from "./lib/read-calibration-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT, "public/templates");
const OUT_DIR = path.join(ROOT, "public/guides");
const TEMPLATE_PROFILE_OUT_DIR = path.join(ROOT, "public/template-profiles");

const REFERENCE_FILES = [
  "adult-tshirt-white-front.png",
  "adult-tshirt-white-back.png",
];

const ALL_ADULT_GLOB_PREFIX = "adult-tshirt-";

/** adult-tshirt-white-front.png → adult-white-front */
const TEMPLATE_FILE_TO_PROFILE_ID = {
  "adult-tshirt-white-front.png": "adult-white-front",
  "adult-tshirt-white-back.png": "adult-white-back",
};

function templateFileToProfileId(templateFile) {
  return TEMPLATE_FILE_TO_PROFILE_ID[templateFile] ?? null;
}

function round(n, d = 3) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function summarizeArmpitMethods(methods) {
  if (!methods) return null;
  const out = {};
  if (methods.legacyConcave) {
    out.legacyConcave = {
      chestWidthPx: methods.legacyConcave.chestWidthPx,
      chestY: methods.legacyConcave.chestY,
    };
  }
  if (methods.boundaryZone) {
    out.boundaryZoneMode = {
      chestWidthPx: methods.boundaryZone.chestWidthPx,
      chestY: methods.boundaryZone.chestY,
    };
  }
  if (methods.torsoProfile?.minTorso) {
    out.torsoProfileMin = {
      chestWidthPx: methods.torsoProfile.minTorso.chestWidthPx,
      chestY: methods.torsoProfile.minTorso.chestY,
    };
  }
  if (methods.torsoProfile?.closestToPrintRef) {
    out.torsoClosestToPrintRef = {
      chestWidthPx: methods.torsoProfile.closestToPrintRef.chestWidthPx,
      chestY: methods.torsoProfile.closestToPrintRef.chestY,
      deltaFromPrintRefPx:
        methods.torsoProfile.closestToPrintRef.deltaFromPrintRefPx,
    };
  }
  return out;
}

function parseArgs(argv) {
  const files = [];
  let mode = "reference";
  for (const arg of argv) {
    if (arg === "--all") mode = "all";
    else if (arg === "--reference" || arg === "-r") mode = "reference";
    else if (!arg.startsWith("-")) files.push(arg);
  }
  if (files.length) return { mode: "custom", files: files.map((f) => path.resolve(f)) };
  if (mode === "all") {
    const list = fs
      .readdirSync(TEMPLATE_DIR)
      .filter((f) => f.startsWith(ALL_ADULT_GLOB_PREFIX) && f.endsWith(".png"))
      .sort()
      .map((f) => path.join(TEMPLATE_DIR, f));
    return { mode: "all", files: list };
  }
  return {
    mode: "reference",
    files: REFERENCE_FILES.map((f) => path.join(TEMPLATE_DIR, f)),
  };
}

function buildGarmentCoordinateSystem(png, baselineM) {
  if (!png.ok || !png.armpit) return null;

  const chestPx = png.chestWidthPx;
  const lengthPx = png.bodyLengthPx;
  const fromLegacyChest = chestPx / baselineM.legacy.chestCm;
  const fromLegacyLength = lengthPx / baselineM.legacy.lengthCm;
  const fromProductChest =
    baselineM.product != null ? chestPx / baselineM.product.chestCm : null;
  const fromProductLength =
    baselineM.product != null ? lengthPx / baselineM.product.lengthCm : null;

  return {
    id: "garment-silhouette",
    label: "模板 PNG 成衣剪影（腋下胸寬、HPS→下擺）",
    measured: {
      armpitChestWidthPx: chestPx,
      armpitMethod: png.armpitMethod,
      alternateMethods: summarizeArmpitMethods(png.armpitMethods),
      bodyLengthPx: lengthPx,
      chestY: png.armpit.chestY,
      leftArmpit: png.armpit.leftArmpit,
      rightArmpit: png.armpit.rightArmpit,
      collarLowestY: png.collarLowest.y,
      hps: png.hps,
      hemY: png.hem.y,
    },
    pxPerCm: {
      fromLegacyM: {
        chest: round(fromLegacyChest),
        length: round(fromLegacyLength),
        avg: round((fromLegacyChest + fromLegacyLength) / 2),
      },
      fromProductM:
        fromProductChest != null
          ? {
              chest: round(fromProductChest),
              length: round(fromProductLength),
              avg: round((fromProductChest + fromProductLength) / 2),
            }
          : null,
    },
    ratio: {
      measured: round(chestPx / lengthPx, 4),
      legacyM: round(baselineM.legacy.chestCm / baselineM.legacy.lengthCm, 4),
      productM:
        baselineM.product != null
          ? round(baselineM.product.chestCm / baselineM.product.lengthCm, 4)
          : null,
    },
    notes: [
      "腋下凹點量測；與 Preview 標定線（20.1%–79.9%）基準不同",
      `建議視覺基準：${chestPx}px / ${baselineM.product?.chestCm ?? baselineM.legacy.chestCm}cm`,
    ],
  };
}

function buildPrintOverlayRects(codebase, side) {
  const { templateSpec, printCoordinateSystem: pcs } = codebase;
  const pxPerCm = pcs.pxPerCm;
  const blue = pcs.blueBoxCm[side];
  const w = blue.widthCm * pxPerCm;
  const h = blue.heightCm * pxPerCm;
  const cx = templateSpec.widthPx / 2;
  const cy = templateSpec.heightPx / 2;
  return {
    blueBox: {
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      widthCm: blue.widthCm,
      heightCm: blue.heightCm,
    },
    containerCenter: { x: cx, y: cy },
    calibrationLine: pcs.calibrationLine,
    collarAnchorY: pcs.collarAnchorYPx[side],
    printAreaOffsetCm: pcs.printAreaOffsetCm[side],
    printTopY:
      pcs.collarAnchorYPx[side] + pcs.printAreaOffsetCm[side] * pxPerCm,
    productionExportMm: pcs.productionPrintMm,
  };
}

function compareSystems(codebase, garment, png) {
  if (!garment) {
    return {
      comparable: false,
      reason: png?.error ?? "armpit measurement failed",
    };
  }

  const pcs = codebase.printCoordinateSystem;
  const chestPxPrint = pcs.chestReferencePx;
  const chestPxGarment = garment.measured.armpitChestWidthPx;
  const pxPerCmPrint = pcs.pxPerCm;
  const pxPerCmGarment =
    garment.pxPerCm.fromProductM?.chest ??
    garment.pxPerCm.fromLegacyM.chest;

  const blue = pcs.blueBoxCm[png.side];
  const blueWidthPx = blue.widthCm * pxPerCmPrint;

  const templateChestPx = pcs.chestReferencePx;
  const garmentChestPx = chestPxGarment;
  const recommendedSilhouetteScale = templateChestPx / garmentChestPx;
  const recommendedSilhouetteScaleRounded = round(recommendedSilhouetteScale, 4);

  return {
    comparable: true,
    recommendedSilhouetteScale,
    recommendedSilhouetteScaleRounded,
    chestWidthPx: {
      printReference: chestPxPrint,
      garmentArmpit: chestPxGarment,
      deltaPx: chestPxGarment - chestPxPrint,
      deltaPct: round(((chestPxGarment - chestPxPrint) / chestPxPrint) * 100, 2),
      silhouetteToPrintFactor: round(chestPxPrint / chestPxGarment, 4),
    },
    pxPerCm: {
      printOverlay: pxPerCmPrint,
      garmentArmpit: pxPerCmGarment,
      delta: round(pxPerCmGarment - pxPerCmPrint, 3),
      deltaPct: round(
        ((pxPerCmGarment - pxPerCmPrint) / pxPerCmPrint) * 100,
        2,
      ),
    },
    blueBoxVsGarmentChest: {
      blueBoxWidthPx: round(blueWidthPx, 1),
      garmentChestPx: chestPxGarment,
      blueBoxToGarmentRatio: round(blueWidthPx / chestPxGarment, 4),
    },
    collarAnchor: {
      codebaseY: pcs.collarAnchorYPx[png.side],
      measuredY: png.collarLowest.y,
      deltaPx: png.collarLowest.y - pcs.collarAnchorYPx[png.side],
    },
    containerVsGarmentCenter: {
      container: png.containerCenter,
      garmentBBoxCenter: png.garmentCenter,
      deltaX: png.garmentCenter.x - png.containerCenter.x,
      deltaY: png.garmentCenter.y - png.containerCenter.y,
    },
    decisionHints: [
      {
        id: "keep-print-px-per-cm",
        when: "layer _cm、藍框 %、export 已上線且有設計資料",
        action: `維持 print pxPerCm = ${pxPerCmPrint}（設計座標契約）`,
      },
      {
        id: "garment-visual-calibration",
        when: "僅 Preview 衣服剪影與印刷參考線視覺對齊",
        action: `考慮 ShirtVisualScale 補償 ×${round(chestPxPrint / chestPxGarment, 4)}（不動 12.24）`,
      },
      {
        id: "retemplate-metrics",
        when: "決定以 PNG 腋下為唯一真相且可接受遷移設計座標",
        action: `將 template-metrics 改為 ${pxPerCmGarment} — 高風險，需資料遷移`,
      },
      {
        id: "collar-anchor",
        when: Math.abs(png.collarLowest.y - pcs.collarAnchorYPx[png.side]) > 2,
        action: `量測領口 Y=${png.collarLowest.y} vs codebase ${pcs.collarAnchorYPx[png.side]}（僅影響橘框／debug）`,
      },
      {
        id: "recommended-silhouette-scale",
        when: "Template Profile measurement.silhouetteScale 建議值（僅報告，不自動寫入）",
        action: `建議 silhouetteScale = ${recommendedSilhouetteScaleRounded}（${templateChestPx} / ${garmentChestPx}）`,
        recommendedSilhouetteScale: recommendedSilhouetteScaleRounded,
      },
    ],
  };
}

function buildOverlaySvg(filePath, png, codebase, garment, comparison, overlayRects) {
  const pngB64 = fs.readFileSync(filePath).toString("base64");
  const { width, height } = png.canvas;
  const pcs = codebase.printCoordinateSystem;
  const side = png.side;
  const bb = overlayRects.blueBox;
  const cal = overlayRects.calibrationLine;

  const lines = [];
  const push = (s) => lines.push(s);

  push(`<?xml version="1.0" encoding="UTF-8"?>`);
  push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  push(
    `<image href="data:image/png;base64,${pngB64}" width="${width}" height="${height}"/>`,
  );

  // Container center
  push(
    `<line x1="${png.containerCenter.x - 40}" y1="${png.containerCenter.y}" x2="${png.containerCenter.x + 40}" y2="${png.containerCenter.y}" stroke="#facc15" stroke-width="2" opacity="0.9"/>`,
  );
  push(
    `<line x1="${png.containerCenter.x}" y1="${png.containerCenter.y - 40}" x2="${png.containerCenter.x}" y2="${png.containerCenter.y + 40}" stroke="#facc15" stroke-width="2" opacity="0.9"/>`,
  );
  push(
    `<text x="${png.containerCenter.x + 48}" y="${png.containerCenter.y - 8}" font-size="18" font-weight="700" fill="#facc15">Container center</text>`,
  );

  // Print coordinate system — blue box
  push(
    `<rect x="${bb.left}" y="${bb.top}" width="${bb.width}" height="${bb.height}" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="12 8"/>`,
  );
  push(
    `<text x="${bb.left + 8}" y="${bb.top - 10}" font-size="20" font-weight="700" fill="#a855f7">藍框 ${bb.widthCm}×${bb.heightCm}cm @ ${pcs.pxPerCm} px/cm</text>`,
  );

  // Print calibration line (612px reference)
  push(
    `<line x1="${cal.leftX}" y1="${cal.y}" x2="${cal.rightX}" y2="${cal.y}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 6"/>`,
  );
  push(
    `<text x="${cal.leftX}" y="${cal.y - 12}" font-size="18" font-weight="700" fill="#ef4444">標定胸寬 ${cal.chestPx}px (${pcs.pxPerCm} px/cm)</text>`,
  );

  // Collar + print top (codebase)
  const anchorY = overlayRects.collarAnchorY;
  const printTopY = overlayRects.printTopY;
  push(
    `<line x1="${png.containerCenter.x - 70}" y1="${anchorY}" x2="${png.containerCenter.x + 70}" y2="${anchorY}" stroke="#f97316" stroke-width="2" stroke-dasharray="8 6"/>`,
  );
  push(
    `<text x="${png.containerCenter.x + 80}" y="${anchorY + 6}" font-size="17" fill="#f97316">Code collar Y=${anchorY}</text>`,
  );
  push(
    `<line x1="60" y1="${printTopY}" x2="${width - 60}" y2="${printTopY}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="10 8"/>`,
  );
  push(
    `<text x="70" y="${printTopY - 8}" font-size="17" fill="#3b82f6">Print top +${overlayRects.printAreaOffsetCm}cm → Y=${Math.round(printTopY)}</text>`,
  );

  if (png.ok) {
    // Measured collar
    push(
      `<circle cx="${png.collarLowest.x}" cy="${png.collarLowest.y}" r="9" fill="none" stroke="#fb923c" stroke-width="3"/>`,
    );
    push(
      `<text x="${png.collarLowest.x + 14}" y="${png.collarLowest.y + 6}" font-size="17" fill="#fb923c">量測領口 Y=${png.collarLowest.y}</text>`,
    );

    // HPS / shoulders
    push(
      `<line x1="${png.shoulders.left.x}" y1="${png.shoulders.left.y}" x2="${png.shoulders.right.x}" y2="${png.shoulders.right.y}" stroke="#22c55e" stroke-width="3"/>`,
    );
    push(
      `<circle cx="${png.hps.x}" cy="${png.hps.y}" r="10" fill="#22c55e" stroke="#fff" stroke-width="2"/>`,
    );

    if (png.armpit) {
      push(
        `<line x1="${png.armpit.leftArmpit.x}" y1="${png.armpit.chestY}" x2="${png.armpit.rightArmpit.x}" y2="${png.armpit.chestY}" stroke="#06b6d4" stroke-width="4"/>`,
      );
      push(
        `<text x="${(png.armpit.leftArmpit.x + png.armpit.rightArmpit.x) / 2}" y="${png.armpit.chestY - 18}" text-anchor="middle" font-size="22" font-weight="700" fill="#06b6d4">腋下胸寬 ${png.chestWidthPx}px（剪影）</text>`,
      );
    }

    push(
      `<line x1="${png.hps.x}" y1="${png.hps.y}" x2="${png.hem.x}" y2="${png.hem.y}" stroke="#22c55e" stroke-width="2" stroke-dasharray="10 8"/>`,
    );
    push(
      `<text x="${png.hps.x + 20}" y="${Math.round((png.hps.y + png.hem.y) / 2)}" font-size="18" fill="#22c55e">衣長 ${png.bodyLengthPx}px</text>`,
    );
  }

  // Legend panel
  const gPx = garment?.pxPerCm.fromProductM?.chest ?? garment?.pxPerCm.fromLegacyM?.chest ?? "—";
  const cmp = comparison.comparable
    ? `Δ胸寬 ${comparison.chestWidthPx.deltaPx}px · Δpx/cm ${comparison.pxPerCm.delta}`
    : comparison.reason;

  push(`<rect x="20" y="20" width="640" height="200" rx="12" fill="rgba(0,0,0,0.82)"/>`);
  push(
    `<text x="40" y="52" font-family="ui-monospace,monospace" font-size="17" fill="#fff">${png.file} · ${side} · 座標基準量測</text>`,
  );
  push(
    `<text x="40" y="80" font-family="ui-monospace,monospace" font-size="15" fill="#e9d5ff">印刷座標: ${pcs.pxPerCm} px/cm · 標定胸 ${pcs.chestReferencePx}px · 藍框 ${bb.widthCm}×${bb.heightCm}cm</text>`,
  );
  push(
    `<text x="40" y="108" font-family="ui-monospace,monospace" font-size="15" fill="#a5f3fc">剪影量測: 腋下 ${png.chestWidthPx ?? "—"}px · 衣長 ${png.bodyLengthPx ?? "—"}px · ~${gPx} px/cm</text>`,
  );
  push(
    `<text x="40" y="136" font-family="ui-monospace,monospace" font-size="15" fill="#fde68a">${cmp}</text>`,
  );
  push(
    `<text x="40" y="164" font-family="ui-monospace,monospace" font-size="13" fill="#a1a1aa">紫=藍框(12.24) · 紅=標定線(612) · 青=腋下 · 黃=畫布中心 · 不修改 runtime</text>`,
  );
  push(
    `<text x="40" y="188" font-family="ui-monospace,monospace" font-size="13" fill="#a1a1aa">腋下演算法: ${png.armpitMethod ?? "—"} · Export: ${pcs.productionPrintMm.width_mm}×${pcs.productionPrintMm.height_mm}mm</text>`,
  );

  push(`</svg>`);
  return lines.join("\n");
}

/**
 * 由量測 entry 組裝 TemplateProfile（對齊 lib/template-profile/types.ts）。
 */
function buildTemplateProfile(entry, codebase, measuredAt) {
  const profileId = templateFileToProfileId(entry.template);
  if (!profileId) {
    return null;
  }

  const png = entry.pngMeasurement;
  const garmentSys = entry.garmentCoordinateSystem;
  if (!png?.ok || !garmentSys) {
    throw new Error(
      `Cannot build template profile for ${entry.template}: measurement incomplete`,
    );
  }

  const pcs = codebase.printCoordinateSystem;
  const productM = pcs.productBaselineM;
  const baselineChestCm = productM?.chestCm ?? pcs.legacyBaselineM.chestCm;
  const baselineLengthCm = productM?.lengthCm ?? pcs.legacyBaselineM.lengthCm;
  const garmentPxPerCm =
    garmentSys.pxPerCm.fromProductM?.chest ??
    garmentSys.pxPerCm.fromLegacyM.chest;
  const cal = pcs.calibrationLine;
  const measuredCollarY = png.collarLowest.y;
  const codebaseCollar = pcs.collarAnchorYPx;

  const collarAnchorYPx =
    entry.side === "front"
      ? {
          front: measuredCollarY,
          back: codebaseCollar.back,
        }
      : {
          front: codebaseCollar.front,
          back: measuredCollarY,
        };

  return {
    id: profileId,
    canvas: {
      widthPx: png.canvas.width,
      heightPx: png.canvas.height,
      format: "png",
      pathPattern: `/templates/${entry.template}`,
    },
    garment: {
      baselineChestCm,
      baselineLengthCm,
      armpitChestWidthPx: garmentSys.measured.armpitChestWidthPx,
      bodyLengthPx: garmentSys.measured.bodyLengthPx,
      pxPerCm: garmentPxPerCm,
    },
    print: {
      chestReferencePx: pcs.chestReferencePx,
      pxPerCm: pcs.pxPerCm,
      maxPrintAreaCm: pcs.blueBoxCm,
      productionPrintAreaMm: pcs.productionPrintMm,
      printAreaOffsetCm: pcs.printAreaOffsetCm,
    },
    measurement: {
      collarAnchorYPx,
      calibrationLine: {
        leftXPx: cal.leftX,
        rightXPx: cal.rightX,
        yPx: cal.y,
        chestPx: cal.chestPx,
      },
      containerCenterPx: {
        x: png.containerCenter.x,
        y: png.containerCenter.y,
      },
      silhouetteScale: 1,
      source: `template-calibration/v1 @ ${measuredAt} · ${entry.template} · ${png.armpitMethod ?? "unknown"}`,
    },
  };
}

function writeTemplateProfile(profile, outDir = TEMPLATE_PROFILE_OUT_DIR) {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${profile.id}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(profile, null, 2)}\n`);
  return outPath;
}

function measureOne(filePath, codebase) {
  const printRefChestPx = codebase.printCoordinateSystem.chestReferencePx;
  const png = measureTemplatePng(filePath, fs, zlib, { printRefChestPx });
  const baselineM = {
    legacy: codebase.printCoordinateSystem.legacyBaselineM,
    product: codebase.printCoordinateSystem.productBaselineM,
  };
  const garment = buildGarmentCoordinateSystem(png, baselineM);
  const overlayRects = buildPrintOverlayRects(codebase, png.side ?? "front");
  const comparison = compareSystems(codebase, garment, png);

  return {
    template: png.file,
    path: filePath,
    side: png.side,
    ok: png.ok,
    pngMeasurement: png,
    garmentCoordinateSystem: garment,
    printOverlayRects: overlayRects,
    comparison,
  };
}

async function main() {
  const { mode, files } = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const codebase = readCodebaseCalibrationConstants(ROOT);
  const measuredAt = new Date().toISOString();
  const entries = [];

  for (const fp of files) {
    if (!fs.existsSync(fp)) {
      console.error("missing:", fp);
      continue;
    }
    const entry = measureOne(fp, codebase);
    entries.push(entry);

    const base = path.basename(fp, ".png");
    const svgOut = path.join(OUT_DIR, `${base}-calibration.svg`);
    const pngOut = path.join(OUT_DIR, `${base}-calibration.png`);
    const svg = buildOverlaySvg(
      fp,
      entry.pngMeasurement,
      codebase,
      entry.garmentCoordinateSystem,
      entry.comparison,
      entry.printOverlayRects,
    );
    fs.writeFileSync(svgOut, svg);
    entry.artifacts = { svg: svgOut };

    try {
      const sharp = (await import("sharp")).default;
      await sharp(svgOut, { density: 144 }).png().toFile(pngOut);
      entry.artifacts.png = pngOut;
    } catch {
      // svg only
    }

    const status = entry.ok
      ? entry.comparison.comparable
        ? "✓"
        : "△"
      : "✗";
    const cmp = entry.comparison;
    const summary = cmp.comparable
      ? `腋下 ${cmp.chestWidthPx.garmentArmpit}px vs 標定 ${cmp.chestWidthPx.printReference}px (Δ${cmp.chestWidthPx.deltaPx})`
      : cmp.reason;
    console.error(`${status} ${entry.template}: ${summary}`);
  }

  const silhouetteSummaryLines = ["", "Recommended silhouetteScale:"];
  for (const entry of entries) {
    const profileId = templateFileToProfileId(entry.template);
    if (!profileId || !entry.comparison?.comparable) continue;
    const label = profileId.replace(/^adult-/, "");
    silhouetteSummaryLines.push(
      label,
      String(entry.comparison.recommendedSilhouetteScaleRounded),
    );
  }
  if (silhouetteSummaryLines.length > 2) {
    console.error(silhouetteSummaryLines.join("\n"));
  }

  const reference = entries.find((e) => e.template === "adult-tshirt-white-front.png") ?? entries.find((e) => e.ok) ?? entries[0];

  const report = {
    schema: "template-calibration/v1",
    measuredAt,
    mode,
    purpose:
      "建立設計器模板座標基準；對照印刷座標系與 PNG 剪影量測，供校正決策（不修改 runtime）",
    codebase: codebase,
    templates: entries.map(({ artifacts, ...rest }) => rest),
    summary: reference
      ? {
          referenceTemplate: reference.template,
          printPxPerCm: codebase.printCoordinateSystem.pxPerCm,
          garmentPxPerCm:
            reference.garmentCoordinateSystem?.pxPerCm.fromProductM?.chest ??
            reference.garmentCoordinateSystem?.pxPerCm.fromLegacyM?.chest ??
            null,
          comparison: reference.comparison,
          recommendedNextSteps: [
            "檢視 public/guides/*-calibration.svg 視覺對照",
            "閱讀 comparison.decisionHints，決定是否動 ShirtVisualScale / template-metrics / 兩者都不動",
            "若僅視覺校正：優先調 GARMENT_TEMPLATE_OFFSET_PX 與領口錨點，再考慮 PNG scale",
          ],
        }
      : null,
    artifacts: entries.map((e) => ({
      template: e.template,
      ...e.artifacts,
    })),
  };

  const reportPath = path.join(OUT_DIR, "template-calibration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const templateProfilePaths = [];
  for (const entry of entries) {
    const profileId = templateFileToProfileId(entry.template);
    if (!profileId) continue;
    try {
      const profile = buildTemplateProfile(entry, codebase, measuredAt);
      const profilePath = writeTemplateProfile(profile);
      templateProfilePaths.push(profilePath);
      console.error(`✓ template profile: ${profile.id}.json`);
    } catch (err) {
      console.error(`✗ template profile ${profileId}: ${err.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        report: reportPath,
        mode,
        measured: entries.length,
        summary: report.summary,
        artifacts: report.artifacts,
        templateProfiles: templateProfilePaths,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
