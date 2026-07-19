/**
 * Architecture Regression Guard — Phase 49.4 / 49.5
 *
 * 1. Designer Defaults baseline (Phase 48)
 * 2. Coupling detection vs Print Validation thresholds
 * 3. Designer UX Smoke Test (behavioral, not pixel)
 *
 * Run:
 *   npx tsx lib/designer-defaults.regression.ts
 */

import { DESIGNER_DEFAULTS } from "./designer-defaults";
import { createDefaultTextLayer, measureTextBoundsCm } from "./text-layer";
import { createDefaultShapeLayer } from "./shape-layer";
import {
  LINE_RULES_MM,
  STROKE_RULES_MM,
  TEXT_RULES_PT,
} from "./print-validation/constants";
import { cmToMm, cmToPt } from "./print-validation/units";

/** Phase 48 baseline — update only when intentionally changing Designer UX */
const PHASE_48_BASELINE = {
  textFontSize_cm: 4.8,
  textFontWeight: 400,
  textLineHeight: 1.3,
  lineStroke_cm: 0.35,
  arrowStroke_cm: 0.35,
  rectangleStroke_cm: 0.25,
  ellipseStroke_cm: 0.25,
} as const;

/** Minimum UX thresholds — objects must be visible and selectable */
const UX_MIN_TEXT_FONT_SIZE_CM = 1.0;
const UX_MIN_STROKE_CM = 0.1;
const UX_MIN_BBOX_CM = 0.1;

export interface DesignerDefaultsRegressionResult {
  pass: boolean;
  checks: { name: string; pass: boolean; detail: string }[];
}

