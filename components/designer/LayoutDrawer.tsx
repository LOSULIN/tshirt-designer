"use client";

import type { ReactNode } from "react";
import { ds } from "./design-ui";

/** Tablet overlay drawer — layout shell only */
export function LayoutDrawer({
  open,
  onClose,
  side,
  ariaLabel,
  widthClassName = ds.layout.drawer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  ariaLabel: string;
  widthClassName?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="關閉面板"
        className={`${ds.overlay} max-md:hidden lg:hidden`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`fixed inset-y-0 z-50 flex flex-col bg-white shadow-xl max-md:hidden lg:hidden ${ds.motion.drawer} ${
          side === "left" ? "left-0" : "right-0"
        } ${widthClassName}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b border-zinc-100 ${ds.space.px4} ${ds.space.py3}`}
        >
          <span className={ds.type.cardTitle}>{ariaLabel}</span>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className={`px-2 py-1 text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 ${ds.radius.button} ${ds.motion.hover}`}
          >
            ×
          </button>
        </div>
        <div className="drawer-panel-host min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
