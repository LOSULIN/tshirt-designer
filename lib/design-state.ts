import { normalizeGender, type Gender, type Side } from "./constants";
import { layersToDraftSnapshot, migrateLegacyToLayers } from "./layers";
import type {
  DesignConfig,
  DesignDraft,
  DesignLayer,
  DesignLayersByTemplate,
  TextLayer,
  UploadedDesignImage,
} from "./types";

export type { DesignLayersByTemplate };

export const DESIGN_GENDERS = [
  "male",
  "female",
  "child-male",
  "child-female",
] as const satisfies readonly Gender[];

export const DESIGN_SIDES = ["front", "back"] as const satisfies readonly Side[];

export function createEmptyDesignLayersByTemplate(): DesignLayersByTemplate {
  return {
    male: { front: [], back: [] },
    female: { front: [], back: [] },
    "child-male": { front: [], back: [] },
    "child-female": { front: [], back: [] },
  };
}

export function getLayersForSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
): DesignLayer[] {
  return state[gender][side];
}

export function setLayersForSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
  layers: DesignLayer[],
): DesignLayersByTemplate {
  return {
    ...state,
    [gender]: {
      ...state[gender],
      [side]: layers,
    },
  };
}

export function updateLayersForSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
  updater: (layers: DesignLayer[]) => DesignLayer[],
): DesignLayersByTemplate {
  return setLayersForSlot(
    state,
    gender,
    side,
    updater(getLayersForSlot(state, gender, side)),
  );
}

export function hasDesignInSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
): boolean {
  return getLayersForSlot(state, gender, side).length > 0;
}

export function hasAnyDesign(state: DesignLayersByTemplate): boolean {
  return DESIGN_GENDERS.some((gender) =>
    DESIGN_SIDES.some((side) => hasDesignInSlot(state, gender, side)),
  );
}

export function layersByTemplateToDraftSnapshot(
  state: DesignLayersByTemplate,
): DesignLayersByTemplate {
  const snapshot = createEmptyDesignLayersByTemplate();
  for (const gender of DESIGN_GENDERS) {
    for (const side of DESIGN_SIDES) {
      snapshot[gender][side] = layersToDraftSnapshot(
        getLayersForSlot(state, gender, side),
      );
    }
  }
  return snapshot;
}

export function completedDesignFileName(gender: Gender, side: Side): string {
  return `completed-${gender}-${side}.png`;
}

export function completedDesignFormField(gender: Gender, side: Side): string {
  return `completed-${gender}-${side}`;
}

export function migrateDraftLayersByTemplate(
  draft: DesignDraft,
  legacy?: {
    image: UploadedDesignImage | null;
    textLayers: TextLayer[];
  },
): {
  state: DesignLayersByTemplate;
  gender: Gender;
  side: Side;
} {
  const gender = normalizeGender(
    draft.activeGender ?? draft.config.templateType,
  );
  const side = draft.activeSide ?? draft.config.side;
  const empty = createEmptyDesignLayersByTemplate();

  if (draft.layersByTemplate) {
    return { state: draft.layersByTemplate, gender, side };
  }

  if (draft.layers?.length) {
    return {
      state: setLayersForSlot(empty, gender, side, draft.layers),
      gender,
      side,
    };
  }

  if (legacy) {
    const layers = migrateLegacyToLayers(
      draft.config,
      legacy.image,
      legacy.textLayers,
    );
    if (layers.length > 0) {
      return {
        state: setLayersForSlot(empty, gender, side, layers),
        gender,
        side,
      };
    }
  }

  return { state: empty, gender, side };
}

export function firstImageInSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
) {
  return getLayersForSlot(state, gender, side).find(
    (l): l is Extract<DesignLayer, { type: "image" }> => l.type === "image",
  );
}

export function legacyConfigFromSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
): DesignConfig {
  const firstImage = firstImageInSlot(state, gender, side);
  return {
    templateType: gender,
    side,
    x: firstImage?.x ?? 0,
    y: firstImage?.y ?? 0,
    width: firstImage?.width ?? 0,
    height: firstImage?.height ?? 0,
    scale: firstImage?.scale ?? 1,
    rotation: firstImage?.rotation ?? 0,
  };
}
