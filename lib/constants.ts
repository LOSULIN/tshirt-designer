export type Gender = "male" | "female" | "child-male" | "child-female";
export type Side = "front" | "back";
export const PRODUCT_ID = "basic-tshirt" as const;
export type Product = typeof PRODUCT_ID;

export const PRODUCT = {
  id: PRODUCT_ID,
  name: "TIIIGO 經典純棉短袖 T-Shirt",
  description: "經典純棉圓領短袖",
} as const;
export type Size = "XS" | "S" | "M" | "L" | "XL" | "2XL";

export const SIZE_CONTACT_MESSAGE = "請聯繫客服確認尺寸" as const;

export type SizeSuggestion = Size | typeof SIZE_CONTACT_MESSAGE;
export type Fit = "standard";
export type Material = "combed-cotton-180";

export const DEFAULT_MATERIAL: Material = "combed-cotton-180";

/** 材質／克重顯示文案（前端 UI、PDF、order.json 共用） */
export const MATERIAL_LABEL = "100% 精梳純棉｜重磅厚棉 290g";

export const MATERIAL_OPTIONS: { id: Material; label: string }[] = [
  { id: "combed-cotton-180", label: MATERIAL_LABEL },
];

export function normalizeMaterial(value: unknown): Material {
  return value === "combed-cotton-180" ? value : DEFAULT_MATERIAL;
}

export function getMaterialLabel(material?: unknown): string {
  const id = normalizeMaterial(material);
  return MATERIAL_OPTIONS.find((option) => option.id === id)?.label ?? MATERIAL_LABEL;
}

export function resolveMaterialLabelFromDesignMeta(
  designMeta?: Record<string, unknown> | null,
): string {
  return getMaterialLabel(designMeta?.material);
}

export type ShirtColor =
  | "white"
  | "black"
  | "heather-grey"
  | "navy"
  | "royal-blue"
  | "sky-blue"
  | "pink"
  | "hot-pink"
  | "light-yellow"
  | "mustard-green";

export const SHIRT_COLORS = [
  { id: "white", name: "白色", hex: "#FFFFFF" },
  { id: "black", name: "黑色", hex: "#111111" },
  { id: "heather-grey", name: "麻灰色", hex: "#B8B8B8" },
  { id: "navy", name: "丈青色", hex: "#1E3A5F" },
  { id: "royal-blue", name: "翠藍色", hex: "#2563EB" },
  { id: "sky-blue", name: "水藍色", hex: "#7DD3FC" },
  { id: "pink", name: "粉紅色", hex: "#F9A8D4" },
  { id: "hot-pink", name: "桃紅色", hex: "#EC4899" },
  { id: "light-yellow", name: "淺黃色", hex: "#FDE68A" },
  { id: "mustard-green", name: "芥末綠色", hex: "#8FA84A" },
] as const satisfies ReadonlyArray<{ id: ShirtColor; name: string; hex: string }>;

export const DEFAULT_SHIRT_COLOR: ShirtColor = "white";

export function isShirtColor(value: unknown): value is ShirtColor {
  return (
    typeof value === "string" &&
    SHIRT_COLORS.some((color) => color.id === value)
  );
}

export function getShirtColorHex(color: ShirtColor): string {
  return SHIRT_COLORS.find((c) => c.id === color)?.hex ?? "#FFFFFF";
}

export function getProductName(): string {
  return PRODUCT.name;
}

export const FIT_LABEL = "標準";

export const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: "male", label: "男生" },
  { id: "female", label: "女生" },
  { id: "child-male", label: "男生孩童" },
  { id: "child-female", label: "女生孩童" },
];

export const DEFAULT_MODEL_ID: Record<Gender, string> = {
  male: "male-1",
  female: "female-1",
  "child-male": "child-male-1",
  "child-female": "child-female-1",
};

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "2XL"];

export const EXPORT_DPI = 300;
export const DESIGN_WIDTH_TARGET_RATIO = 0.875;

import {
  ADULT_UNISEX_PRINT_BOUNDS,
  ADULT_UNISEX_PRINT_SPEC,
  DESIGN_AREA_HEIGHT,
  DESIGN_AREA_WIDTH,
  cmToDesignUnits,
  cmToExportPx,
  getExportDimensions,
  getExportMeta,
  getExportScale,
  getPrintAreaBounds,
  type PrintAreaBounds,
} from "./print-area";

export {
  ADULT_UNISEX_PRINT_BOUNDS,
  ADULT_UNISEX_PRINT_SPEC,
  DESIGN_AREA_HEIGHT,
  DESIGN_AREA_WIDTH,
  cmToDesignUnits,
  cmToExportPx,
  getExportDimensions,
  getExportMeta,
  getExportScale,
  getPrintAreaBounds,
  type PrintAreaBounds,
};

