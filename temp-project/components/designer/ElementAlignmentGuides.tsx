import type { PrintAreaCmBounds } from "@/lib/design-cm";

export function ElementAlignmentGuides({
  vertical,
  horizontal,
  printArea,
}: {
  vertical: number[];
  horizontal: number[];
  printArea: PrintAreaCmBounds;
}) {
  if (vertical.length === 0 && horizontal.length === 0) return null;

  return (
    <>
      {vertical.map((pos) => (
        <div
          key={`v-${pos}`}
          className="pointer-events-none absolute top-0 z-[24] h-full w-px bg-blue-500"
          style={{ left: `${(pos / printArea.width) * 100}%` }}
          aria-hidden
        />
      ))}
      {horizontal.map((pos) => (
        <div
          key={`h-${pos}`}
          className="pointer-events-none absolute left-0 z-[24] h-px w-full bg-blue-500"
          style={{ top: `${(pos / printArea.height) * 100}%` }}
          aria-hidden
        />
      ))}
    </>
  );
}