export function runDesignerDefaultsRegressionCheck(): DesignerDefaultsRegressionResult {
  const checks: DesignerDefaultsRegressionResult["checks"] = [];

  const assert = (name: string, pass: boolean, detail: string) => {
    checks.push({ name, pass, detail });
  };

  // ── Phase 48 baseline ──────────────────────────────────────────
  assert(
    "New Text → fontSize = Phase 48",
    DESIGNER_DEFAULTS.text.fontSize_cm === PHASE_48_BASELINE.textFontSize_cm,
    `expected ${PHASE_48_BASELINE.textFontSize_cm}, got ${DESIGNER_DEFAULTS.text.fontSize_cm}`,
  );
  assert(
    "New Text → fontWeight = Phase 48",
    DESIGNER_DEFAULTS.text.fontWeight === PHASE_48_BASELINE.textFontWeight,
    `expected ${PHASE_48_BASELINE.textFontWeight}, got ${DESIGNER_DEFAULTS.text.fontWeight}`,
  );
  assert(
    "New Text → lineHeight = Phase 48",
    DESIGNER_DEFAULTS.text.lineHeight === PHASE_48_BASELINE.textLineHeight,
    `expected ${PHASE_48_BASELINE.textLineHeight}, got ${DESIGNER_DEFAULTS.text.lineHeight}`,
  );
  assert(
    "New Line → stroke = Phase 48",
    DESIGNER_DEFAULTS.line.strokeWidth_cm === PHASE_48_BASELINE.lineStroke_cm,
    `expected ${PHASE_48_BASELINE.lineStroke_cm}, got ${DESIGNER_DEFAULTS.line.strokeWidth_cm}`,
  );
  assert(
    "New Arrow → stroke = Phase 48",
    DESIGNER_DEFAULTS.arrow.strokeWidth_cm === PHASE_48_BASELINE.arrowStroke_cm,
    `expected ${PHASE_48_BASELINE.arrowStroke_cm}, got ${DESIGNER_DEFAULTS.arrow.strokeWidth_cm}`,
  );
  assert(
    "New Rectangle → stroke = Phase 48",
    DESIGNER_DEFAULTS.rectangle.strokeWidth_cm ===
      PHASE_48_BASELINE.rectangleStroke_cm,
    `expected ${PHASE_48_BASELINE.rectangleStroke_cm}, got ${DESIGNER_DEFAULTS.rectangle.strokeWidth_cm}`,
  );
  assert(
    "New Circle → stroke = Phase 48",
    DESIGNER_DEFAULTS.ellipse.strokeWidth_cm === PHASE_48_BASELINE.ellipseStroke_cm,
    `expected ${PHASE_48_BASELINE.ellipseStroke_cm}, got ${DESIGNER_DEFAULTS.ellipse.strokeWidth_cm}`,
  );

  // ── Coupling guard ─────────────────────────────────────────────
  const textPt = cmToPt(DESIGNER_DEFAULTS.text.fontSize_cm);
  assert(
    "Designer text fontSize ≠ Print minimum (8 pt)",
    textPt !== TEXT_RULES_PT.recommended,
    `fontSize ${textPt} pt must not equal print recommended ${TEXT_RULES_PT.recommended} pt`,
  );
  assert(
    "Designer line stroke ≠ Print minimum (0.4 mm)",
    cmToMm(DESIGNER_DEFAULTS.line.strokeWidth_cm) !== LINE_RULES_MM.recommended,
    `line stroke must not equal print recommended ${LINE_RULES_MM.recommended} mm`,
  );
  assert(
    "Designer shape stroke ≠ Print minimum (0.4 mm)",
    cmToMm(DESIGNER_DEFAULTS.rectangle.strokeWidth_cm) !==
      STROKE_RULES_MM.recommended,
    `shape stroke must not equal print recommended ${STROKE_RULES_MM.recommended} mm`,
  );

  // ── UX Smoke Test (behavioral) ─────────────────────────────────
  const textLayer = createDefaultTextLayer();
  assert(
    "Text → Layer Created",
    textLayer.type === "text" && Boolean(textLayer.id),
    `id=${textLayer.id}`,
  );
  assert(
    "Text → Visible (fontSize > UX minimum)",
    textLayer.fontSize_cm >= UX_MIN_TEXT_FONT_SIZE_CM,
    `fontSize_cm=${textLayer.fontSize_cm}`,
  );
  assert(
    "Text → No Zero Size (width)",
    textLayer.width_cm >= UX_MIN_BBOX_CM,
    `width_cm=${textLayer.width_cm}`,
  );
  assert(
    "Text → No Zero Size (height)",
    textLayer.height_cm >= UX_MIN_BBOX_CM,
    `height_cm=${textLayer.height_cm}`,
  );
  assert(
    "Text → Bounding Box measurable",
    (() => {
      const m = measureTextBoundsCm(
        textLayer.text,
        textLayer.fontSize_cm,
        textLayer.fontFamily,
        textLayer.fontWeight,
      );
      return m.width_cm > 0 && m.height_cm > 0;
    })(),
    "measureTextBoundsCm returned positive dimensions",
  );
  assert(
    "Text → Inspector editable (fontSize field present)",
    typeof textLayer.fontSize_cm === "number" && textLayer.fontSize_cm > 0,
    `fontSize_cm=${textLayer.fontSize_cm}`,
  );

  const shapeKinds = ["rectangle", "circle", "line", "arrow"] as const;
  for (const kind of shapeKinds) {
    const shape = createDefaultShapeLayer(kind, []);
    assert(
      `${kind} → Layer Created`,
      shape.type === "shape" && shape.shapeKind === kind,
      `id=${shape.id}`,
    );
    assert(
      `${kind} → No Zero Size (width)`,
      shape.width_cm >= UX_MIN_BBOX_CM,
      `width_cm=${shape.width_cm}`,
    );
    assert(
      `${kind} → No Zero Size (height)`,
      shape.height_cm >= UX_MIN_BBOX_CM,
      `height_cm=${shape.height_cm}`,
    );
    assert(
      `${kind} → Stroke Visible`,
      shape.strokeWidth_cm >= UX_MIN_STROKE_CM,
      `strokeWidth_cm=${shape.strokeWidth_cm}`,
    );
    assert(
      `${kind} → Hit Area exists (bbox area > 0)`,
      shape.width_cm * shape.height_cm > 0,
      `area=${shape.width_cm * shape.height_cm}`,
    );
    assert(
      `${kind} → Selection possible (visible=true, locked=false)`,
      shape.visible === true && shape.locked === false,
      `visible=${shape.visible} locked=${shape.locked}`,
    );
    if (kind === "rectangle" || kind === "circle") {
      assert(
        `${kind} → Fill Visible`,
        shape.fill !== "transparent" && shape.fill.length > 0,
        `fill=${shape.fill}`,
      );
    }
  }

  // Resize / Rotate handles are UI concerns in PrintAreaElement — verify layer has rotatable fields
  assert(
    "Layer → Rotation Handle Exists (rotation field on text)",
    typeof textLayer.rotation === "number",
    `rotation=${textLayer.rotation}`,
  );
  assert(
    "Layer → Resize Handle Exists (width/height on rectangle)",
    (() => {
      const rect = createDefaultShapeLayer("rectangle", []);
      return rect.width_cm > 0 && rect.height_cm > 0;
    })(),
    "rectangle has positive width/height for resize handles",
  );

  return {
    pass: checks.every((c) => c.pass),
    checks,
  };
}

// CLI entry
const isMain =
  typeof process !== "undefined" &&
  process.argv[1]?.includes("designer-defaults.regression");

if (isMain) {
  const result = runDesignerDefaultsRegressionCheck();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
}