export {
  DESIGN_SAFE_MARGIN,
  PRINT_SAFE_AREA_SPEC,
  getPrintSafeAreaCm,
  type PrintSafeAreaCm,
} from "./printArea";

export {
  extractShirtColorFromDesignJson,
  getAdultTshirtTemplateSrc,
  getShirtColorName,
  isLightShirtColor,
  normalizeShirtColor,
} from "./shirt-template";

/** 模特預覽用模板（依性別／版型，含穿著效果） */
export const TEMPLATES: Record<Gender, Record<Side, string>> = {
  male: {
    front: "/templates/adult-male-front.png",
    back: "/templates/adult-male-back.png",
  },
  female: {
    front: "/templates/adult-female-front.png",
    back: "/templates/adult-female-back.png",
  },
  "child-male": {
    front: "/templates/child-male-front.png",
    back: "/templates/child-male-back.png",
  },
  "child-female": {
    front: "/templates/child-female-front.png",
    back: "/templates/child-female-back.png",
  },
};

/** 設計畫布／模特校稿：依性別的正背面模特圖 */
export function getModelTemplateSrc(gender: Gender, side: Side): string {
  return TEMPLATES[gender][side];
}

export const MODEL_PREVIEWS: Record<Gender, { id: string; label: string }[]> = {
  male: [{ id: "male-1", label: "模特 A" }],
  female: [{ id: "female-1", label: "模特 A" }],
  "child-male": [{ id: "child-male-1", label: "男生" }],
  "child-female": [{ id: "child-female-1", label: "女生" }],
};

export type ModelType = "male" | "female" | "child";

export const MODEL_TYPE_OPTIONS: { id: ModelType; label: string }[] = [
  { id: "male", label: "男生" },
  { id: "female", label: "女生" },
  { id: "child", label: "孩童" },
];

export function getModelType(gender: Gender): ModelType {
  if (gender === "child-male" || gender === "child-female") return "child";
  return gender;
}

/** 成人模特選項 */
export const ADULT_MODEL_OPTIONS: Record<
  "male" | "female",
  { id: Gender; label: string; preview: string }[]
> = {
  male: [
    {
      id: "male",
      label: "模特 A",
      preview: TEMPLATES.male.front,
    },
  ],
  female: [
    {
      id: "female",
      label: "模特 A",
      preview: TEMPLATES.female.front,
    },
  ],
};

/** 孩童類型下的男生 / 女生選項 */
export const CHILD_MODEL_OPTIONS: {
  id: Extract<Gender, "child-male" | "child-female">;
  label: string;
  preview: string;
}[] = [
  {
    id: "child-male",
    label: "男生",
    preview: TEMPLATES["child-male"].front,
  },
  {
    id: "child-female",
    label: "女生",
    preview: TEMPLATES["child-female"].front,
  },
];

export type ChildGender = (typeof CHILD_MODEL_OPTIONS)[number]["id"];

