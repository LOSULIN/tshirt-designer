/**
 * Geometry V2 Release Candidate validation (Phase 70.3.1).
 * Run: npx tsx lib/designer-geometry-v2/geometry-v2-release-candidate.regression.ts
 *
 * Audit-only — does not modify geometry.
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
import sharp from "sharp";
import { getLayerDesignerDisplayCssPercent } from "@/lib/designer-display-projection";
import { createDesignerDisplayContext } from "@/lib/designer-display-projection";
import { resolveRuntimeVisualCompensation } from "@/lib/presentation/visual-compensation";
import { photoBridgeRectToStageStyle } from "@/lib/presentation/product-photo-bridge-css";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import { resolveDesignerRuntimeWorkspace } from "./designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  resolveGeometryRuntime,
  resolveGeometryRuntimeForSurface,
  resolveGeometryRuntimeSnapshot,
} from "./resolve-geometry-runtime";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import { resolveExportGeometryVersion } from "./geometry-runtime-export";
import {
  GEOMETRY_V2_COLOR_SLUGS,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  buildGeometryV2AssetRelativePath,
} from "./constants";
import { buildGeometryProfileV2 } from "./geometry-builder";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import type { DesignLayer } from "@/lib/types";
import type { Side } from "@/lib/constants";

const ROOT = process.cwd();
const OUTPUT_DIR = "debug/geometry-v2-rc";
const SIDES = ["front", "back"] as const;
const TOLERANCE_PX = 1;
const CANVAS = { w: 1024, h: 1536 };

const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL"] as const;
const CHILDREN_SIZES = ["90", "110", "130", "150", "160"] as const;
const ALL_SIZES = [...CHILDREN_SIZES, ...ADULT_SIZES] as const;

const FROZEN_ISOLATION_PATHS = [
  "lib/designer-display-projection.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/coordinate-runtime.ts",
  "lib/factory-overlay-runtime.ts",
  "lib/factory-anatomy-runtime.ts",
  "lib/export",
  "lib/garment-metrics",
  "lib/coordinates",
  "lib/preview-runtime.ts",
];

const FORBIDDEN_FROZEN_PATTERNS = [
  /from ["'].*geometry-builder/,
  /from ["'].*geometry-builder-calibration/,
  /from ["'].*shadow-render/,
  /from ["'].*geometry-debug-overlay/,
  /from ["'].*geometry-debug-render/,
  /buildGeometryProfileV2/,
  /compareGeometryShadow/,
  /GeometryShadowRuntime/,
];

type Status = "PASS" | "WARNING" | "FAIL";

interface Finding {
  status: Status;
  message: string;
}

const findings: Finding[] = [];
const checks: string[] = [];

function record(status: Status, message: string): void {
  findings.push({ status, message });
  if (status === "PASS") checks.push(`PASS: ${message}`);
  else if (status === "WARNING") checks.push(`WARNING: ${message}`);
  else checks.push(`FAIL: ${message}`);
}

function assertPass(condition: boolean, message: string): void {
  record(condition ? "PASS" : "FAIL", message);
  if (!condition) throw new Error(message);
}

function delta(a: number, b: number): number {
  return Math.abs(a - b);
}

function pct(value: string): number {
  return parseFloat(value) / 100;
}

function styleToPx(style: {
  left: string;
  top: string;
  width: string;
  height: string;
}) {
  return {
    left: pct(style.left) * CANVAS.w,
    top: pct(style.top) * CANVAS.h,
    width: pct(style.width) * CANVAS.w,
    height: pct(style.height) * CANVAS.h,
  };
}

function rectKeys(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return ["left", "top", "width", "height"] as const;
}

function compareRect(
  label: string,
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): boolean {
  let ok = true;
  for (const key of rectKeys(a)) {
    const d = delta(a[key], b[key]);
    if (d > TOLERANCE_PX) {
      record("FAIL", `${label} ${key} Δ=${d.toFixed(2)}px`);
      ok = false;
    }
  }
  if (ok) record("PASS", label);
  return ok;
}

function resolveArtworkTopPx(
  stageTopPx: number,
  stageHeightPx: number,
  layerTopPercent: string,
  compensationYPercent: number,
): number {
  return (
    stageTopPx +
    pct(layerTopPercent) * stageHeightPx +
    (compensationYPercent / 100) * stageHeightPx
  );
}

async function loadRaw(assetPath: string) {
  const absolutePath = join(ROOT, assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function scanFrozenRuntimeIsolation(): string[] {
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
    for (const pattern of FORBIDDEN_FROZEN_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden import (${pattern})`);
      }
    }
    if (/geometry-runtime-context/.test(source)) {
      violations.push(`${rel}: frozen layer imports geometry-runtime-context`);
    }
  }

  for (const rel of FROZEN_ISOLATION_PATHS) scanPath(rel);
  return violations;
}

function makeTestLayers(): DesignLayer[] {
  return [
    {
      id: "rc-logo",
      type: "image",
      visible: true,
      x_cm: 6,
      y_cm: 10,
      width_cm: 14,
      height_cm: 14,
      rotation: 12,
      scale: 1.05,
      zIndex: 1,
      src: "/test/logo.png",
      fit: "contain",
    },
    {
      id: "rc-title",
      type: "text",
      visible: true,
      x_cm: 4,
      y_cm: 22,
      width_cm: 28,
      height_cm: 8,
      rotation: 0,
      scale: 1,
      zIndex: 2,
      text: "TITLE",
      fontSize: 48,
      fontFamily: "Arial",
      fontWeight: 700,
      fill: "#111827",
      align: "center",
    },
    {
      id: "rc-badge",
      type: "shape",
      shapeKind: "circle",
      visible: true,
      x_cm: 22,
      y_cm: 14,
      width_cm: 6,
      height_cm: 6,
      rotation: -8,
      scale: 0.95,
      zIndex: 3,
      fill: "#ef4444",
      stroke: "#b91c1c",
      strokeWidth: 1,
    },
  ];
}

async function run(): Promise<void> {
  mkdirSync(join(ROOT, OUTPUT_DIR), { recursive: true });

  // ① Geometry Runtime — single snapshot SSOT
  for (const side of SIDES) {
    const designerResolved = resolveGeometryRuntimeForSurface(
      {
        ...createDefaultGeometryRuntimeState(),
        geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      },
      side,
      "designer",
    );
    const resultResolved = resolveGeometryRuntimeForSurface(
      {
        ...createDefaultGeometryRuntimeState(),
        geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      },
      side,
      "resultPanel",
    );
    const snapshot = resolveGeometryRuntimeSnapshot(
      side,
      DESIGNER_GEOMETRY_VERSION.V2,
    );

    assertPass(
      designerResolved.snapshot === snapshot ||
        JSON.stringify(designerResolved.snapshot) === JSON.stringify(snapshot),
      `V2 ${side}: Designer uses resolveGeometryRuntimeSnapshot()`,
    );
    assertPass(
      resultResolved.snapshot.artworkStage.top === snapshot.artworkStage.top,
      `V2 ${side}: ResultPanel snapshot stage top matches unified resolver`,
    );
    assertPass(
      designerResolved.snapshot.safeArea.top === snapshot.safeArea.top,
      `V2 ${side}: single Safe Area source (no duplicate)`,
    );
    assertPass(
      designerResolved.snapshot.factoryOrigin.y === snapshot.factoryOrigin.y,
      `V2 ${side}: single Factory Origin source (no duplicate)`,
    );
  }

  // ② Stage — Designer vs ResultPanel (4 groups)
  const stageReport: string[] = [];
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
    const designerPx = styleToPx(designer.workspaceStyle);
    const resultPx = {
      left: (bridge.photoArtworkStage.leftPercent / 100) * CANVAS.w,
      top: (bridge.photoArtworkStage.topPercent / 100) * CANVAS.h,
      width: (bridge.photoArtworkStage.widthPercent / 100) * CANVAS.w,
      height: (bridge.photoArtworkStage.heightPercent / 100) * CANVAS.h,
    };

    stageReport.push(
      `| ${side} | Designer | ${designerPx.left.toFixed(2)} | ${designerPx.top.toFixed(2)} | ${designerPx.width.toFixed(2)} | ${designerPx.height.toFixed(2)} |`,
    );
    stageReport.push(
      `| ${side} | ResultPanel | ${resultPx.left.toFixed(2)} | ${resultPx.top.toFixed(2)} | ${resultPx.width.toFixed(2)} | ${resultPx.height.toFixed(2)} |`,
    );

    compareRect(
      `V2 ${side} Designer Stage == ResultPanel Stage`,
      designerPx,
      resultPx,
    );
  }

  // ③ Safe Area
  const safeReport: string[] = [];
  for (const side of SIDES) {
    const designer = resolveDesignerRuntimeWorkspace(
      side,
      DESIGNER_GEOMETRY_VERSION.V2,
    );
    const snapshot = resolveGeometryRuntimeSnapshot(
      side,
      DESIGNER_GEOMETRY_VERSION.V2,
    );
    const safePx = styleToPx(designer.safeAreaStyle);
    safeReport.push(
      `### ${side}`,
      `- Snapshot: left=${snapshot.safeArea.left} top=${snapshot.safeArea.top} width=${snapshot.safeArea.width} height=${snapshot.safeArea.height}`,
      `- Designer: left=${safePx.left.toFixed(2)} top=${safePx.top.toFixed(2)} width=${safePx.width.toFixed(2)} height=${safePx.height.toFixed(2)}`,
    );
    compareRect(
      `V2 ${side} Designer Safe Area == Snapshot Safe Area`,
      safePx,
      snapshot.safeArea,
    );
  }

  // ④ Factory Origin + print top formula
  const factoryReport: string[] = [
    "| Side | collarBottom Y | factoryOrigin Y | offsetCm | printTop | stageTop | formula Δ |",
    "|------|----------------|-----------------|----------|----------|----------|-----------|",
  ];
  for (const side of SIDES) {
    const master =
      side === "front"
        ? UA35001_PRODUCT_MASTER_SNAPSHOT.front
        : UA35001_PRODUCT_MASTER_SNAPSHOT.back;
    const offsetCm = GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side];
    const expectedPrintTop =
      master.factoryOrigin.y + offsetCm * GEOMETRY_V2_PRINT_PX_PER_CM;
    const formulaDelta = delta(expectedPrintTop, master.artworkStage.top);
    factoryReport.push(
      `| ${side} | ${master.collarBottom.y} | ${master.factoryOrigin.y} | ${offsetCm} | ${expectedPrintTop.toFixed(2)} | ${master.artworkStage.top} | ${formulaDelta.toFixed(2)} |`,
    );
    assertPass(
      master.collarBottom.y === master.factoryOrigin.y,
      `V2 ${side}: collarBottom == factoryOrigin`,
    );
    assertPass(
      formulaDelta <= TOLERANCE_PX,
      `V2 ${side}: factoryOrigin + ${offsetCm}cm == artworkStage.top`,
    );
  }

  // ⑥ Multi-color builder profiles
  const colorReport: string[] = [
    "| Color | Side | collarY | stageTop | safeTop | Status |",
    "|-------|------|---------|----------|---------|--------|",
  ];
  for (const color of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const asset = buildGeometryV2AssetRelativePath(color, side);
      const raw = await loadRaw(asset);
      const profile = buildGeometryProfileV2({
        side,
        colorSlug: color,
        sourceAsset: asset,
        buffer: raw,
      });
      const collarY = profile.collarBottom.y;
      const stageTop = profile.artworkStage.top;
      const safeTop = profile.safeArea.top;
      const valid =
        collarY > 0 &&
        stageTop > collarY &&
        safeTop >= stageTop - TOLERANCE_PX &&
        profile.artworkStage.width > 0;
      const status: Status = valid ? "PASS" : "FAIL";
      colorReport.push(
        `| ${color} | ${side} | ${collarY} | ${stageTop.toFixed(2)} | ${safeTop.toFixed(2)} | ${status} |`,
      );
      record(status, `V2 color ${color}/${side} geometry valid`);
    }
  }

  // Master snapshot sanity
  const masterFront = UA35001_PRODUCT_MASTER_SNAPSHOT.front;
  record(
    masterFront.collarBottom.y === 416 ? "PASS" : "WARNING",
    `Product Master front collar Y=${masterFront.collarBottom.y} (calibrated)`,
  );

  // ⑤ Layer projection — Logo / Title / Badge
  const testLayers = makeTestLayers();
  const layerReport: string[] = [];
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
    const ctx = bridge.designerDisplayContext;
    const runtimeComp = resolveRuntimeVisualCompensation({
      side,
      geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      surface: "resultPanel",
    });
    const stageTop = designer.snapshot.artworkStage.top;
    const stageHeight = designer.snapshot.artworkStage.height;

    for (const layer of testLayers) {
      const css = getLayerDesignerDisplayCssPercent(
        {
          x_cm: layer.x_cm,
          y_cm: layer.y_cm,
          width_cm: layer.width_cm,
          height_cm: layer.height_cm,
        },
        ctx,
      );
      const designerArtworkTop = resolveArtworkTopPx(
        stageTop,
        stageHeight,
        css.top,
        0,
      );
      const resultArtworkTop = resolveArtworkTopPx(
        stageTop,
        stageHeight,
        css.top,
        runtimeComp.offsetYPercent,
      );
      const artworkDelta = delta(designerArtworkTop, resultArtworkTop);

      layerReport.push(
        `- ${side}/${layer.id}: designerTop=${designerArtworkTop.toFixed(2)} resultTop=${resultArtworkTop.toFixed(2)} Δ=${artworkDelta.toFixed(2)} rotation=${layer.rotation} scale=${"scale" in layer ? layer.scale : 1}`,
      );

      assertPass(
        artworkDelta <= TOLERANCE_PX,
        `V2 ${side} layer ${layer.id}: Designer Artwork == ResultPanel Artwork`,
      );

      assertPass(
        css.left.endsWith("%") && css.top.endsWith("%"),
        `V2 ${side}/${layer.id}: projection CSS % intact`,
      );
    }
  }

  // ⑦ Multi-size — V2 stage must not drift
  const sizeReport: string[] = [];
  const referenceBridge = resolveGeometryRuntimePhotoBridge({
    side: "front",
    size: "M",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  const refTop = referenceBridge.photoArtworkStage.topPercent;
  for (const size of ALL_SIZES) {
    const bridge = resolveGeometryRuntimePhotoBridge({
      side: "front",
      size,
      geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    });
    const topDelta = delta(bridge.photoArtworkStage.topPercent, refTop);
    const status: Status = topDelta <= 0.001 ? "PASS" : "FAIL";
    sizeReport.push(`| ${size} | ${bridge.photoArtworkStage.topPercent.toFixed(4)}% | ${topDelta.toFixed(4)}% | ${status} |`);
    record(
      status,
      `V2 front stage stable @ size ${size} (top drift ${topDelta.toFixed(4)}%)`,
    );
  }

  // ⑧ Runtime switch
  let state = createDefaultGeometryRuntimeState();
  assertPass(
    resolveEffectiveGeometryVersion(state, "designer") ===
      DESIGNER_GEOMETRY_VERSION.V1,
    "Runtime default V1",
  );
  state = { ...state, geometryVersion: DESIGNER_GEOMETRY_VERSION.V2 };
  assertPass(
    resolveEffectiveGeometryVersion(state, "designer") ===
      resolveEffectiveGeometryVersion(state, "resultPanel"),
    "V2: Designer and ResultPanel share effective version",
  );
  state = { ...state, geometryVersion: DESIGNER_GEOMETRY_VERSION.V1 };
  assertPass(
    resolveEffectiveGeometryVersion(state, "designer") ===
      DESIGNER_GEOMETRY_VERSION.V1,
    "V1→V2→V1 switch restores V1",
  );

  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assertPass(isGeometryRuntimeProductionLocked(), "Production runtime locked");
  assertPass(
    resolveEffectiveGeometryVersion(
      { ...createDefaultGeometryRuntimeState(), geometryVersion: DESIGNER_GEOMETRY_VERSION.V2 },
      "designer",
      { productionLocked: true },
    ) === DESIGNER_GEOMETRY_VERSION.V1,
    "Production always V1",
  );
  process.env.NODE_ENV = prevNodeEnv ?? "development";

  // ⑨ Export guard
  assertPass(
    !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.png &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.zip &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.pdf &&
      !DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.email,
    "Export toggles default OFF (V1)",
  );
  for (const surface of ["png", "zip", "pdf", "email"] as const) {
    const version = resolveEffectiveGeometryVersion(
      {
        ...createDefaultGeometryRuntimeState(),
        geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
      },
      surface,
    );
    assertPass(
      version === DESIGNER_GEOMETRY_VERSION.V1,
      `Export ${surface.toUpperCase()} default uses V1`,
    );
    const exportResolved = resolveExportGeometryVersion(
      DESIGNER_GEOMETRY_VERSION.V2,
      surface,
      false,
      false,
    );
    assertPass(
      exportResolved === DESIGNER_GEOMETRY_VERSION.V1,
      `Export guard ${surface.toUpperCase()} OFF → V1`,
    );
  }

  // ⑩ Runtime isolation
  const isolationViolations = scanFrozenRuntimeIsolation();
  assertPass(
    isolationViolations.length === 0,
    `Runtime isolation: 0 violations (${isolationViolations.length} found)`,
  );
  if (isolationViolations.length > 0) {
    for (const v of isolationViolations) record("FAIL", v);
  }

  // Production compile-time default
  assertPass(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION remains V1",
  );

  // Unified resolver entry
  for (const side of SIDES) {
    const unified = resolveGeometryRuntime(side, DESIGNER_GEOMETRY_VERSION.V2);
    const snapshot = resolveGeometryRuntimeSnapshot(
      side,
      DESIGNER_GEOMETRY_VERSION.V2,
    );
    assertPass(
      unified.snapshot.artworkStage.top === snapshot.artworkStage.top,
      `V2 ${side}: resolveGeometryRuntime snapshot is SSOT`,
    );
  }

  const failCount = findings.filter((f) => f.status === "FAIL").length;
  const warnCount = findings.filter((f) => f.status === "WARN" || f.status === "WARNING").length;
  const passCount = findings.filter((f) => f.status === "PASS").length;

  const releaseBlockers = [
    failCount > 0 ? `${failCount} FAIL findings` : null,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION still V1 (production cutover not done)",
    "Export engines (PNG/ZIP/PDF/Email) remain V1-only",
    "Per-SKU Product Factory Anchor not implemented (Phase 70.4)",
  ].filter(Boolean) as string[];

  const releaseReady = failCount === 0 ? "NO" : "NO";
  const rcReadyForPreview =
    failCount === 0 && warnCount <= 3
      ? "YES (preview/designer path)"
      : "NO";

  const report = [
    "# Geometry V2 RC Report — Phase 70.3.1",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Status | Count |`,
    `|--------|-------|`,
    `| PASS | ${passCount} |`,
    `| WARNING | ${warnCount} |`,
    `| FAIL | ${failCount} |`,
    "",
    "## ② Stage Rects (V2 @ 1024×1536)",
    "",
    "| Side | Surface | left | top | width | height |",
    "|------|---------|------|-----|-------|--------|",
    ...stageReport,
    "",
    "## ③ Safe Area",
    "",
    ...safeReport,
    "",
    "## ④ Factory Origin",
    "",
    ...factoryReport,
    "",
    "## ⑥ Multi-Color",
    "",
    ...colorReport,
    "",
    "## ⑤ Layer Projection (Logo / Title / Badge)",
    "",
    ...layerReport,
    "",
    "## ⑦ Multi-Size Stage Stability (front)",
    "",
    "| Size | stageTop% | drift vs M | Status |",
    "|------|-----------|------------|--------|",
    ...sizeReport,
    "",
    "## Completed",
    "",
    "- Builder Calibration (Phase 70.3 front factory origin)",
    "- Geometry Runtime Switch (V1/V2 dev toggle)",
    "- Designer Runtime Workspace (snapshot-driven blue/orange rects)",
    "- Stage Synchronization (Designer == ResultPanel stage ≤1px)",
    "- ResultPanel Visual Compensation fully removed for V2 (Phase 70.3.5)",
    "- Product Master snapshot frozen for V2 runtime",
    "- Runtime isolation from frozen Projection/Coordinate/Export layers",
    "",
    "## Incomplete / Deferred",
    "",
    "- Production default still V1 (`ACTIVE_DESIGNER_GEOMETRY_VERSION`)",
    "- Export pipeline V2 integration (guarded OFF)",
    "- Phase 70.4 Product Factory Anchor (per-SKU official anchors)",
    "- Multi-SKU beyond UA35001",
    "",
    "## Recommended Improvements (can defer)",
    "",
    "- Remove V1 legacy visual compensation when export migrates to V2",
    "- V2 export engine wiring when production cutover planned",
    "- Env-based `NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION` deprecation cleanup",
    "",
    "## Release Readiness",
    "",
    `**Geometry V2 as official production Runtime: ${releaseReady}**`,
    "",
    `**Geometry V2 RC for preview/designer path: ${rcReadyForPreview}**`,
    "",
    "### Remaining blockers for full production Runtime",
    "",
    ...releaseBlockers.map((b) => `- ${b}`),
    "",
    "## All Checks",
    "",
    ...checks,
    "",
    failCount === 0 ? "## ALL PASS" : `## ${failCount} FAIL — see above`,
  ].join("\n");

  writeFileSync(join(ROOT, OUTPUT_DIR, "geometry-v2-rc-report.md"), report + "\n", "utf8");
  console.log(report);

  if (failCount > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
