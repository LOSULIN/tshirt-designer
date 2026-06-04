import { GRID_SIZE, PRINT_AREA } from "@/lib/constants";

export function PrintAreaGrid({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const cellW = (GRID_SIZE / PRINT_AREA.width) * 100;
  const cellH = (GRID_SIZE / PRINT_AREA.height) * 100;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(59 130 246 / 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(59 130 246 / 0.12) 1px, transparent 1px)
        `,
        backgroundSize: `${cellW}% ${cellH}%`,
      }}
    />
  );
}

export function PrintAreaCenterGuides({
  highlightX,
  highlightY,
}: {
  highlightX: boolean;
  highlightY: boolean;
}) {
  return (
    <>
      <div
        className={`pointer-events-none absolute left-1/2 top-0 z-[25] h-full w-px -translate-x-1/2 transition-opacity duration-75 ${
          highlightY ? "bg-blue-500 opacity-100" : "bg-blue-400/45 opacity-80"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute left-0 top-1/2 z-[25] h-px w-full -translate-y-1/2 transition-opacity duration-75 ${
          highlightX ? "bg-blue-500 opacity-100" : "bg-blue-400/45 opacity-80"
        }`}
        aria-hidden
      />
    </>
  );
}