/** 舊草稿可能仍使用 child */
export function normalizeGender(value: string): Gender {
  if (value === "child") return "child-male";
  if (
    value === "male" ||
    value === "female" ||
    value === "child-male" ||
    value === "child-female"
  ) {
    return value;
  }
  return "child-male";
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg";
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
/** 設計器圖片上傳提示（格式與 accept 一致；PDF 請使用專業交稿流程） */
export const UPLOAD_FILE_HINT =
  "PNG / JPG，最大尺寸：6000×6000 px，最小尺寸：500×500 px，建議使用 300 DPI 圖片以獲得較佳印刷品質";
export const MIN_IMAGE_WIDTH = 500;
export const MIN_IMAGE_HEIGHT = 500;
export const RECOMMENDED_IMAGE_WIDTH = DESIGN_AREA_WIDTH;
export const RECOMMENDED_IMAGE_HEIGHT = DESIGN_AREA_HEIGHT;
export const MAX_IMAGE_WIDTH = 6000;
export const MAX_IMAGE_HEIGHT = 6000;
export const MAX_IMAGES_PER_SIDE = 10;
export const MAX_TEXT_LAYERS = 20;
export const MAX_SHAPE_LAYERS = 20;
export const EXPORT_WIDTH = DESIGN_AREA_WIDTH;
export const EXPORT_HEIGHT = DESIGN_AREA_HEIGHT;
export const PREVIEW_MAX_EDGE = 2400;

export const UPLOAD_SPEC_LINES = [
  "支援：PNG / JPG / JPEG / WEBP",
  "最大檔案：25MB",
  "最低尺寸：1000×1000",
  `推薦尺寸：${DESIGN_AREA_WIDTH}×${DESIGN_AREA_HEIGHT}`,
  "最大尺寸：5000×5000",
  "單面圖片：10 張",
  "文字：20 個",
  "上傳後自動等比例置中（寬 85%~90%）",
] as const;

/** 管理員／送出申請後匯出規格說明（使用者端不提供下載） */
export const EXPORT_SPEC_LINE = `匯出：PNG · ${DESIGN_AREA_WIDTH}×${DESIGN_AREA_HEIGHT}px · 透明背景 · ${EXPORT_DPI} DPI · 僅可印刷區`;
/** 吸附／格線間距（cm）→ 設計座標由 cmToDesignUnits 換算 */
export const SNAP_THRESHOLD_CM = 1;
export const GRID_SIZE_CM = 2.5;
export const GRID_SNAP_THRESHOLD_CM = 0.8;
export const ELEMENT_SNAP_THRESHOLD_CM = 0.8;

/** @deprecated 設計幾何請用 cm（design-cm.ts） */
export const SNAP_THRESHOLD = cmToDesignUnits(SNAP_THRESHOLD_CM);
/** @deprecated 設計幾何請用 GRID_SIZE_CM */
export const GRID_SIZE = cmToDesignUnits(GRID_SIZE_CM);
/** @deprecated 設計幾何請用 GRID_SNAP_THRESHOLD_CM */
export const GRID_SNAP_THRESHOLD = cmToDesignUnits(GRID_SNAP_THRESHOLD_CM);
/** @deprecated 設計幾何請用 ELEMENT_SNAP_THRESHOLD_CM */
export const ELEMENT_SNAP_THRESHOLD = cmToDesignUnits(
  ELEMENT_SNAP_THRESHOLD_CM,
);
export const ELEMENT_SNAP_MIN = 4;
export const ELEMENT_SNAP_MAX = 24;
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;
export const DRAFT_STORAGE_KEY = "tshirt-designer-draft";
export const DRAFT_DB_NAME = "tshirt-designer-db";
export const DRAFT_STORE_NAME = "draft-images";
/** IndexedDB schema version；升級時於 onupgradeneeded 確保 object store 存在 */
export const DRAFT_DB_VERSION = 2;

/** 工廠試穿尺寸區間（身高 cm、體重 kg） */
const FACTORY_TRYON_SIZE_RANGES = [
  { size: "XS", heightMin: 130, heightMax: 155, weightMin: 45, weightMax: 50 },
  { size: "S", heightMin: 140, heightMax: 160, weightMin: 50, weightMax: 60 },
  { size: "M", heightMin: 150, heightMax: 175, weightMin: 55, weightMax: 75 },
  { size: "L", heightMin: 155, heightMax: 180, weightMin: 70, weightMax: 90 },
  { size: "XL", heightMin: 155, heightMax: 185, weightMin: 85, weightMax: 105 },
  { size: "2XL", heightMin: 160, heightMax: 190, weightMin: 100, weightMax: 115 },
] as const satisfies ReadonlyArray<{
  size: Size;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
}>;

function inTryonRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function tryonFitScore(
  heightCm: number,
  weightKg: number,
  range: (typeof FACTORY_TRYON_SIZE_RANGES)[number],
): number {
  const heightCenter = (range.heightMin + range.heightMax) / 2;
  const weightCenter = (range.weightMin + range.weightMax) / 2;
  const heightSpan = Math.max(range.heightMax - range.heightMin, 1);
  const weightSpan = Math.max(range.weightMax - range.weightMin, 1);
  const heightDelta = (heightCm - heightCenter) / heightSpan;
  const weightDelta = (weightKg - weightCenter) / weightSpan;
  return heightDelta * heightDelta + weightDelta * weightDelta;
}

/** 依工廠試穿表建議尺寸（身高、體重皆須落在區間內） */
export function suggestSize(heightCm: number, weightKg: number): SizeSuggestion {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return SIZE_CONTACT_MESSAGE;
  }

  const matches = FACTORY_TRYON_SIZE_RANGES.filter(
    (range) =>
      inTryonRange(heightCm, range.heightMin, range.heightMax) &&
      inTryonRange(weightKg, range.weightMin, range.weightMax),
  );

  if (matches.length === 0) {
    return SIZE_CONTACT_MESSAGE;
  }

  if (matches.length === 1) {
    return matches[0].size;
  }

  return matches.reduce((best, current) =>
    tryonFitScore(heightCm, weightKg, current) <
    tryonFitScore(heightCm, weightKg, best)
      ? current
      : best,
  ).size;
}
