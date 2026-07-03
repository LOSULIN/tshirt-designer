/** Toolbar interaction tokens — aligned with ds (Phase 19) */

import { ds } from "./design-ui";

const focusRing = `focus-visible:outline-none focus-visible:ring-2 ${ds.accent.ring} focus-visible:ring-offset-1`;
const motion = "transition-colors duration-150 ease-out";

export const tb = {
  toolButton: `${ds.button.toolbar} shrink-0 cursor-pointer`,
  ghostButton: `${ds.button.ghost} shrink-0`,
  iconButton: `flex ${ds.control.sm} shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 ${motion} hover:bg-zinc-50 active:bg-zinc-100 ${focusRing} disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white disabled:active:bg-white data-[selected=true]:border-blue-700 data-[selected=true]:bg-blue-700 data-[selected=true]:text-white`,
  toggleButton: (selected: boolean) =>
    `flex ${ds.control.sm} shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${motion} ${focusRing} disabled:opacity-40 ${
      selected
        ? "border-blue-700 bg-blue-700 text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
    }`,
  field: `h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 ${motion} ${focusRing} disabled:opacity-40`,
  actionButton: `flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 ${motion} hover:bg-zinc-50 active:bg-zinc-100 ${focusRing} disabled:opacity-40`,
  dangerButton: `flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-red-600 ${motion} hover:border-red-200 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-1 disabled:opacity-40`,
  menuPanel: `absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-zinc-200 bg-white p-1.5 shadow-md ${ds.motion.drawer}`,
  menuItem: `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-800 ${motion} hover:bg-zinc-50 active:bg-zinc-100 ${focusRing} disabled:opacity-50`,
  toolbarRow:
    "flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto border-t border-zinc-100 bg-zinc-50/60 px-1 py-0.5",
  colorInput: `h-8 w-8 shrink-0 cursor-pointer rounded-md border border-zinc-200 bg-white p-0.5 ${motion} hover:bg-zinc-50 ${focusRing}`,
  colorField: `flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 ${motion} hover:bg-zinc-50`,
  fab: `flex ${ds.control.lg} items-center justify-center rounded-full border border-zinc-200 bg-blue-700 text-lg font-semibold text-white shadow-md ${motion} hover:bg-blue-800 active:bg-blue-900 ${focusRing} disabled:opacity-40`,
  iconSize: ds.icon.xs,
};
