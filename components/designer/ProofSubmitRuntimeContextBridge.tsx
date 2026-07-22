"use client";

import { useEffect } from "react";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import {
  resolveProofSubmitRuntimeContext,
  type ProofSubmitRuntimeContext,
} from "@/lib/designer-geometry-v2/proof-submit-runtime-context";

export function ProofSubmitRuntimeContextBridge({
  onContext,
}: {
  onContext: (context: ProofSubmitRuntimeContext) => void;
}) {
  const geometryRuntime = useGeometryRuntime();

  useEffect(() => {
    onContext(
      resolveProofSubmitRuntimeContext(
        {
          geometryVersion: geometryRuntime.geometryVersion,
          preview: geometryRuntime.preview,
          exportRuntime: geometryRuntime.exportRuntime,
          debugLayers: geometryRuntime.debugLayers,
        },
        { productionLocked: geometryRuntime.isProductionLocked },
      ),
    );
  }, [
    geometryRuntime.debugLayers,
    geometryRuntime.exportRuntime,
    geometryRuntime.geometryVersion,
    geometryRuntime.isProductionLocked,
    geometryRuntime.preview,
    onContext,
  ]);

  return null;
}
