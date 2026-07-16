/**
 * Drag RAF Scheduler — coalesce pointermove transforms to one setState per frame.
 * Pointer event rate ≠ React render rate.
 */

export type DragRafTask = () => void;

export interface DragRafScheduler {
  schedule: (task: DragRafTask) => void;
  flush: () => void;
  cancel: () => void;
}

export function createDragRafScheduler(): DragRafScheduler {
  let latestTransform: DragRafTask | null = null;
  let rafId: number | null = null;

  const runPending = () => {
    rafId = null;
    const task = latestTransform;
    latestTransform = null;
    task?.();
  };

  const schedule = (task: DragRafTask) => {
    latestTransform = task;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(runPending);
  };

  const flush = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const task = latestTransform;
    latestTransform = null;
    task?.();
  };

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestTransform = null;
  };

  return { schedule, flush, cancel };
}
