import type { Fit, Gender, Material, Side } from "./constants";

export interface DesignConfig {
  templateType: Gender;
  side: Side;
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  scale: number;
  rotation: number;
}

export interface UploadedDesignImage {
  originalBlob: Blob;
  originalUrl: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  /** 上傳時原始像素寬（品質分析；舊草稿可沿用 naturalWidth） */
  imagePixelWidth?: number;
  /** 上傳時原始像素高（品質分析；舊草稿可沿用 naturalHeight） */
  imagePixelHeight?: number;
  mimeType: string;
  fileName: string;
}

export type TextFontFamily = "Arial" | "Inter" | "Roboto" | "Noto Sans TC";

/** @deprecated 使用 TextDesignLayer */
export interface TextLayer {
  id: string;
  type: "text";
  text: string;
  fontSize_cm: number;
  fontFamily: TextFontFamily;
  color: string;
  opacity: number;
  fontWeight: number;
  rotation: number;
  scale: number;
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
}

export type LayerType = "image" | "text" | "shape";

export type ShapeKind = "rectangle" | "circle" | "line" | "arrow";

export type TextAlign = "left" | "center" | "right";

export interface TextStrokeStyle {
  color: string;
  width_cm: number;
}

export interface TextShadowStyle {
  color: string;
  blur_cm: number;
  offsetX_cm: number;
  offsetY_cm: number;
}

export interface LayerMeta {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface ImageDesignLayer extends LayerMeta {
  type: "image";
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  scale: number;
  rotation: number;
  image: UploadedDesignImage;
}

export interface TextDesignLayer extends LayerMeta {
  type: "text";
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  scale: number;
  rotation: number;
  text: string;
  fontSize_cm: number;
  fontFamily: TextFontFamily;
  color: string;
  opacity: number;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
  letterSpacing_cm?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  stroke?: TextStrokeStyle | null;
  shadow?: TextShadowStyle | null;
}

export interface ShapeDesignLayer extends LayerMeta {
  type: "shape";
  shapeKind: ShapeKind;
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  scale: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth_cm: number;
  opacity: number;
}

export type DesignLayer = ImageDesignLayer | TextDesignLayer | ShapeDesignLayer;

/** 各模特模板 × 正反面獨立圖層 */
export type DesignLayersByTemplate = Record<Gender, Record<Side, DesignLayer[]>>;

export interface DesignDraft {
  id: string;
  savedAt: string;
  expiresAt: string;
  submitted: boolean;
  config: DesignConfig;
  hasImage: boolean;
  shirtColor?: string;
  activeGender?: Gender;
  activeSide?: Side;
  /** 各模板 × 正反面獨立圖層（v2） */
  layersByTemplate?: DesignLayersByTemplate;
  textLayers?: TextLayer[];
  /** @deprecated 單一面向圖層（v1） */
  layers?: DesignLayer[];
}

export interface SubmitDesignResponse {
  designId: string;
  createdAt: string;
  files: {
    completed: string;
    original?: string;
    config: string;
    texts?: string;
  };
}

export type PanelTab =
  | "product"
  | "model"
  | "layers"
  | "help";

export interface ApplicationFormData {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  notes: string;
}

export interface DesignSubmissionMeta {
  product: string;
  size: string;
  shirtColor: string;
  fit: Fit;
  material: Material;
  gender: Gender;
  side: Side;
  heightCm?: number;
  weightKg?: number;
  suggestedSize?: string;
}
