"use client";

import {
  buildLiveDesignState,
  getLiveElementReport,
  type LiveDesignState,
  type LiveDesignStateElement,
} from "@/lib/live-design-state";
import type { LayerInspectorReport } from "@/lib/design-inspector";
import type { Side } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export interface LiveDesignStateContextValue {
  designState: LiveDesignState;
  getReport: (layerId: string) => LayerInspectorReport | null;
  getElement: (layerId: string) => LiveDesignStateElement | null;
}

const LiveDesignStateContext = createContext<LiveDesignStateContextValue | null>(
  null,
);

export function LiveDesignStateProvider({
  size,
  side,
  layers,
  selectedLayerId = null,
  children,
}: {
  size: string;
  side: Side;
  layers: DesignLayer[];
  selectedLayerId?: string | null;
  children: ReactNode;
}) {
  const designState = useMemo(
    () => buildLiveDesignState(layers, size, side, selectedLayerId),
    [layers, size, side, selectedLayerId],
  );

  const value = useMemo<LiveDesignStateContextValue>(
    () => ({
      designState,
      getReport: (layerId) => getLiveElementReport(designState, layerId),
      getElement: (layerId) =>
        designState.elements.find((element) => element.id === layerId) ?? null,
    }),
    [designState],
  );

  return (
    <LiveDesignStateContext.Provider value={value}>
      {children}
    </LiveDesignStateContext.Provider>
  );
}

export function useLiveDesignState(): LiveDesignStateContextValue {
  const context = useContext(LiveDesignStateContext);
  if (!context) {
    throw new Error(
      "useLiveDesignState must be used within LiveDesignStateProvider",
    );
  }
  return context;
}
