/**
 * Phase 71.0 — Export Runtime Snapshot integration regression.
 * Run: npx tsx lib/designer-geometry-v2/export-runtime-snapshot.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import { resolveDesignerRuntimeWorkspace } from "./designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import {
  resolveEffectiveExportGeometryVersion,
  resolveExportGeometryVersionFromToggle,
  resolveExportRuntimeGeometry,
  resolveExportRuntimeSnapshot,
} from "./export-runtime-snapshot";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/export-runtime-snapshot.ts";
const TOLERANCE_PX = 1;
const CANVAS = { w: 1024, h: 1536 };
const SIDES = ["front", "back"] as const;

const FORBIDDEN_ADAPTER_IMPORTS = [
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*geometry-builder-calibration/,
  /from ["'][^"']*product-master-snapshot/,
  /from ["'][^"']*product-master-geometry/,
  /from ["'][^"']*product-factory-anchor/,
  /from ["'][^"']*\/shadow-runtime["']/,
  /from ["'][^"']*shadow-render/,
  /buildGeometryProfile/,
  /buildProductMaster/,
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

function compareRect(
  label: string,
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): void {
  for (const key of ["left", "top", "width", "height"] as const) {
    const d = delta(a[key], b[key]);
    assert(`${label} ${key} Δ=${d.toFixed(2)}px`, d <= TOLERANCE_PX);
  }
}

function scanAdapterIsolation(): string[] {
  const abs = join(ROOT, ADAPTER_PATH);
  if (!existsSync(abs)) return [`${ADAPTER_PATH} missing`];
  const source = readFileSync(abs, "utf8");
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_ADAPTER_IMPORTS) {
    if (pattern.test(source)) {
      violations.push(`${ADAPTER_PATH}: forbidden import ${pattern}`);
    }
  }
  if (!source.includes("resolveGeometryRuntimeSnapshot")) {
    violations.push(`${ADAPTER_PATH}: must delegate to resolveGeometryRuntimeSnapshot`);
  }
  return violations;
}

console.log("=== Phase 71.0 Export Runtime Snapshot ===\n");

// --- Adapter isolation ---
const isolationViolations = scanAdapterIsolation();
assert(
  `Export adapter isolation (${isolationViolations.length} violations)`,
  isolationViolations.length === 0,
);

// --- Snapshot identity ---
for (const side of SIDES) {
  for (const version of [
    DESIGNER_GEOMETRY_VERSION.V1,
    DESIGNER_GEOMETRY_VERSION.V2,
  ] as const) {
    const runtime = resolveGeometryRuntimeSnapshot(side, version);
    const exportSnap = resolveExportRuntimeSnapshot(side, version);
    assert(
      `Export Runtime Snapshot == Geometry Runtime Snapshot (${side}/${version})`,
      JSON.stringify(runtime) === JSON.stringify(exportSnap),
    );

    const exportGeo = resolveExportRuntimeGeometry(side, version);
    assert(
      `${side}/${version} export printTop == artworkStage.top`,
      exportGeo.printTop === exportSnap.artworkStage.top,
    );
    assert(
      `${side}/${version} export collarBottom == snapshot.collar`,
      exportGeo.collarBottom.x === exportSnap.collar.x &&
        exportGeo.collarBottom.y === exportSnap.collar.y,
    );
    compareRect(
      `${side}/${version} export artworkStage`,
      exportGeo.artworkStage,
      runtime.artworkStage,
    );
    compareRect(
      `${side}/${version} export safeArea`,
      exportGeo.safeArea,
      runtime.safeArea,
    );
    assert(
      `${side}/${version} factory origin match`,
      delta(exportGeo.factoryOrigin.y, runtime.factoryOrigin.y) <= TOLERANCE_PX,
    );
  }
}

// --- Designer / ResultPanel / Export compare (V2) ---
const compareRows: string[] = [
  "| Surface | Stage Top | Safe Top | Factory Origin Y |",
  "|---------|-----------|----------|------------------|",
];

for (const side of SIDES) {
  const version = DESIGNER_GEOMETRY_VERSION.V2;
  const designer = resolveDesignerRuntimeWorkspace(side, version);
  const bridge = resolveGeometryRuntimePhotoBridge({
    side,
    size: "M",
    geometryVersion: version,
  });
  const exportGeo = resolveExportRuntimeGeometry(side, version);

  const designerStageTop = designer.snapshot.artworkStage.top;
  const resultStageTop =
    (bridge.photoArtworkStage.topPercent / 100) * CANVAS.h;
  const exportStageTop = exportGeo.artworkStage.top;

  compareRows.push(
    `| Designer ${side} | ${designerStageTop.toFixed(2)} | ${designer.snapshot.safeArea.top.toFixed(2)} | ${designer.snapshot.factoryOrigin.y.toFixed(2)} |`,
  );
  compareRows.push(
    `| ResultPanel ${side} | ${resultStageTop.toFixed(2)} | ${designer.snapshot.safeArea.top.toFixed(2)} | ${designer.snapshot.factoryOrigin.y.toFixed(2)} |`,
  );
  compareRows.push(
    `| Export Runtime ${side} | ${exportStageTop.toFixed(2)} | ${exportGeo.safeArea.top.toFixed(2)} | ${exportGeo.factoryOrigin.y.toFixed(2)} |`,
  );

  assert(
    `V2 ${side} Designer == Export Runtime stage top`,
    delta(designerStageTop, exportStageTop) <= TOLERANCE_PX,
  );
  assert(
    `V2 ${side} ResultPanel == Export Runtime stage top`,
    delta(resultStageTop, exportStageTop) <= TOLERANCE_PX,
  );
  assert(
    `V2 ${side} Designer == Export Runtime safe area top`,
    delta(designer.snapshot.safeArea.top, exportGeo.safeArea.top) <=
      TOLERANCE_PX,
  );
  assert(
    `V2 ${side} Designer == Export Runtime factory origin`,
    delta(designer.snapshot.factoryOrigin.y, exportGeo.factoryOrigin.y) <=
      TOLERANCE_PX,
  );
}

// --- Export guard ---
assert(
  "Production ACTIVE_DESIGNER_GEOMETRY_VERSION is V1",
  ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
);

const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
};

for (const surface of ["png", "zip", "pdf", "email"] as const) {
  assert(
    `Export ${surface.toUpperCase()} toggle default OFF`,
    !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES[surface],
  );
  assert(
    `Export ${surface.toUpperCase()} default version V1`,
    resolveEffectiveExportGeometryVersion(v2State, surface) ===
      DESIGNER_GEOMETRY_VERSION.V1,
  );
  assert(
    `Export ${surface.toUpperCase()} production locked V1`,
    resolveEffectiveExportGeometryVersion(v2State, surface, {
      productionLocked: true,
    }) === DESIGNER_GEOMETRY_VERSION.V1,
  );
}

const devOnState = {
  ...v2State,
  exportRuntime: { png: true, zip: true, pdf: true, email: true },
};
assert(
  "Dev export toggle ON → V2 snapshot version",
  resolveEffectiveExportGeometryVersion(devOnState, "png") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "resolveExportGeometryVersionFromToggle OFF → V1",
  resolveExportGeometryVersionFromToggle(
    DESIGNER_GEOMETRY_VERSION.V2,
    false,
  ) === DESIGNER_GEOMETRY_VERSION.V1,
);
assert(
  "resolveExportGeometryVersionFromToggle ON → V2",
  resolveExportGeometryVersionFromToggle(
    DESIGNER_GEOMETRY_VERSION.V2,
    true,
    { productionLocked: false },
  ) === DESIGNER_GEOMETRY_VERSION.V2,
);

const prev = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
assert("isGeometryRuntimeProductionLocked in production", isGeometryRuntimeProductionLocked());
process.env.NODE_ENV = prev ?? "development";

console.log("\n--- Runtime Compare (V2) ---");
console.log(compareRows.join("\n"));

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
