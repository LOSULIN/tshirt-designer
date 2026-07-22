/**
 * Presentation layer isolation — UI camera must not import production pipelines.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

const PRESENTATION_FILES = [
  "lib/presentation/physical-garment-presentation.ts",
  "lib/presentation/product-preview-camera.ts",
  "components/designer/ProductPreviewPresentation.tsx",
  "components/designer/ProductMockupPreviewHero.tsx",
] as const;

const FORBIDDEN_IMPORT_PATTERNS = [
  /product-mockup-compose/,
  /ProductMockupEngine/,
  /product-export/,
  /export-artwork-factory/,
  /print-export-system/,
  /coordinate-runtime/,
  /print-validation/,
  /product-placement-scale/,
  /visual-compensation/,
  /composeArtwork/,
] as const;

const FORBIDDEN_SOURCE_PATTERNS = [
  /SIZE_CAMERA_OVERRIDES/,
  /if\s*\(\s*size\s*===\s*["']GS["']/,
  /if\s*\(\s*size\s*===\s*["']GM["']/,
  /if\s*\(\s*size\s*===\s*["']GL["']/,
  /transform:\s*[`'"].*scale\(/,
  /cameraZoom/,
] as const;

function readSource(relativePath: string): string | null {
  const abs = join(ROOT, relativePath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

export function runPresentationLayerGuard(): {
  pass: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (const file of PRESENTATION_FILES) {
    const source = readSource(file);
    if (!source) {
      violations.push(`${file}: missing`);
      continue;
    }
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${file}: forbidden import matching ${pattern}`);
      }
    }
    for (const pattern of FORBIDDEN_SOURCE_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${file}: forbidden source pattern ${pattern}`);
      }
    }
  }

  return { pass: violations.length === 0, violations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runPresentationLayerGuard();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
}
