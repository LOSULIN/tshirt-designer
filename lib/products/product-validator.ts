import { getProductPrintAreaForSide, isCalibrationRectActive } from "@/lib/render/calibration";
import {
  checkAssetExists,
  fetchProductCalibrationFile,
  fetchProductProfile,
  resolveGarmentAssetRelativePath,
  resolveProductAssetUrl,
} from "./product-loader";
import type {
  ProductProfile,
  ProductValidationIssue,
  ProductValidationResult,
} from "./product-types";

const REQUIRED_PROFILE_FIELDS: (keyof ProductProfile)[] = [
  "code",
  "brand",
  "displayName",
  "category",
  "printArea",
  "safeArea",
  "availableSides",
  "availableColors",
  "availableSizes",
  "fabricInfo",
  "thumbnail",
  "previewAssets",
  "calibrationFile",
];

function issue(
  level: ProductValidationIssue["level"],
  message: string,
): ProductValidationIssue {
  return { level, message };
}

function validateProfileShape(profile: ProductProfile): ProductValidationIssue[] {
  const issues: ProductValidationIssue[] = [];

  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = profile[field];
    if (value === undefined || value === null) {
      issues.push(issue("error", `profile.json 缺少欄位：${field}`));
    }
  }

  if (profile.code && profile.availableSides.length === 0) {
    issues.push(issue("error", "availableSides 不可為空"));
  }
  if (profile.availableColors.length === 0) {
    issues.push(issue("error", "availableColors 不可為空"));
  }
  if (profile.availableSizes.length === 0) {
    issues.push(issue("error", "availableSizes 不可為空"));
  }
  if (profile.previewAssets.length === 0) {
    issues.push(issue("warning", "previewAssets 為空"));
  }

  for (const side of profile.availableSides) {
    if (!profile.printArea[side]) {
      issues.push(issue("error", `printArea 缺少 ${side} 設定`));
    }
    if (!profile.safeArea[side]) {
      issues.push(issue("warning", `safeArea 缺少 ${side} 設定`));
    }
  }

  return issues;
}

export async function validateProductProfile(
  code: string,
  profile?: ProductProfile,
): Promise<ProductValidationIssue[]> {
  const resolved = profile ?? (await fetchProductProfile(code));
  const issues = validateProfileShape(resolved);
  if (resolved.code !== code) {
    issues.push(
      issue(
        "error",
        `profile.code (${resolved.code}) 與請求代碼 (${code}) 不一致`,
      ),
    );
  }
  return issues;
}

export async function validateProductAssets(
  code: string,
  profile?: ProductProfile,
): Promise<ProductValidationIssue[]> {
  const resolved = profile ?? (await fetchProductProfile(code));
  const issues: ProductValidationIssue[] = [];

  const thumbnailUrl = resolveProductAssetUrl(code, resolved.thumbnail);
  if (!(await checkAssetExists(thumbnailUrl))) {
    issues.push(issue("error", `thumbnail 不存在：${resolved.thumbnail}`));
  }

  for (const asset of resolved.previewAssets) {
    for (const variant of ["preview", "export"] as const) {
      let relativePath: string;
      try {
        relativePath = resolveGarmentAssetRelativePath(asset, variant);
      } catch {
        issues.push(
          issue("error", `素材 ${asset.side}/${asset.color} 缺少 ${variant} 路徑`),
        );
        continue;
      }
      const url = resolveProductAssetUrl(code, relativePath);
      if (!(await checkAssetExists(url))) {
        issues.push(issue("error", `素材不存在：${relativePath}`));
      }
    }
  }

  return issues;
}

export async function validateProductCalibration(
  code: string,
  profile?: ProductProfile,
): Promise<{ issues: ProductValidationIssue[]; calibrationReady: boolean }> {
  const resolved = profile ?? (await fetchProductProfile(code));
  const issues: ProductValidationIssue[] = [];

  try {
    const calibration = await fetchProductCalibrationFile(
      code,
      resolved.calibrationFile,
    );
    const hasActiveSide = resolved.availableSides.some((side) => {
      const rect = getProductPrintAreaForSide(calibration, side);
      return isCalibrationRectActive(rect);
    });
    if (!hasActiveSide) {
      issues.push(
        issue("warning", "calibration.json 尚未設定有效印刷區（width/height > 0）"),
      );
    }
    return { issues, calibrationReady: hasActiveSide };
  } catch (err) {
    issues.push(
      issue(
        "error",
        err instanceof Error
          ? err.message
          : `calibration 檔案不存在：${resolved.calibrationFile}`,
      ),
    );
    return { issues, calibrationReady: false };
  }
}

export async function validateProduct(
  code: string,
): Promise<ProductValidationResult> {
  const issues: ProductValidationIssue[] = [];
  let profile: ProductProfile | undefined;

  try {
    profile = await fetchProductProfile(code);
  } catch (err) {
    issues.push(
      issue(
        "error",
        err instanceof Error ? err.message : `無法載入 ${code} profile.json`,
      ),
    );
    return {
      code,
      valid: false,
      issues,
      calibrationReady: false,
      renderReady: false,
    };
  }

  issues.push(...(await validateProductProfile(code, profile)));
  const assetIssues = await validateProductAssets(code, profile);
  issues.push(...assetIssues);
  const calibration = await validateProductCalibration(code, profile);
  issues.push(...calibration.issues);

  const hasErrors = issues.some((item) => item.level === "error");
  const assetsOk = !assetIssues.some((item) => item.level === "error");

  return {
    code,
    valid: !hasErrors,
    issues,
    calibrationReady: calibration.calibrationReady,
    renderReady: !hasErrors && assetsOk,
  };
}
