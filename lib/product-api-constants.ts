/**
 * Product API constants — leaf module for server routes.
 * No dependency on @/lib/constants or coordinate runtimes.
 */

export const DEFAULT_PRODUCT_ID = "basic-tshirt" as const;

export type DefaultProductId = typeof DEFAULT_PRODUCT_ID;

export type ModelType = "male" | "female" | "child";
