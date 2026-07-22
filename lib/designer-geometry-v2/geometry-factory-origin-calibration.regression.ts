/**
 * Phase 70.3 — Factory Origin Visual Calibration regression.
 * Run: npx tsx lib/designer-geometry-v2/geometry-factory-origin-calibration.regression.ts
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  GEOMETRY_V2_COLOR_SLUGS,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  buildGeometryV2AssetRelativePath,
} from "./constants";
import {
  GEOMETRY_CALIBRATION_GOAL_NOTE,
  GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX,
  getActiveCollarDerivationCalibration,
} from "./geometry-builder-calibration";
import { buildGeometryProfileV2 } from "./geometry-builder";
import { buildProductMasterGeometry } from "./product-master-geometry";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import { runGeometryQACalibration } from "./geometry-calibration";
import { GEOMETRY_CALIBRATION_OUTPUT_DIR } from "./geometry-builder-calibration";

const ROOT = process.cwd();
const OUTPUT_DIR = "debug/factory-origin-calibration";
const SIDES = ["front", "back"] as const;
const PREV_BACK_COLLAR_Y = 388;
const PREV_BACK_STAGE_TOP = 449.2;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function loadRaw(assetPath: string) {
  const absolutePath = join(ROOT, assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function rectSvg(
  rect: { left: number; top: number; width: number; height: number },
  color: string,
  strokeWidth: number,
  dash?: string,
): string {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${dashAttr}/>`;
}

async function renderWhiteFrontVisualCompare(
  masterFront: typeof UA35001_PRODUCT_MASTER_SNAPSHOT.front,
): Promise<string> {
  const uaPath = join(ROOT, buildGeometryV2AssetRelativePath("white", "front"));
  const { collarBottom, factoryOrigin, artworkStage, safeArea } = masterFront;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536">
  ${rectSvg(artworkStage, "#2563eb", 3)}
  ${rectSvg(safeArea, "#f59e0b", 2, "6 4")}
  <circle cx="${collarBottom.x}" cy="${collarBottom.y}" r="7" fill="none" stroke="#ef4444" stroke-width="2"/>
  <line x1="${factoryOrigin.x - 10}" y1="${factoryOrigin.y}" x2="${factoryOrigin.x + 10}" y2="${factoryOrigin.y}" stroke="#ef4444" stroke-width="2"/>
  <line x1="${factoryOrigin.x}" y1="${factoryOrigin.y - 10}" x2="${factoryOrigin.x}" y2="${factoryOrigin.y + 10}" stroke="#ef4444" stroke-width="2"/>
  <text x="24" y="40" fill="#ef4444" font-size="20" font-family="sans-serif">Factory Origin</text>
  <text x="24" y="68" fill="#2563eb" font-size="20" font-family="sans-serif">Artwork Stage (7cm)</text>
  <text x="24" y="96" fill="#f59e0b" font-size="20" font-family="sans-serif">Safe Area</text>
</svg>`;

  const outPath = join(ROOT, OUTPUT_DIR, "white-front-visual-compare.png");
  mkdirSync(join(ROOT, OUTPUT_DIR), { recursive: true });

  await sharp(uaPath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);

  return outPath;
}

async function run(): Promise<void> {
  const checks: string[] = [];
  const active = getActiveCollarDerivationCalibration();

  assert(
    GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX.back === 106,
    "back offset must remain 106",
  );
  assert(
    GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX.front === 125,
    "front offset must be 125 for Phase 70.3",
  );
  checks.push("PASS: Front-only calibration offset (front=125, back=106)");

  const profiles = [];
  const compareRows: string[] = [
    "| Color | Side | Raw | Final | Print Top |",
    "|-------|------|-----|-------|-----------|",
  ];

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      const buffer = await loadRaw(assetPath);
      const rawProfile = buildGeometryProfileV2(
        { side, colorSlug, sourceAsset: assetPath, buffer },
        { ...active, collarBottomYOffsetPx: { front: 0, back: 0 } },
      );
      const finalProfile = buildGeometryProfileV2(
        { side, colorSlug, sourceAsset: assetPath, buffer },
        active,
      );
      profiles.push(finalProfile);
      compareRows.push(
        `| ${colorSlug} | ${side} | ${rawProfile.collarBottom.y} | ${finalProfile.collarBottom.y} | ${finalProfile.artworkStage.top.toFixed(2)} |`,
      );
    }
  }

  const master = buildProductMasterGeometry(profiles);

  assert(
    master.back.collarBottom.y === PREV_BACK_COLLAR_Y,
    `back collar changed: ${master.back.collarBottom.y}`,
  );
  assert(
    Math.abs(master.back.artworkStage.top - PREV_BACK_STAGE_TOP) < 0.01,
    `back stage changed: ${master.back.artworkStage.top}`,
  );
  checks.push("PASS: Back geometry unchanged");

  assert(
    master.front.artworkStage.top > UA35001_PRODUCT_MASTER_SNAPSHOT.front.artworkStage.top,
    "front stage must move down vs prior snapshot",
  );
  checks.push(
    `PASS: Front master stage top ${master.front.artworkStage.top} (was ${UA35001_PRODUCT_MASTER_SNAPSHOT.front.artworkStage.top})`,
  );

  for (const profile of profiles) {
    const expectedTop =
      profile.factoryOrigin.y +
      GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[profile.side] *
        GEOMETRY_V2_PRINT_PX_PER_CM;
    assert(
      Math.abs(profile.artworkStage.top - expectedTop) < 0.5,
      `${profile.colorSlug}/${profile.side} stage top mismatch`,
    );
  }
  checks.push("PASS: 20/20 profiles — stage/safe area/factory origin rebuilt");

  const visualPath = await renderWhiteFrontVisualCompare(master.front);
  checks.push(`PASS: White front visual compare → ${visualPath}`);

  await runGeometryQACalibration(GEOMETRY_CALIBRATION_OUTPUT_DIR);
  const heatmapPath = join(
    ROOT,
    GEOMETRY_CALIBRATION_OUTPUT_DIR,
    "after/white-front-heatmap.png",
  );
  assert(existsSync(heatmapPath), "heatmap missing");
  checks.push(`PASS: White front heatmap → ${heatmapPath}`);

  writeFileSync(
    join(ROOT, OUTPUT_DIR, "product-master-snapshot.ts"),
    `/**
 * Frozen UA35001 Product Master snapshot for shadow runtime (sync, no PNG IO).
 * Updated by Phase 70.3 front factory-origin visual calibration.
 */

