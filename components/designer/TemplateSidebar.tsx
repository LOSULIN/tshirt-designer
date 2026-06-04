import type { Gender, Side } from "@/lib/constants";
import { ToggleButton } from "./ToggleButton";

export function TemplateSidebar({
  gender,
  side,
  onGenderChange,
  onSideChange,
}: {
  gender: Gender;
  side: Side;
  onGenderChange: (gender: Gender) => void;
  onSideChange: (side: Side) => void;
}) {
  return (
    <aside className="flex w-52 shrink-0 flex-col gap-6 border-r border-zinc-200 bg-white p-4">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          模板選擇
        </h2>
        <div className="flex flex-col gap-2">
          <ToggleButton
            active={gender === "male"}
            onClick={() => onGenderChange("male")}
          >
            成人男
          </ToggleButton>
          <ToggleButton
            active={gender === "female"}
            onClick={() => onGenderChange("female")}
          >
            成人女
          </ToggleButton>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          正背面切換
        </h2>
        <div className="flex flex-col gap-2">
          <ToggleButton
            active={side === "front"}
            onClick={() => onSideChange("front")}
          >
            正面
          </ToggleButton>
          <ToggleButton
            active={side === "back"}
            onClick={() => onSideChange("back")}
          >
            背面
          </ToggleButton>
        </div>
      </div>
    </aside>
  );
}
