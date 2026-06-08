export type Gender = "male" | "female" | "child-male" | "child-female";
export type Side = "front" | "back";
export type Product = "basic-tshirt" | "sweatshirt";
export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type Fit = "standard";
export type Material = "cotton-200" | "cotton-240" | "blend-180";
export type ShirtColor =
  | "white"
  | "black"
  | "light-gray"
  | "dark-gray"
  | "pink"
  | "lavender"
  | "light-blue"
  | "navy"
  | "beige"
  | "green";

export const SHIRT_COLORS = [
  { id: "white", name: "白色", hex: "#FFFFFF" },
  { id: "black", name: "黑色", hex: "#111111" },
  { id: "light-gray", name: "淺灰", hex: "#D1D5DB" },
  { id: "dark-gray", name: "深灰", hex: "#4B5563" },
  { id: "beige", name: "米色", hex: "#D6C6A8" },
  { id: "green", name: "綠色", hex: "#4ADE80" },
  { id: "pink", name: "粉紅", hex: "#F9A8D4" },
  { id: "lavender", name: "粉紫", hex: "#C4B5FD" },
  { id: "light-blue", name: "粉藍", hex: "#93C5FD" },
  { id: "navy", name: "深藍", hex: "#1E3A8A" },
] as const;

export function getShirtColorHex(color: ShirtColor): string {
  return SHIRT_COLORS.find((c) => c.id === color)?.hex ?? "#FFFFFF";
}

export const PRODUCTS: Record<Product, { name: string; description: string }> = {
  "basic-tshirt": { name: "短袖 T 恤", description: "基本款圓領短袖" },
  sweatshirt: { name: "大學 T", description: "厚磅圓領長袖" },
};

export const PRODUCT_LIST: Product[] = ["basic-tshirt", "sweatshirt"];

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

export const MATERIAL_OPTIONS: { id: Material; label: string }[] = [
  { id: "cotton-200", label: "100% 純棉 200g (5.9oz)" },
  { id: "cotton-240", label: "100% 純棉 240g (7.1oz)" },
  { id: "blend-180", label: "棉混紡 180g (5.3oz)" },
];

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 1536;

/** 最終輸出設計區（實際像素） */
export const DESIGN_AREA_WIDTH = 3600;
export const DESIGN_AREA_HEIGHT = 4200;
export const EXPORT_DPI = 300;
export const DESIGN_SAFE_MARGIN = 0.05;
export const DESIGN_WIDTH_TARGET_RATIO = 0.875;

const PRINT_AREA_WIDTH = 360;
const PRINT_AREA_HEIGHT = 420;

/** 預覽畫布上的印刷區（邏輯座標，比例等同 3600×4200 輸出） */
export const PRINT_AREA = {
  x: (CANVAS_WIDTH - PRINT_AREA_WIDTH) / 2,
  y: 610,
  width: PRINT_AREA_WIDTH,
  height: PRINT_AREA_HEIGHT,
} as const;

/** 設計區內安全邊界（相對 PRINT_AREA，5% 四周留白） */
export const SAFE_PRINT_AREA = {
  x: PRINT_AREA.width * DESIGN_SAFE_MARGIN,
  y: PRINT_AREA.height * DESIGN_SAFE_MARGIN,
  width: PRINT_AREA.width * (1 - DESIGN_SAFE_MARGIN * 2),
  height: PRINT_AREA.height * (1 - DESIGN_SAFE_MARGIN * 2),
} as const;

/**
 * 平面衣服素材（正面／背面）。
 * 將 PNG 放入 public/templates/ 後，把路徑填入即可取代 SVG 佔位圖。
 */
export const FLAT_SHIRT_TEMPLATES: Record<Side, string | null> = {
  front: null,
  back: null,
};

/** 平面衣服上的印刷區位置（相對衣服圖，可依素材微調） */
export const FLAT_SHIRT_PRINT_AREA: Record<
  Side,
  { left: string; top: string; width: string }
> = {
  front: { left: "31%", top: "29%", width: "38%" },
  back: { left: "31%", top: "27%", width: "38%" },
};

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
  "image/webp",
] as const;

export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_WIDTH = 1000;
export const MIN_IMAGE_HEIGHT = 1000;
export const RECOMMENDED_IMAGE_WIDTH = DESIGN_AREA_WIDTH;
export const RECOMMENDED_IMAGE_HEIGHT = DESIGN_AREA_HEIGHT;
export const MAX_IMAGE_WIDTH = 5000;
export const MAX_IMAGE_HEIGHT = 5000;
export const MAX_IMAGES_PER_SIDE = 10;
export const MAX_TEXT_LAYERS = 20;
export const EXPORT_WIDTH = DESIGN_AREA_WIDTH;
export const EXPORT_HEIGHT = DESIGN_AREA_HEIGHT;
export const PREVIEW_MAX_EDGE = 2400;

export const UPLOAD_SPEC_LINES = [
  "支援：PNG / JPG / JPEG / WEBP",
  "最大檔案：10MB",
  "最低尺寸：1000×1000",
  `推薦尺寸：${DESIGN_AREA_WIDTH}×${DESIGN_AREA_HEIGHT}`,
  "最大尺寸：5000×5000",
  "單面圖片：10 張",
  "文字：20 個",
  "上傳後自動等比例置中（寬 85%~90%）",
] as const;

export const EXPORT_SPEC_LINE = `輸出：PNG ${DESIGN_AREA_WIDTH}×${DESIGN_AREA_HEIGHT} 透明背景 ${EXPORT_DPI} DPI`;
export const SNAP_THRESHOLD = 12;
export const GRID_SIZE = 30;
export const GRID_SNAP_THRESHOLD = 10;
export const ELEMENT_SNAP_THRESHOLD = 10;
export const ELEMENT_SNAP_MIN = 4;
export const ELEMENT_SNAP_MAX = 24;
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;
export const DRAFT_STORAGE_KEY = "tshirt-designer-draft";
export const DRAFT_DB_NAME = "tshirt-designer-db";
export const DRAFT_STORE_NAME = "draft-images";

/** 依身高體重估算建議尺寸 */
export function suggestSize(heightCm: number, weightKg: number): Size {
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (heightCm < 160) return bmi < 20 ? "XS" : "S";
  if (heightCm < 170) return bmi < 22 ? "S" : "M";
  if (heightCm < 180) return bmi < 24 ? "M" : "L";
  if (heightCm < 190) return bmi < 26 ? "L" : "XL";
  return bmi < 28 ? "XL" : "XXL";
}
