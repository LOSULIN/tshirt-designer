/**
 * Designer Geometry V2 — Geometry Runtime Switch regression (Phase 69.6).
 * Run: npx tsx lib/designer-geometry-v2/geometry-runtime-switch.regression.ts
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
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
} from "./geometry-version";
import {
  DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
} from "./geometry-debug-types";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
  isGeometryRuntimeDevConsoleAvailable,
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import {
  resolveGeometryRuntime,
  resolveGeometryRuntimeForSurface,
  resolveGeometryRuntimeSnapshot,
} from "./resolve-geometry-runtime";

const ROOT = process.cwd();
const OUTPUT_DIR = "debug/geometry-runtime-switch";
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation",
  "lib/designer-display-projection.ts",
  "lib/export",
  "app",
];

const COMPONENT_GUARD_PATHS = ["components/designer"];

const ALLOWED_COMPONENT_RUNTIME_IMPORTS = [
  /geometry-runtime-context/,
  /resolve-geometry-runtime/,
  /geometry-runtime-photo-bridge/,
  /geometry-runtime-export/,
  /designer-template-runtime/,
  /designer-runtime-workspace/,
  /geometry-version/,
  /geometry-debug-types/,
  /GeometryDebugConsole/,
  /GeometryRuntimeDebugOverlay/,
];

const FORBIDDEN_COMPONENT_RUNTIME_IMPORTS = [
  /from ["'].*designer-geometry-v2\/shadow-runtime/,
  /from ["'].*designer-geometry-v2\/shadow-render/,
  /from ["'].*designer-geometry-v2\/geometry-builder/,
  /from ["'].*designer-geometry-v2\/geometry-debug-overlay/,
  /from ["'].*designer-geometry-v2\/geometry-debug-render/,
  /from ["'].*designer-geometry-v2["']/,
  /buildGeometryProfileV2/,
  /compareGeometryShadow/,
  /GeometryShadowRuntime/,
  /getActiveDesignerGeometryVersion/,
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

function scanComponentRuntimeIsolation(): string[] {
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
    const hasRuntimeImport = source.includes("designer-geometry-v2");
    if (!hasRuntimeImport) return;

    const allowed = ALLOWED_COMPONENT_RUNTIME_IMPORTS.some((pattern) =>
      pattern.test(source),
    );
    if (!allowed) {
      violations.push(`${rel}: unexpected designer-geometry-v2 import`);
    }

    for (const pattern of FORBIDDEN_COMPONENT_RUNTIME_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden geometry runtime import (${pattern})`);
      }
    }
  }

  for (const rel of COMPONENT_GUARD_PATHS) scanPath(rel);
  return violations;
}

function scanFrozenLayerImports(): string[] {
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
    if (rel.includes("designer-geometry-v2")) return;
    const source = readFileSync(abs, "utf8");
    if (/geometry-runtime-context/.test(source)) {
      violations.push(`${rel}: frozen layer must not import geometry-runtime-context`);
    }
  }

  for (const rel of RUNTIME_GUARD_PATHS) scanPath(rel);
  return violations;
}

function assertNoCircularRuntimeImports(): void {
  const runtimeModules = [
    "geometry-runtime-state.ts",
    "geometry-runtime-types.ts",
    "resolve-geometry-runtime.ts",
    "geometry-runtime-photo-bridge.ts",
  ];
  for (const file of runtimeModules) {
    const abs = join(ROOT, "lib/designer-geometry-v2", file);
    assert(existsSync(abs), `${file} must exist`);
    const source = readFileSync(abs, "utf8");
    assert(
      !source.includes("geometry-runtime-context"),
      `${file} must not import React context (avoids circular deps)`,
    );
  }
}

async function run(): Promise<void> {
  const checks: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION must remain v1",
  );
  checks.push("PASS: ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");

  const defaults = createDefaultGeometryRuntimeState();
  assert(
    defaults.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
    "default geometryVersion must be v1",
  );
  checks.push("PASS: Geometry Runtime Context defaults to V1");

  let state = createDefaultGeometryRuntimeState();
  assert(
    resolveEffectiveGeometryVersion(state, "designer") ===
      DESIGNER_GEOMETRY_VERSION.V1,
    "V1 designer",
  );
  state = {
    ...state,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  };
  assert(
    resolveEffectiveGeometryVersion(state, "designer") ===
      DESIGNER_GEOMETRY_VERSION.V2,
    "V2 designer",
  );
  state = {
    ...state,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  };
  assert(
    resolveEffectiveGeometryVersion(state, "designer") ===
      DESIGNER_GEOMETRY_VERSION.V1,
    "V1 designer after switch back",
  );
  checks.push("PASS: V1→V2→V1 switch normal");

  state = {
    ...createDefaultGeometryRuntimeState(),
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  };
  const designerVersion = resolveEffectiveGeometryVersion(state, "designer");
  const resultPanelVersion = resolveEffectiveGeometryVersion(
    state,
    "resultPanel",
  );
  assert(
    designerVersion === resultPanelVersion,
    "Designer and ResultPanel must share geometry version",
  );
  checks.push("PASS: Designer / ResultPanel sync (same effective version)");

  const prevEnv = process.env.NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION;
  process.env.NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION = "v2";
  assert(
    getActiveDesignerGeometryVersion() === DESIGNER_GEOMETRY_VERSION.V2,
    "env can still set compile-time helper",
  );
  assert(
    resolveEffectiveGeometryVersion(
      createDefaultGeometryRuntimeState(),
      "designer",
    ) === DESIGNER_GEOMETRY_VERSION.V1,
    "runtime context must ignore env when state is V1",
  );
  if (prevEnv === undefined) {
    delete process.env.NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION;
  } else {
    process.env.NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION = prevEnv;
  }
  checks.push("PASS: Environment Variable no longer controls UI runtime");

  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert(isGeometryRuntimeProductionLocked(), "production locked");
  assert(
    resolveEffectiveGeometryVersion(
      { ...createDefaultGeometryRuntimeState(), geometryVersion: DESIGNER_GEOMETRY_VERSION.V2 },
      "designer",
      { productionLocked: true },
    ) === DESIGNER_GEOMETRY_VERSION.V1,
    "production forces V1",
  );
  process.env.NODE_ENV = prevNodeEnv ?? "development";
  checks.push("PASS: Production fixed Geometry V1");

  assert(isGeometryRuntimeDevConsoleAvailable(), "dev console in development");
  checks.push("PASS: Development can switch (console available)");

  assert(
    !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.png &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.zip &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.pdf &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.email,
    "export toggles default off",
  );
  checks.push("PASS: Export Runtime Toggle defaults all OFF");

  const exportGuard = resolveEffectiveGeometryVersion(
    {
      ...createDefaultGeometryRuntimeState(),
      geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      exportRuntime: { png: false, zip: false, pdf: false, email: false },
    },
    "png",
  );
  assert(
    exportGuard === DESIGNER_GEOMETRY_VERSION.V1,
    "export guard returns V1 when toggle off",
  );
  const exportGuardOn = resolveEffectiveGeometryVersion(
    {
      ...createDefaultGeometryRuntimeState(),
      geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      exportRuntime: { png: true, zip: false, pdf: false, email: false },
    },
    "png",
  );
  assert(
    exportGuardOn === DESIGNER_GEOMETRY_VERSION.V2,
    "export guard allows V2 when toggle on",
  );
  checks.push("PASS: Export Runtime guard (OFF=V1, ON=V2)");

  const layerKeys = Object.keys(DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES);
  assert(layerKeys.length >= 9, "debug layers present");
  for (const side of SIDES) {
    const v1 = resolveGeometryRuntime(side, DESIGNER_GEOMETRY_VERSION.V1);
    const v2 = resolveGeometryRuntime(side, DESIGNER_GEOMETRY_VERSION.V2);
    assert(v1.snapshot.artworkStage.width > 0, `${side} v1 stage`);
    assert(v2.snapshot.artworkStage.width > 0, `${side} v2 stage`);
    assert(v1.debugShapes.artworkStage.width > 0, `${side} v1 debug shapes`);
    assert(v2.debugShapes.artworkStage.width > 0, `${side} v2 debug shapes`);
  }
  checks.push("PASS: Geometry Debug Layer shapes resolve for V1/V2");

  for (const side of SIDES) {
    const unified = resolveGeometryRuntimeForSurface(
      {
        ...createDefaultGeometryRuntimeState(),
        geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      },
      side,
      "designer",
    );
    const snapshot = resolveGeometryRuntimeSnapshot(
      side,
      DESIGNER_GEOMETRY_VERSION.V2,
    );
    assert(
      unified.snapshot.artworkStage.top === snapshot.artworkStage.top,
      "resolver snapshot unified",
    );
  }
  checks.push("PASS: Geometry Resolver unified entry");

  assertNoCircularRuntimeImports();
  checks.push("PASS: Runtime modules avoid React context circular imports");

  const componentViolations = scanComponentRuntimeIsolation();
  assert(componentViolations.length === 0, componentViolations.join("; "));
  checks.push("PASS: Component runtime isolation (allowed adapters only)");

  const frozenViolations = scanFrozenLayerImports();
  assert(frozenViolations.length === 0, frozenViolations.join("; "));
  checks.push("PASS: Frozen layers do not import runtime context");

  const summary = [
    "Geometry Runtime Switch Regression — Phase 69.6",
    "",
    ...checks.map((line) => (line.startsWith("PASS:") ? line : `PASS: ${line}`)),
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
