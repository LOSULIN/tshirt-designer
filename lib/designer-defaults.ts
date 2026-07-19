/**
 * ============================================================
 * DESIGNER UX DEFAULTS
 *
 * These defaults exist ONLY for Designer usability.
 * They are intentionally independent from lib/print-validation/*
 *
 * Print Validation defines production rules.
 * Designer Defaults define editing experience.
 *
 * Never couple these systems.
 *
 * Architecture Contract — Phase 49.4
 * ============================================================
 *
 * Future expansion: Designer Presets (Title, Subtitle, Body, QR Code, …)
 * should extend this module — not print-validation.
 */

/** Phase 48 baseline — legacy `_cm` field (= mm ÷ 10). */
export const DESIGNER_DEFAULTS = {
  text: {
    /** ~136 pt visual editing size — Easy to See / Easy to Select */
    fontSize_cm: 4.8,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing_cm: 0,
  },
  line: {
    /** 3.5 mm physical */
    strokeWidth_cm: 0.35,
  },
  arrow: {
    /** 3.5 mm physical */
    strokeWidth_cm: 0.35,
  },
  rectangle: {
    /** 2.5 mm physical */
    strokeWidth_cm: 0.25,
  },
  ellipse: {
    /** 2.5 mm physical (circle) */
    strokeWidth_cm: 0.25,
  },
} as const;

/** normalizeShapeDesignLayer fallback when stroke is missing */
export const DESIGNER_SHAPE_FALLBACK_STROKE_CM =
  DESIGNER_DEFAULTS.rectangle.strokeWidth_cm;
