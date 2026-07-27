/**
 * Phase 70.4 — Product Factory Anchor System regression.
 * Run: npx tsx lib/designer-geometry-v2/product-factory-anchor.regression.ts
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { getLayerDesignerDisplayCssPercent } from "@/lib/designer-display-projection";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import { buildGeometryProfileV2 } from "./geometry-builder";
import { resolveDesignerRuntimeWorkspace } from "./designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
  resolveEffectiveGeometryVersion,
  createDefaultGeometryRuntimeState,
} from "./geometry-runtime-state";
import {
  buildGeometryV2AssetRelativePath,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  GEOMETRY_V2_PRODUCT_CODE,
} from "./constants";
import {
  UA35001_PRODUCT_FACTORY_ANCHOR,
  buildProductMasterGeometryFromFactoryAnchor,
  hasProductFactoryAnchor,
  resolveFactoryAnchorRuntimeSnapshot,
  resolvePrintTopPxFromFactoryOrigin,
  resolveProductFactoryAnchor,
  resolveProductMasterFromFactoryAnchor,
} from "./product-factory-anchor";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import {
  hasRuntimeVisualCompensation,
  resolveRuntimeVisualCompensation,
} from "@/lib/presentation/visual-compensation";

const ROOT = process.cwd();
const TOLERANCE_PX = 1;
const CANVAS = { w: 1024, h: 1536 };
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/designer-display-projection.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/export",
  "lib/presentation/product-photo-bridge.ts",
  "components/designer/DesignCanvas.tsx",
];

const FORBIDDEN_RUNTIME_PATTERNS = [
  /buildGeometryProfileV2/,
  /geometry-builder-calibration/,
  /applyCollarBottomCalibration/,
];

let pass = true;
const checks: string[] = [];

function assert(label: string, condition: boolean): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    checks.push(`PASS: ${label}`);
    console.log(`PASS: ${label}`);
  }
}

function delta(a: number, b: number): number {
  return Math.abs(a - b);
}

function scanBuilderNotInRuntime(): string[] {
  const violations: string[] = [];
  for (const rel of RUNTIME_GUARD_PATHS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const source = statSync(abs).isDirectory()
      ? ""
      : readFileSync(abs, "utf8");
    if (!source) continue;
    for (const pattern of FORBIDDEN_RUNTIME_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: builder pattern in runtime consumer (${pattern})`);
      }
    }
  }
  return violations;
}

async function loadWhiteFrontBuilderCollarY(): Promise<number> {
  const asset = buildGeometryV2AssetRelativePath("white", "front");
  const { data, info } = await sharp(join(ROOT, asset))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const profile = buildGeometryProfileV2({
    side: "front",
    colorSlug: "white",
    sourceAsset: asset,
    buffer: { data, width: info.width, height: info.height },
  });
  return profile.collarBottom.y;
}

async function run(): Promise<void> {
console.log("=== Phase 70.4 Product Factory Anchor ===\n");

// --- Anchor exists ---
assert(
  "UA35001 Factory Anchor registered",
  hasProductFactoryAnchor(GEOMETRY_V2_PRODUCT_CODE),
);
const anchor = resolveProductFactoryAnchor(GEOMETRY_V2_PRODUCT_CODE);
assert("resolveProductFactoryAnchor returns UA35001", anchor != null);
assert(
  "Anchor source is official product definition",
  anchor?.source === "official-product-definition",
);

// --- Snapshot from anchor ---
const masterFromAnchor = buildProductMasterGeometryFromFactoryAnchor(
  UA35001_PRODUCT_FACTORY_ANCHOR,
);
assert(
  "Product Master derivation is product-factory-anchor",
  masterFromAnchor.derivation === "product-factory-anchor",
);
assert(
  "Frozen snapshot matches anchor-built master",
  JSON.stringify(UA35001_PRODUCT_MASTER_SNAPSHOT) ===
    JSON.stringify(masterFromAnchor),
);

for (const side of SIDES) {
  const anchorSide = side === "front" ? anchor!.front : anchor!.back;
  const masterSide = side === "front" ? masterFromAnchor.front : masterFromAnchor.back;

  assert(
    `V2 ${side} factory origin from anchor`,
    masterSide.factoryOrigin.x === anchorSide.factoryOrigin.x &&
      masterSide.factoryOrigin.y === anchorSide.factoryOrigin.y,
  );

  const expectedPrintTop = resolvePrintTopPxFromFactoryOrigin(
    side,
    anchorSide.factoryOrigin.y,
  );
  assert(
    `V2 ${side} print top from anchor formula`,
    delta(expectedPrintTop, masterSide.artworkStage.top) <= TOLERANCE_PX,
  );
}

// --- Runtime uses anchor, not builder ---
for (const side of SIDES) {
  const runtime = resolveGeometryRuntimeSnapshot(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  const anchorRuntime = resolveFactoryAnchorRuntimeSnapshot(side);
  assert(
    `V2 ${side} resolveGeometryRuntimeSnapshot uses Factory Anchor`,
    runtime.factoryOrigin.y === anchorRuntime.factoryOrigin.y &&
      runtime.artworkStage.top === anchorRuntime.artworkStage.top,
  );
}

const builderCollarY = await loadWhiteFrontBuilderCollarY();
assert(
  "Builder collar Y differs from Factory Anchor (builder not runtime SSOT)",
  builderCollarY !== UA35001_PRODUCT_FACTORY_ANCHOR.front.collarBottom.y,
);

for (const side of SIDES) {
  const runtime = resolveGeometryRuntimeSnapshot(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  const anchorY =
    side === "front"
      ? UA35001_PRODUCT_FACTORY_ANCHOR.front.collarBottom.y
      : UA35001_PRODUCT_FACTORY_ANCHOR.back.collarBottom.y;
  assert(
    `V2 ${side} runtime collar Y equals Factory Anchor (${anchorY})`,
    runtime.collar.y === anchorY,
  );
}

// --- Designer == ResultPanel ---
const sampleRect = { x_cm: 5, y_cm: 8, width_cm: 16, height_cm: 10 };
for (const side of SIDES) {
  const designer = resolveDesignerRuntimeWorkspace(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  const bridge = resolveGeometryRuntimePhotoBridge({
    side,
    size: "M",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  const runtimeComp = resolveRuntimeVisualCompensation({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    surface: "resultPanel",
  });
  assert(
    `V2 ${side} no visual compensation wrapper`,
    !hasRuntimeVisualCompensation(runtimeComp),
  );

  const stageDelta = delta(
    designer.snapshot.artworkStage.top,
    (bridge.photoArtworkStage.topPercent / 100) * CANVAS.h,
  );
  assert(
    `V2 ${side} Designer Stage == ResultPanel Stage`,
    stageDelta <= TOLERANCE_PX,
  );

  const css = getLayerDesignerDisplayCssPercent(
    sampleRect,
    bridge.designerDisplayContext,
  );
  const stageTop = designer.snapshot.artworkStage.top;
  const stageHeight = designer.snapshot.artworkStage.height;
  const designerArtworkTop =
    stageTop + (parseFloat(css.top) / 100) * stageHeight;
  const resultArtworkTop =
    (bridge.photoArtworkStage.topPercent / 100) * CANVAS.h +
    (parseFloat(css.top) / 100) * stageHeight;
  assert(
    `V2 ${side} Designer Artwork == ResultPanel Artwork`,
    delta(designerArtworkTop, resultArtworkTop) <= TOLERANCE_PX,
  );
}

// --- Export guard unchanged ---
assert(
  "Production ACTIVE_DESIGNER_GEOMETRY_VERSION is V2",
  ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V2,
);
for (const surface of ["png", "zip", "pdf", "email"] as const) {
  const version = resolveEffectiveGeometryVersion(
    {
      ...createDefaultGeometryRuntimeState(),
      geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    },
    surface,
  );
  assert(
    `Export ${surface.toUpperCase()} default V1`,
    version === DESIGNER_GEOMETRY_VERSION.V1,
  );
}
assert(
  "Export toggles default OFF",
  !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.png,
);

// --- Builder isolation from runtime consumers ---
const violations = scanBuilderNotInRuntime();
assert(
  `Runtime consumers do not import builder (${violations.length} violations)`,
  violations.length === 0,
);
if (violations.length > 0) {
  violations.forEach((v) => console.error(`  ${v}`));
}

// --- Audit trail ---
console.log("\n--- Runtime Audit ---");
console.log("UA35001 → Factory Anchor → Snapshot → Designer / ResultPanel");
console.log(
  `  Front collar: (${anchor!.front.factoryOrigin.x}, ${anchor!.front.factoryOrigin.y})`,
);
console.log(
  `  Front print top: ${resolvePrintTopPxFromFactoryOrigin("front", anchor!.front.factoryOrigin.y)} px`,
);
console.log(
  `  Back collar: (${anchor!.back.factoryOrigin.x}, ${anchor!.back.factoryOrigin.y})`,
);
console.log(
  `  Back print top: ${resolvePrintTopPxFromFactoryOrigin("back", anchor!.back.factoryOrigin.y)} px`,
);
console.log(
  `  Builder white/front collar (fallback only): ${builderCollarY} px`,
);
console.log("  Builder: NOT used in V2 runtime path when anchor exists");

const resolvedMaster = resolveProductMasterFromFactoryAnchor();
assert("resolveProductMasterFromFactoryAnchor returns master", resolvedMaster != null);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
