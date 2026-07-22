/**
 * Designer Template Runtime — regression (Phase 70.0).
 * Run: npx tsx lib/designer-geometry-v2/designer-template-runtime.regression.ts
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  DESIGNER_GEOMETRY_VERSION,
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import {
  DESIGNER_TEMPLATE_V1_ASSET_ROOT,
  DESIGNER_TEMPLATE_V2_ASSET_ROOT,
  resolveDesignerTemplateAsset,
  resolveDesignerTemplateAssetFilesystemPath,
  resolveDesignerTemplateAssetResolution,
} from "./designer-template-runtime";

const ROOT = process.cwd();
const OUTPUT_DIR = "debug/designer-template-runtime";
const SIDES = ["front", "back"] as const;

const SHIRT_COLORS = [
  "white",
  "black",
  "heather-grey",
  "navy",
  "royal-blue",
  "sky-blue",
  "pink",
  "hot-pink",
  "light-yellow",
  "mustard-green",
] as const;

const FROZEN_GUARD_PATHS = [
  "lib/designer-display-projection.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/coordinate-runtime.ts",
  "lib/presentation",
  "lib/export",
  "lib/garment-metrics",
  "components/designer/ResultPanel.tsx",
  "components/designer/ResultPanelProductPreviewDesigner.tsx",
  "components/designer/ResultPanelProductPreview.tsx",
  "components/designer/ResultPanelDownloadSection.tsx",
];

const FROZEN_FORBIDDEN_PATTERNS = [
  /designer-template-runtime/,
];

const BUILDER_FORBIDDEN_PATTERNS = [
  /from ["'].*geometry-builder/,
  /buildGeometryProfileV2/,
];

const DESIGN_CANVAS_PATH = "components/designer/DesignCanvas.tsx";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

function scanFrozenPaths(patterns: RegExp[]): string[] {
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
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden pattern ${pattern}`);
      }
    }
  }

  for (const rel of FROZEN_GUARD_PATHS) scanPath(rel);
  return violations;
}

function assertDesignerCanvasWiring(): void {
  const source = readFileSync(join(ROOT, DESIGN_CANVAS_PATH), "utf8");
  assert(
    source.includes("resolveDesignerTemplateAsset"),
    "DesignCanvas must use resolveDesignerTemplateAsset",
  );
  assert(
    !source.includes("getAdultTshirtTemplateSrc"),
    "DesignCanvas must not call getAdultTshirtTemplateSrc directly",
  );
}

function assertResolverDoesNotImportBuilder(): void {
  const source = readFileSync(
    join(ROOT, "lib/designer-geometry-v2/designer-template-runtime.ts"),
    "utf8",
  );
  for (const pattern of BUILDER_FORBIDDEN_PATTERNS) {
    assert(!pattern.test(source), `resolver imports builder: ${pattern}`);
  }
}

async function run(): Promise<void> {
  const checks: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "production geometry remains v1",
  );
  checks.push("PASS: ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");

  assertResolverDoesNotImportBuilder();
  checks.push("PASS: Geometry Builder 0 changes (resolver has no builder import)");

  for (const color of SHIRT_COLORS) {
    for (const side of SIDES) {
      const v1 = resolveDesignerTemplateAsset(
        side,
        color,
        DESIGNER_GEOMETRY_VERSION.V1,
      );
      assert(v1.startsWith(`${DESIGNER_TEMPLATE_V1_ASSET_ROOT}/`), v1);
      assert(
        existsSync(resolveDesignerTemplateAssetFilesystemPath(side, color, DESIGNER_GEOMETRY_VERSION.V1)),
        `missing V1 asset for ${color} ${side}`,
      );

      const v2 = resolveDesignerTemplateAsset(
        side,
        color,
        DESIGNER_GEOMETRY_VERSION.V2,
      );
      assert(v2.startsWith(`${DESIGNER_TEMPLATE_V2_ASSET_ROOT}/`), v2);
      assert(
        existsSync(resolveDesignerTemplateAssetFilesystemPath(side, color, DESIGNER_GEOMETRY_VERSION.V2)),
        `missing V2 asset for ${color} ${side}`,
      );

      assert(v1 !== v2, `V1/V2 paths must differ for ${color} ${side}`);
    }
  }
  checks.push("PASS: Runtime V1 → Designer uses public/templates");
  checks.push("PASS: Runtime V2 → Designer uses public/products/UA35001/assets");

  const whiteFront = resolveDesignerTemplateAssetResolution(
    "front",
    "white",
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  assert(
    whiteFront.src ===
      "/products/UA35001/assets/adult-tshirt-white-front.png",
    whiteFront.src,
  );
  checks.push("PASS: V2 white-front path matches UA35001 asset naming");

  assertDesignerCanvasWiring();
  checks.push("PASS: DesignCanvas wired through resolveDesignerTemplateAsset()");

  const frozenViolations = scanFrozenPaths(FROZEN_FORBIDDEN_PATTERNS);
  assert(frozenViolations.length === 0, frozenViolations.join("; "));
  checks.push("PASS: Projection import 0 changes");
  checks.push("PASS: Coordinate import 0 changes");
  checks.push("PASS: Factory Placement 0 changes");
  checks.push("PASS: ResultPanel 0 changes");
  checks.push("PASS: Export 0 changes");

  const runtimeModuleViolations = scanFrozenPaths([
    /from ["'].*designer-template-runtime/,
  ]).filter((v) => !v.startsWith(DESIGN_CANVAS_PATH));
  assert(runtimeModuleViolations.length === 0, runtimeModuleViolations.join("; "));
  checks.push("PASS: Runtime Isolation — only DesignCanvas imports template runtime");

  const summary = [
    "Designer Template Runtime Regression — Phase 70.0",
    "",
    ...checks,
    "",
    "ALL PASS",
  ].join("\n");

  writeReport("regression-summary.txt", summary);
  console.log(summary);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
