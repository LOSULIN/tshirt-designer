"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Gender, Side } from "@/lib/constants";
import {
  cloneDesignLayers,
  createEmptyHistoryStacks,
  isHistoryShortcutTarget,
  pushHistorySnapshot,
  redoHistory,
  revokeImageAssetsNotInSnapshots,
  revokeLayerAssetsUnlessRetained,
  undoHistory,
  type DesignHistoryStacks,
} from "@/lib/design-history";
import type { DesignLayer } from "@/lib/types";

const TEXT_HISTORY_DEBOUNCE_MS = 600;

function slotKey(gender: Gender, side: Side) {
  return `${gender}:${side}`;
}

export function useDesignHistory({
  layers,
  gender,
  side,
  enabled,
  onRestore,
}: {
  layers: DesignLayer[];
  gender: Gender;
  side: Side;
  enabled: boolean;
  onRestore: (snapshot: DesignLayer[]) => void;
}) {
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const stacksBySlotRef = useRef<Map<string, DesignHistoryStacks>>(new Map());
  const activeSlotRef = useRef(slotKey(gender, side));

  const [historyStack, setHistoryStack] = useState<DesignLayer[][]>([]);
  const [futureStack, setFutureStack] = useState<DesignLayer[][]>([]);

  const isApplyingRef = useRef(false);
  const gestureBaseRef = useRef<DesignLayer[] | null>(null);
  const textEditBaseRef = useRef<DesignLayer[] | null>(null);
  const textEditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistCurrentSlotStacks = useCallback(() => {
    stacksBySlotRef.current.set(activeSlotRef.current, {
      historyStack,
      futureStack,
    });
  }, [historyStack, futureStack]);

  useEffect(() => {
    persistCurrentSlotStacks();
    const nextKey = slotKey(gender, side);
    if (activeSlotRef.current === nextKey) return;

    activeSlotRef.current = nextKey;
    gestureBaseRef.current = null;
    textEditBaseRef.current = null;
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    const loaded =
      stacksBySlotRef.current.get(nextKey) ?? createEmptyHistoryStacks();
    setHistoryStack(loaded.historyStack);
    setFutureStack(loaded.futureStack);
  }, [gender, side, persistCurrentSlotStacks]);

  const applyStacks = useCallback(
    (
      next: DesignHistoryStacks,
      droppedSnapshots: DesignLayer[][] = [],
    ) => {
      setHistoryStack(next.historyStack);
      setFutureStack(next.futureStack);
      stacksBySlotRef.current.set(activeSlotRef.current, next);
      if (droppedSnapshots.length > 0) {
        revokeImageAssetsNotInSnapshots(
          droppedSnapshots,
          [...next.historyStack, ...next.futureStack],
          layersRef.current,
        );
      }
    },
    [],
  );

  const flushTextEditHistory = useCallback(() => {
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }
    if (!enabled || isApplyingRef.current || !textEditBaseRef.current) {
      textEditBaseRef.current = null;
      return;
    }
    const base = textEditBaseRef.current;
    textEditBaseRef.current = null;
    const currentStacks =
      stacksBySlotRef.current.get(activeSlotRef.current) ??
      createEmptyHistoryStacks();
    const { stacks: next, droppedSnapshots } = pushHistorySnapshot(
      currentStacks,
      base,
    );
    applyStacks(next, droppedSnapshots);
  }, [applyStacks, enabled]);

  const commitGestureHistory = useCallback(() => {
    if (!enabled || isApplyingRef.current || !gestureBaseRef.current) {
      gestureBaseRef.current = null;
      return;
    }
    const base = gestureBaseRef.current;
    gestureBaseRef.current = null;
    const currentStacks =
      stacksBySlotRef.current.get(activeSlotRef.current) ??
      createEmptyHistoryStacks();
    const { stacks: next, droppedSnapshots } = pushHistorySnapshot(
      currentStacks,
      base,
    );
    applyStacks(next, droppedSnapshots);
  }, [applyStacks, enabled]);

  const prepareDiscreteMutation = useCallback(() => {
    if (!enabled || isApplyingRef.current) return;
    commitGestureHistory();
    flushTextEditHistory();
    const currentStacks =
      stacksBySlotRef.current.get(activeSlotRef.current) ??
      createEmptyHistoryStacks();
    const { stacks: next, droppedSnapshots } = pushHistorySnapshot(
      currentStacks,
      layersRef.current,
    );
    applyStacks(next, droppedSnapshots);
  }, [applyStacks, commitGestureHistory, enabled, flushTextEditHistory]);

  const markGestureMutation = useCallback(() => {
    if (!enabled || isApplyingRef.current) return;
    flushTextEditHistory();
    if (!gestureBaseRef.current) {
      gestureBaseRef.current = cloneDesignLayers(layersRef.current);
    }
  }, [enabled, flushTextEditHistory]);

  const prepareTextMutation = useCallback(() => {
    if (!enabled || isApplyingRef.current) return;
    commitGestureHistory();
    if (!textEditBaseRef.current) {
      textEditBaseRef.current = cloneDesignLayers(layersRef.current);
    }
    if (textEditTimerRef.current) clearTimeout(textEditTimerRef.current);
    textEditTimerRef.current = setTimeout(() => {
      flushTextEditHistory();
    }, TEXT_HISTORY_DEBOUNCE_MS);
  }, [commitGestureHistory, enabled, flushTextEditHistory]);

  const revokeDeletedLayerAssets = useCallback(
    (layer: DesignLayer, liveLayersAfterDelete: DesignLayer[]) => {
      const stacks =
        stacksBySlotRef.current.get(activeSlotRef.current) ??
        createEmptyHistoryStacks();
      revokeLayerAssetsUnlessRetained(layer, stacks, liveLayersAfterDelete);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    gestureBaseRef.current = null;
    textEditBaseRef.current = null;
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }
    const empty = createEmptyHistoryStacks();
    applyStacks(empty);
  }, [applyStacks]);

  const undo = useCallback(() => {
    if (!enabled || isApplyingRef.current) return false;
    commitGestureHistory();
    flushTextEditHistory();
    const currentStacks =
      stacksBySlotRef.current.get(activeSlotRef.current) ??
      createEmptyHistoryStacks();
    const result = undoHistory(currentStacks, layersRef.current);
    if (!result) return false;
    isApplyingRef.current = true;
    applyStacks(result.stacks);
    onRestore(result.snapshot);
    isApplyingRef.current = false;
    return true;
  }, [
    applyStacks,
    commitGestureHistory,
    enabled,
    flushTextEditHistory,
    onRestore,
  ]);

  const redo = useCallback(() => {
    if (!enabled || isApplyingRef.current) return false;
    commitGestureHistory();
    flushTextEditHistory();
    const currentStacks =
      stacksBySlotRef.current.get(activeSlotRef.current) ??
      createEmptyHistoryStacks();
    const result = redoHistory(currentStacks, layersRef.current);
    if (!result) return false;
    isApplyingRef.current = true;
    applyStacks(result.stacks);
    onRestore(result.snapshot);
    isApplyingRef.current = false;
    return true;
  }, [
    applyStacks,
    commitGestureHistory,
    enabled,
    flushTextEditHistory,
    onRestore,
  ]);

  useEffect(() => {
    const onPointerUp = () => {
      commitGestureHistory();
    };
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [commitGestureHistory]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (isHistoryShortcutTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, redo, undo]);

  useEffect(
    () => () => {
      if (textEditTimerRef.current) clearTimeout(textEditTimerRef.current);
    },
    [],
  );

  return {
    historyStack,
    futureStack,
    canUndo: historyStack.length > 0,
    canRedo: futureStack.length > 0,
    prepareDiscreteMutation,
    markGestureMutation,
    prepareTextMutation,
    clearHistory,
    revokeDeletedLayerAssets,
    undo,
    redo,
    isApplyingHistory: () => isApplyingRef.current,
  };
}
