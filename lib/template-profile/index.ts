/**
 * Template Profile — 模板座標基準（Repository 匯出入口）。
 */

import { ADULT_WHITE_BACK_TEMPLATE_PROFILE as adultWhiteBackProfile } from "./adult-white-back";
import { ADULT_WHITE_FRONT_TEMPLATE_PROFILE as adultWhiteFrontProfile } from "./adult-white-front";
import type { TemplateProfile } from "./types";

export type {
  TemplateProfile,
  TemplateProfileCanvas,
  TemplateProfileGarment,
  TemplateProfileMeasurement,
  TemplateProfilePrint,
} from "./types";

export { ADULT_WHITE_BACK_TEMPLATE_PROFILE } from "./adult-white-back";
export { ADULT_WHITE_FRONT_TEMPLATE_PROFILE } from "./adult-white-front";

export type TemplateProfileId = "adult-white-front" | "adult-white-back";

const TEMPLATE_PROFILES: Record<TemplateProfileId, TemplateProfile> = {
  "adult-white-front": adultWhiteFrontProfile,
  "adult-white-back": adultWhiteBackProfile,
};

export function getTemplateProfile(id: string): TemplateProfile {
  if (!(id in TEMPLATE_PROFILES)) {
    throw new Error("Unknown template profile");
  }
  return TEMPLATE_PROFILES[id as TemplateProfileId];
}

/** 目前設計器使用的模板 Profile（Step 8.4：自 Repository 查詢） */
export function getCurrentTemplateProfile(): TemplateProfile {
  return TEMPLATE_PROFILES["adult-white-front"];
}

export function listTemplateProfiles(): TemplateProfile[] {
  return Object.values(TEMPLATE_PROFILES);
}

export function getTemplateSilhouetteScale(profile: TemplateProfile): number {
  return profile.measurement.silhouetteScale ?? 1;
}
