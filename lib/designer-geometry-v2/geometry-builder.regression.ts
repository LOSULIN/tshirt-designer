/**
 * Designer Geometry V2 Builder regression.
 * Run: npx tsx lib/designer-geometry-v2/geometry-builder.regression.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  GEOMETRY_V2_COLOR_SLUGS,
  buildGeometryProfileV2,
  buildGeometryV2AssetRelativePath,
  formatGeometryValidationReport,
  getActiveDesignerGeometryVersion,
  validateGeometryProfileV2,
} from "./index";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation/product-photo-bridge.ts",
  "lib/designer-display-projection.ts",
  "components/designer/ResultPanelProductPreviewDesigner.tsx",
  "lib/export/product-export.ts",
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function scanRuntimeIsolation(): string[] {
  const violations: string[] = [];
  function scanPath(rel: string): void {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const entry of readdirSync(abs)) {
        if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          scanPath(join(rel, entry));
        }
      }
      return;
    }
    const source = readFileSync(abs, "utf8");
    if (
      /from ["'].*geometry-builder/.test(source) ||
      /buildGeometryProfileV2/.test(source)
    ) {
      if (!rel.includes("designer-geometry-v2")) {
        violations.push(`${rel}: imports geometry builder outside V2 module`);
      }
    }
  }
  for (const rel of RUNTIME_GUARD_PATHS) scanPath(rel);
  return violations;
}

async function loadRaw(assetPath: string) {
  const absolutePath = join(ROOT, assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertGeometryV2Canvas(info.width, info.height);
  return { data, width: info.width, height: info.height };
}

async function run(): Promise<void> {
  const checks: string[] = [];
  const validationReports: string[] = [];
  const profiles = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "active geometry version must remain v1",
  );
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");

  assert(
    getActiveDesignerGeometryVersion() === DESIGNER_GEOMETRY_VERSION.V1,
    "runtime resolver must return v1",
  );
  checks.push("getActiveDesignerGeometryVersion() = v1");

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push(`runtime isolation: 0 builder imports outside V2 module`);

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      const buffer = await loadRaw(assetPath);
      const profile = buildGeometryProfileV2({
        side,
        colorSlug,
        sourceAsset: assetPath,
        buffer,
      });
      const validation = validateGeometryProfileV2(profile);
      profiles.push({ profile, validation });
      validationReports.push(formatGeometryValidationReport(profile, validation));
      assert(validation.pass, `${colorSlug}/${side}: ${validation.issues[0]?.message}`);
    }
  }
  checks.push(`built + validated ${profiles.length} geometry profiles`);

  const whiteFront = profiles.find(
    (p) => p.profile.colorSlug === "white" && p.profile.side === "front",
  )!.profile;
  const whiteBack = profiles.find(
    (p) => p.profile.colorSlug === "white" && p.profile.side === "back",
  )!.profile;

  assert(
    whiteFront.collarBottom.y > whiteFront.alphaBoundingBox.top,
    "white front collar bottom must be below alpha bbox top",
  );
  checks.push(
    `white/front collarBottom.y=${whiteFront.collarBottom.y} (alphaTop=${whiteFront.alphaBoundingBox.top})`,
  );

  console.log("=== Phase 69.2 Geometry Builder Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);

  console.log("\n--- White Front Profile ---");
  console.log(
    JSON.stringify(
      {
        collarBottom: whiteFront.collarBottom,
        factoryOrigin: whiteFront.factoryOrigin,
        artworkStage: whiteFront.artworkStage,
        safeArea: whiteFront.safeArea,
        shoulder: whiteFront.shoulder,
        neck: {
          widthPx: whiteFront.neck.widthPx,
          narrowestY: whiteFront.neck.narrowestY,
        },
      },
      null,
      2,
    ),
  );

  console.log("\n--- White Back Profile ---");
  console.log(
    JSON.stringify(
      {
        collarBottom: whiteBack.collarBottom,
        factoryOrigin: whiteBack.factoryOrigin,
        artworkStage: whiteBack.artworkStage,
        safeArea: whiteBack.safeArea,
      },
      null,
      2,
    ),
  );

  console.log("\n--- Validation (all assets) ---");
  for (const report of validationReports) console.log(report);

  console.log("\nALL PASS");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