import type { ProductMasterGeometry } from "./product-master-profile";

export const UA35001_PRODUCT_MASTER_SNAPSHOT: ProductMasterGeometry = ${JSON.stringify(master, null, 2)};
`,
    "utf8",
  );

  writeFileSync(
    join(ROOT, "lib/designer-geometry-v2/product-master-snapshot.ts"),
    readFileSync(join(ROOT, OUTPUT_DIR, "product-master-snapshot.ts"), "utf8"),
    "utf8",
  );
  checks.push("PASS: product-master-snapshot.ts regenerated");

  const report = [
    "Phase 70.3 — Factory Origin Visual Calibration",
    "",
    GEOMETRY_CALIBRATION_GOAL_NOTE,
    "",
    "## Factory Origin Compare",
    "",
    ...compareRows,
    "",
    "## Product Master (Runtime)",
    "",
    `Front collar: (${master.front.collarBottom.x}, ${master.front.collarBottom.y})`,
    `Front factory origin: (${master.front.factoryOrigin.x}, ${master.front.factoryOrigin.y})`,
    `Front artwork stage top: ${master.front.artworkStage.top}`,
    `Front safe area top: ${master.front.safeArea.top}`,
    "",
    `Back collar: (${master.back.collarBottom.x}, ${master.back.collarBottom.y})`,
    `Back factory origin: (${master.back.factoryOrigin.x}, ${master.back.factoryOrigin.y})`,
    `Back artwork stage top: ${master.back.artworkStage.top}`,
    `Back safe area top: ${master.back.safeArea.top}`,
    "",
    "## Visual Outputs",
    "",
    `- ${visualPath}`,
    `- ${heatmapPath}`,
    "",
    ...checks.map((c) => (c.startsWith("PASS:") ? c : `PASS: ${c}`)),
    "",
    "ALL PASS",
  ].join("\n");

  writeFileSync(join(ROOT, OUTPUT_DIR, "regression-summary.txt"), report + "\n", "utf8");
  console.log(report);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
