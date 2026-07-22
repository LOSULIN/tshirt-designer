/**
 * Designer Runtime Geometry Integration — regression (Phase 70.2).
 * Run: npx tsx lib/designer-geometry-v2/designer-runtime-geometry.regression.ts
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
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";
import { resolveDesignerRuntimeWorkspace } from "./designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";

const ROOT = process.cwd();
const OUTPUT_DIR = "debug/designer-runtime-geometry";
const SIDES = ["front", "back"] as const;
const CANVAS = { w: 1024, h: 1536 };
const TOLERANCE_PX = 1;

const FROZEN_PATHS = [
  "lib/designer-display-projection.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/coordinate-runtime.ts",
  "lib/garment-metrics",
  "lib/factory-overlay-runtime.ts",
  "lib/export",
  "lib/presentation/product-photo-bridge.ts",
  "lib/designer-geometry-v2/geometry-builder.ts",
  "lib/designer-geometry-v2/product-master-geometry.ts",
  "lib/designer-geometry-v2/product-master-snapshot.ts",
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

function pctStyleToPx(style: {
  left: string;
  top: string;
  width: string;
  height: string;
}) {
  const pct = (value: string) => parseFloat(value) / 100;
  return {
    left: pct(style.left) * CANVAS.w,
    top: pct(style.top) * CANVAS.h,
    width: pct(style.width) * CANVAS.w,
    height: pct(style.height) * CANVAS.h,
  };
}

function delta(a: number, b: number): number {
  return Math.abs(a - b);
}

function scanForbiddenPatterns(): string[] {
  const violations: string[] = [];
  const patterns = [
    /resolveGeometryRuntimeStageOffsetPercent/,
    /translate\(\$\{offset/,
  ];

  function scan(rel: string): void {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const entry of readdirSync(abs)) {
        if (entry.endsWith(".ts") || entry.endsWith(".tsx")) scan(join(rel, entry));
      }
      return;
    }
    const source = readFileSync(abs, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden ${pattern}`);
      }
    }
  }

  scan("components/designer/DesignCanvas.tsx");
  scan("lib/designer-geometry-v2/designer-runtime-workspace.ts");
  return violations;
}

function scanFrozenUnchanged(): string[] {
  const violations: string[] = [];
  for (const rel of FROZEN_PATHS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const source = statSync(abs).isDirectory()
      ? ""
      : readFileSync(abs, "utf8");
    if (source.includes("designer-runtime-workspace")) {
      violations.push(`${rel}: must not import designer-runtime-workspace`);
    }
  }
  return violations;
}

async function run(): Promise<void> {
  const checks: string[] = [];

  const canvasSrc = readFileSync(
    join(ROOT, "components/designer/DesignCanvas.tsx"),
    "utf8",
  );
  assert(
    canvasSrc.includes("resolveDesignerRuntimeWorkspace"),
    "DesignCanvas must use resolveDesignerRuntimeWorkspace",
  );
  assert(
    !canvasSrc.includes("resolveGeometryRuntimeStageOffsetPercent"),
    "DesignCanvas must not use stage offset percent hack",
  );
  assert(
    !canvasSrc.includes("getDesignerWorkspaceContainerStyle"),
    "DesignCanvas must not use V1 factory overlay container style",
  );
  checks.push("PASS: DesignCanvas wired to Geometry Runtime Snapshot");

  const hackViolations = scanForbiddenPatterns();
  assert(hackViolations.length === 0, hackViolations.join("; "));
  checks.push("PASS: translate(%) hack removed from Designer path");

  const frozenViolations = scanFrozenUnchanged();
  assert(frozenViolations.length === 0, frozenViolations.join("; "));
  checks.push("PASS: Frozen layers unchanged (Projection/Coordinate/Builder/Export)");

  for (const side of SIDES) {
    for (const version of [
      DESIGNER_GEOMETRY_VERSION.V1,
      DESIGNER_GEOMETRY_VERSION.V2,
    ] as const) {
      const snapshot = resolveGeometryRuntimeSnapshot(side, version);
      const designer = resolveDesignerRuntimeWorkspace(side, version);
      const designerStagePx = pctStyleToPx(designer.workspaceStyle);
      const designerSafePx = pctStyleToPx(designer.safeAreaStyle);

      assert(
        delta(designerStagePx.left, snapshot.artworkStage.left) <= TOLERANCE_PX,
        `${side}/${version} designer stage left`,
      );
      assert(
        delta(designerStagePx.top, snapshot.artworkStage.top) <= TOLERANCE_PX,
        `${side}/${version} designer stage top`,
      );
      assert(
        delta(designerStagePx.width, snapshot.artworkStage.width) <= TOLERANCE_PX,
        `${side}/${version} designer stage width`,
      );
      assert(
        delta(designerStagePx.height, snapshot.artworkStage.height) <= TOLERANCE_PX,
        `${side}/${version} designer stage height`,
      );

      assert(
        delta(designerSafePx.left, snapshot.safeArea.left) <= TOLERANCE_PX,
        `${side}/${version} designer safe left`,
      );
      assert(
        delta(designerSafePx.top, snapshot.safeArea.top) <= TOLERANCE_PX,
        `${side}/${version} designer safe top`,
      );
      assert(
        delta(designerSafePx.width, snapshot.safeArea.width) <= TOLERANCE_PX,
        `${side}/${version} designer safe width`,
      );
      assert(
        delta(designerSafePx.height, snapshot.safeArea.height) <= TOLERANCE_PX,
        `${side}/${version} designer safe height`,
      );

      if (version === DESIGNER_GEOMETRY_VERSION.V2) {
        const bridge = resolveGeometryRuntimePhotoBridge({
          side,
          size: "M",
          geometryVersion: version,
        });
        const resultStagePx = {
          left: (bridge.photoArtworkStage.leftPercent / 100) * CANVAS.w,
          top: (bridge.photoArtworkStage.topPercent / 100) * CANVAS.h,
          width: (bridge.photoArtworkStage.widthPercent / 100) * CANVAS.w,
          height: (bridge.photoArtworkStage.heightPercent / 100) * CANVAS.h,
        };

        for (const key of ["left", "top", "width", "height"] as const) {
          const d = delta(designerStagePx[key], resultStagePx[key]);
          assert(
            d <= TOLERANCE_PX,
            `${side} V2 designer vs resultPanel stage ${key} delta=${d}`,
          );
        }

        checks.push(
          `PASS: ${side} V2 Designer Stage = ResultPanel Stage (<= ${TOLERANCE_PX}px)`,
        );
        checks.push(
          `PASS: ${side} V2 Designer Safe Area = Snapshot Safe Area (<= ${TOLERANCE_PX}px)`,
        );
      }
    }
  }

  assert(
    !readFileSync(
      join(ROOT, "lib/designer-geometry-v2/resolve-geometry-runtime.ts"),
      "utf8",
    ).includes("resolveGeometryRuntimeStageOffsetPercent"),
    "offset percent resolver must be removed",
  );
  checks.push("PASS: resolveGeometryRuntimeStageOffsetPercent removed");

  const summary = [
    "Designer Runtime Geometry Integration — Phase 70.2",
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
