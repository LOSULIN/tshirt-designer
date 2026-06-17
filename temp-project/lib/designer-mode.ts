import {
  DRAFT_DB_NAME,
  DRAFT_STORAGE_KEY,
  DRAFT_STORE_NAME,
} from "./constants";

export type DesignerMode = "normal" | "contest";

export const DESIGNER_MODE_DEFAULT: DesignerMode = "normal";

export type DraftStorageConfig = {
  storageKey: string;
  dbName: string;
  storeName: string;
};

export function getDraftStorageConfig(mode: DesignerMode): DraftStorageConfig {
  if (mode === "contest") {
    return {
      storageKey: "tshirt-designer-contest-draft",
      dbName: "tshirt-designer-contest-db",
      storeName: DRAFT_STORE_NAME,
    };
  }

  return {
    storageKey: DRAFT_STORAGE_KEY,
    dbName: DRAFT_DB_NAME,
    storeName: DRAFT_STORE_NAME,
  };
}
