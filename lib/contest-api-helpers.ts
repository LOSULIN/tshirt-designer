/**
 * Contest API helpers — leaf module for /api/contest/submit.
 * No dependency on @/lib/constants or coordinate runtimes.
 */

import { DEFAULT_PRODUCT_ID } from "./product-api-constants";
import { getProductDisplayName } from "./product-metadata";
import { GENDER_OPTIONS, type Gender } from "./proof-engine/proof-domain";

export { DEFAULT_PRODUCT_ID as CONTEST_DEFAULT_PRODUCT_ID };

export function formatContestProductLabel(productType: string | null): string {
  if (!productType || productType === DEFAULT_PRODUCT_ID) {
    return getProductDisplayName();
  }
  return productType;
}

export function formatContestTemplateLabel(templateType: string): string {
  return (
    GENDER_OPTIONS.find((option) => option.id === (templateType as Gender))
      ?.label ?? templateType
  );
}
