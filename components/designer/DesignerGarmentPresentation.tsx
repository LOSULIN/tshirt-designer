"use client";

import type { Side } from "@/lib/constants";
import { getDesignerMockupVisualOffsetPx } from "@/lib/garment-template-calibration";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";

/**
 * Designer-only garment template PNG presentation wrapper.
 * Presentation Only — does NOT affect workspace, print area, layers, or export.
 */
export function DesignerGarmentPresentation({
  side,
  children,
  className = "pointer-events-none absolute inset-0 z-0",
  style,
  "aria-hidden": ariaHidden = true,
}: {
  side: Side;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}) {
  const offset = useMemo(() => getDesignerMockupVisualOffsetPx(side), [side]);
  const presentationStyle = useMemo((): CSSProperties | undefined => {
    if (offset.x === 0 && offset.y === 0) {
      return style;
    }
    return {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      ...style,
    };
  }, [offset.x, offset.y, style]);

  return (
    <div className={className} style={presentationStyle} aria-hidden={ariaHidden}>
      {children}
    </div>
  );
}
