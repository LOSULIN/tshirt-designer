/**
 * ResultPanel render mode — legacy vs designer projection (Photo Bridge).
 *
 * Default: designer_projection (Phase 68.6 — Designer Display reuse).
 * Override: NEXT_PUBLIC_RESULT_PANEL_RENDER_MODE=legacy
 */

export const RESULT_PANEL_RENDER_MODE = {
  LEGACY: "legacy",
  DESIGNER_PROJECTION: "designer_projection",
} as const;

export type ResultPanelRenderMode =
  (typeof RESULT_PANEL_RENDER_MODE)[keyof typeof RESULT_PANEL_RENDER_MODE];

/**
 * Compile-time default ResultPanel hero preview render path.
 * @default designer_projection
 */
export const ACTIVE_RESULT_PANEL_RENDER_MODE: ResultPanelRenderMode =
  RESULT_PANEL_RENDER_MODE.DESIGNER_PROJECTION;

/** Runtime mode — env override for safe integration testing without code edits. */
export function getActiveResultPanelRenderMode(): ResultPanelRenderMode {
  const envMode =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_RESULT_PANEL_RENDER_MODE
      : undefined;
  if (envMode === RESULT_PANEL_RENDER_MODE.DESIGNER_PROJECTION) {
    return RESULT_PANEL_RENDER_MODE.DESIGNER_PROJECTION;
  }
  if (envMode === RESULT_PANEL_RENDER_MODE.LEGACY) {
    return RESULT_PANEL_RENDER_MODE.LEGACY;
  }
  return ACTIVE_RESULT_PANEL_RENDER_MODE;
}

export function isDesignerProjectionRenderMode(
  mode: ResultPanelRenderMode = ACTIVE_RESULT_PANEL_RENDER_MODE,
): boolean {
  return mode === RESULT_PANEL_RENDER_MODE.DESIGNER_PROJECTION;
}

export function isLegacyResultPanelRenderMode(
  mode: ResultPanelRenderMode = ACTIVE_RESULT_PANEL_RENDER_MODE,
): boolean {
  return mode === RESULT_PANEL_RENDER_MODE.LEGACY;
}
