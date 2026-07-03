"use client";

import { useEffect } from "react";
import { ds } from "./design-ui";

export function DesignerToast({
  message,
  onDismiss,
  durationMs = 2800,
}: {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, message, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 shadow-lg ${ds.type.body} ${ds.motion.drawer}`}
      >
        {message}
      </div>
    </div>
  );
}
