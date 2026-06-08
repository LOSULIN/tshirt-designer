import type { Fit, Gender, Material, Side } from "./constants";

export interface DesignConfig {
  templateType: Gender;
  side: Side;
  x: number;
  y: number;
  width: number;
  height: number;
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
  mimeType: string;
  fileName: string;
}

export type TextFontFamily = "Arial" | "Inter" | "Roboto" | "Noto Sans TC";

/** @deprecated 使用 TextDesignLayer */
export interface TextLayer {
  id: string;
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: TextFontFamily;
  color: string;
  opacity: number;
  fontWeight: number;
  rotation: number;
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerMeta {
  id: string;
  name: string;
  type: "image" | "text";
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface ImageDesignLayer extends LayerMeta {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  image: UploadedDesignImage;
}

export interface TextDesignLayer extends LayerMeta {
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: TextFontFamily;
  color: string;
  opacity: number;
  fontWeight: number;
}

export type DesignLayer = ImageDesignLayer | TextDesignLayer;

export interface DesignDraft {
  id: string;
  savedAt: string;
  expiresAt: string;
  submitted: boolean;
  config: DesignConfig;
  hasImage: boolean;
  textLayers?: TextLayer[];
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
