"use client";

import type { ReactNode } from "react";
import { ds } from "./design-ui";

/** Mobile bottom sheet — layout shell only */
export function LayoutBottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
  maxHeightClassName = "max-h-[min(85vh,32rem)]",
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  maxHeightClassName?: string;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="關閉面板"
        className={`${ds.overlay} md:hidden`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:hidden ${ds.motion.drawer} ${ds.radius.preview} rounded-b-none ${maxHeightClassName}`}
      >
        <div className="flex shrink-0 justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-zinc-200" aria-hidden />
        </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}
