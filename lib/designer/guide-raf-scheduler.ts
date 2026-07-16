/**
 * Guide RAF Scheduler — coalesce snap guide state updates to one commit per frame.
 * Independent from drag transform scheduler (Phase 28-2G).
 */

import type { SnapGuidesState } from "@/lib/designer/print-area-element-memo";

export type GuideRafCommit = (guides: SnapGuidesState) => void;

export interface GuideRafScheduler {
  schedule: (guides: SnapGuidesState) => void;
  flush: () => void;
  cancel: () => void;
  destroy: () => void;
}

export function createGuideRafScheduler(commit: GuideRafCommit): GuideRafScheduler {
  let latestGuides: SnapGuidesState | null = null;
  let rafId: number | null = null;
  let destroyed = false;

  const runPending = () => {
    rafId = null;
    if (destroyed) return;
    const guides = latestGuides;
    latestGuides = null;
    if (guides) {
      commit(guides);
    }
  };

  const schedule = (guides: SnapGuidesState) => {
    if (destroyed) return;
    latestGuides = guides;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(runPending);
  };

  const flush = () => {
    if (destroyed) return;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const guides = latestGuides;
    latestGuides = null;
    if (guides) {
      commit(guides);
    }
  };

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestGuides = null;
  };

  const destroy = () => {
    cancel();
    destroyed = true;
  };

  return { schedule, flush, cancel, destroy };
}

export function snapGuidesAreEmpty(guides: SnapGuidesState): boolean {
  return (
    !guides.printCenterX &&
    !guides.printCenterY &&
    guides.elementVertical.length === 0 &&
    guides.elementHorizontal.length === 0
  );
}
