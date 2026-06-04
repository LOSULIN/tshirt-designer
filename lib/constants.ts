export type Gender = "male" | "female";
export type Side = "front" | "back";

export const IMAGE_WIDTH = 1024;
export const IMAGE_HEIGHT = 1536;

export const PRINT_AREA = {
  x: 275,
  y: 350,
  width: 470,
  height: 620,
} as const;

export const TEMPLATES: Record<Gender, Record<Side, string>> = {
  male: {
    front: "/templates/adult-male-front.png",
    back: "/templates/adult-male-back.png",
  },
  female: {
    front: "/templates/adult-female-front.png",
    back: "/templates/adult-female-back.png",
  },
};

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MIN_RESOLUTION = 1000;
export const RECOMMENDED_RESOLUTION = 3000;
export const PREVIEW_MAX_EDGE = 2000;
export const SNAP_THRESHOLD = 12;
export const GRID_SIZE = 25;
export const GRID_SNAP_THRESHOLD = 10;
export const ELEMENT_SNAP_THRESHOLD = 10;
export const ELEMENT_SNAP_MIN = 4;
export const ELEMENT_SNAP_MAX = 24;
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;
export const DRAFT_STORAGE_KEY = "tshirt-designer-draft";
export const DRAFT_DB_NAME = "tshirt-designer-db";
export const DRAFT_STORE_NAME = "draft-images";
