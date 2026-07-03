/** Designer page UI tokens — layout / visual only (Phase 19 + Ref UI polish) */

/** TIIIGO brand accent — rgb(0.12, 0.35, 0.75) ≈ blue-700 */
const accent = {
  bg: "bg-blue-700",
  bgHover: "hover:bg-blue-800",
  bgActive: "active:bg-blue-900",
  text: "text-blue-700",
  border: "border-blue-700",
  ring: "focus-visible:ring-blue-600",
  selected:
    "border-blue-700 bg-blue-700 text-white data-[selected=true]:border-blue-700 data-[selected=true]:bg-blue-700 data-[selected=true]:text-white",
  selectedSoft: "border-blue-200 bg-blue-50 ring-1 ring-blue-100",
  link: "text-blue-700 hover:text-blue-800",
} as const;

export const ds = {
  accent,
  space: {
    2: "2",
    3: "3",
    4: "4",
    6: "6",
    8: "8",
    gap1: "gap-1",
    gap2: "gap-2",
    gap3: "gap-3",
    gap4: "gap-4",
    gap6: "gap-6",
    gap8: "gap-8",
    p2: "p-2",
    p3: "p-3",
    p4: "p-4",
    p5: "p-5",
    p6: "p-6",
    p8: "p-8",
    px3: "px-3",
    px4: "px-4",
    py2: "py-2",
    py3: "py-3",
    /** Consistent rail inner padding (left / right panels) */
    panel: "p-3",
    panelGap: "gap-3",
    section: "mt-3",
    sectionSm: "mt-2",
  },
  radius: {
    button: "rounded-lg",
    card: "rounded-lg",
    preview: "rounded-lg",
  },
  shadow: {
    card: "shadow-sm",
    cardHover: "shadow-sm",
    preview: "shadow-md",
    previewLg: "shadow-lg",
  },
  surface: {
    page: "bg-zinc-50",
    panel: "bg-white",
    canvas: "bg-white",
    canvasWell: "bg-zinc-100/80",
    border: "border-zinc-200",
    divider: "border-zinc-100",
    hover: "hover:bg-zinc-100",
    preview: "bg-zinc-50",
  },
  icon: {
    /** 20px — compact toolbar */
    sm: "h-5 w-5",
    /** 18px — inline toolbar icons */
    xs: "h-[18px] w-[18px]",
    /** 24px — layer list */
    md: "h-6 w-6",
  },
  control: {
    /** 32px — compact toolbar (Ref UI) */
    sm: "h-8 min-h-8 min-w-8",
    /** 36px — secondary controls */
    md: "h-9 min-h-9 min-w-9",
    /** 40px — primary touch targets (mobile) */
    lg: "h-10 min-h-10 min-w-10",
  },
  type: {
    title: "text-sm font-semibold leading-tight text-zinc-900",
    panelTitle: "text-sm font-semibold leading-tight text-zinc-900",
    cardTitle: "text-xs font-semibold leading-tight text-zinc-900",
    body: "text-xs leading-snug text-zinc-700",
    helper: "text-[11px] leading-snug text-zinc-500",
    label: "text-[11px] font-medium leading-snug text-zinc-500",
  },
  button: {
    primary: `rounded-lg ${accent.bg} px-4 py-2 text-sm font-medium text-white shadow-sm ${accent.bgHover} ${accent.bgActive} focus-visible:outline-none focus-visible:ring-2 ${accent.ring} focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-out`,
    secondary:
      "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors duration-150 ease-out hover:bg-zinc-50 active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
    toolbar:
      "inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 transition-colors duration-150 ease-out hover:bg-zinc-50 active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
    ghost:
      "inline-flex h-8 items-center gap-1 rounded-lg bg-transparent px-2 text-xs font-medium text-zinc-700 transition-colors duration-150 ease-out hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
  },
  motion: {
    accordion: "transition-all duration-200 ease-out",
    drawer: "transition-all duration-200 ease-out",
    hover: "transition-colors duration-150 ease-out",
    shadow: "transition-shadow duration-150 ease-out",
    statusBadge: "transition-colors duration-150 ease-out",
  },
  statusBadge: {
    base: "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium",
    ok: "border-green-300 bg-green-50 text-green-700",
    violation: "border-red-300 bg-red-50 text-red-700",
    dpi: "border-amber-300 bg-amber-50 text-amber-700",
  },
  card: `overflow-hidden rounded-lg border border-zinc-200/80 bg-white shadow-none`,
  overlay:
    "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ease-out",
  layout: {
    iconNav: "w-[clamp(3rem,3.5vw,3.5rem)]",
    /** Desktop ~18% */
    productRail: "w-full lg:w-[18%] lg:min-w-[12rem] lg:max-w-[18%] lg:shrink-0",
    designRail: "w-full lg:w-[clamp(14rem,20vw,18rem)]",
    /** Legacy preview rail — prefer resultRail */
    previewRail: "w-full lg:w-[25%] lg:min-w-[15rem] lg:max-w-[25%] lg:shrink-0",
    /** Desktop ~25% — 成果 Result Panel */
    resultRail: "w-full lg:w-[25%] lg:min-w-[15rem] lg:max-w-[25%] lg:shrink-0",
    infoRail: "w-full lg:w-[25%] lg:min-w-[15rem] lg:max-w-[25%] lg:shrink-0",
    drawer: "w-[clamp(16rem,min(90vw,20rem),20rem)]",
    /** Desktop ~57% (flex-1 between fixed rails) */
    canvas: "min-w-0 flex-1 lg:w-[57%]",
  },
} as const;
