"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ds } from "./design-ui";

const TOOLTIP_DELAY_MS = 1000;

export function DesignerTooltip({
  content,
  children,
  delayMs = TOOLTIP_DELAY_MS,
}: {
  content: string;
  children: ReactNode;
  delayMs?: number;
}) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  }, [clearTimer, delayMs]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        onMouseEnter: (e: React.MouseEvent) => {
          (
            children as ReactElement<{ onMouseEnter?: (ev: React.MouseEvent) => void }>
          ).props.onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          (
            children as ReactElement<{ onMouseLeave?: (ev: React.MouseEvent) => void }>
          ).props.onMouseLeave?.(e);
          hide();
        },
        onFocus: (e: React.FocusEvent) => {
          (
            children as ReactElement<{ onFocus?: (ev: React.FocusEvent) => void }>
          ).props.onFocus?.(e);
          show();
        },
        onBlur: (e: React.FocusEvent) => {
          (
            children as ReactElement<{ onBlur?: (ev: React.FocusEvent) => void }>
          ).props.onBlur?.(e);
          hide();
        },
        "aria-describedby": visible ? tooltipId : undefined,
      })
    : children;

  return (
    <span className="relative inline-flex">
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-white shadow-sm ${ds.type.helper}`}
        >
          {content}
        </span>
      ) : null}
      {trigger}
    </span>
  );
}
