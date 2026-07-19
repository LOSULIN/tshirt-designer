/**
 * ============================================================
 * ARCHITECTURE GUARD — Phase 49.5
 *
 * Permanently enforces separation between:
 *   • Designer UX Layer
 *   • Professional Print Validation Layer
 *   • Render / Export / Placement / Calibration pipelines
 *
 * Run in CI or locally:
 *   npx tsx lib/architecture-guard.ts
 *
 * Architecture Contract — Phase 49.5
 * ============================================================
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

/** Designer Layer modules that MUST NEVER import lib/print-validation/* */
export const FORBIDDEN_PRINT_VALIDATION_IMPORT_FILES = [
  "lib/text-layer.ts",
  "lib/shape-layer.ts",
  "lib/design-cm.ts",
  "lib/designer-coordinate-controller.ts",
  "lib/text-style.ts",
  "lib/designer-defaults.ts",
  "lib/layer-constraints.ts",
  "lib/layer-overflow.ts",
  "lib/placement-presets.ts",
  "lib/garment-anchor-runtime.ts",
  "lib/print-export-system.ts",
  "lib/export-artwork-factory.ts",
  "lib/product-mockup-compose.ts",
  "lib/mockup-export.ts",
  "lib/export-runtime.ts",
  "lib/coordinate-runtime.ts",
] as const;

/** Only these UI components may import print-validation (display/analyze only) */
export const ALLOWED_PRINT_VALIDATION_UI_IMPORTS = [
  "components/designer/PrintValidationPanel.tsx",
  "components/designer/LayerPrintValidationSection.tsx",
  "components/designer/DesignWorkspaceStatusBar.tsx",
] as const;

/** Guard modules may import print-validation for coupling detection only */
export const ALLOWED_GUARD_PRINT_VALIDATION_IMPORTS = [
  "lib/designer-defaults.regression.ts",
  "lib/architecture-guard.ts",
] as const;

const PRINT_VALIDATION_IMPORT_RE =
  /(?:from|import)\s+["']@\/lib\/print-validation|(?:from|import)\s+["'][^"']*print-validation/;

const DESIGNER_DEFAULTS_IMPORT_RE =
  /(?:from|import)\s+["']@\/lib\/designer-defaults|(?:from|import)\s+["'][^"']*designer-defaults/;

export interface ArchitectureGuardCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface ArchitectureGuardResult {
  pass: boolean;
  checks: ArchitectureGuardCheck[];
  importReport: { file: string; imports: string[] }[];
}

function readSource(relativePath: string): string | null {
  const abs = join(ROOT, relativePath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function findPrintValidationImports(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => PRINT_VALIDATION_IMPORT_RE.test(line));
}

function findDesignerDefaultsImports(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => DESIGNER_DEFAULTS_IMPORT_RE.test(line));
}

export function runArchitectureGuard(): ArchitectureGuardResult {
  const checks: ArchitectureGuardCheck[] = [];
  const importReport: ArchitectureGuardResult["importReport"] = [];

  const assert = (name: string, pass: boolean, detail: string) => {
    checks.push({ name, pass, detail });
  };

  // Part 1: Forbidden Designer Layer imports
  for (const file of FORBIDDEN_PRINT_VALIDATION_IMPORT_FILES) {
    const source = readSource(file);
    if (!source) {
      assert(`Forbidden import scan: ${file}`, true, "file not present (skipped)");
      continue;
    }
    const imports = findPrintValidationImports(source);
    if (imports.length > 0) {
      importReport.push({ file, imports });
    }
    assert(
      `No print-validation import: ${file}`,
      imports.length === 0,
      imports.length > 0
        ? `ILLEGAL: ${imports.join("; ")}`
        : "clean",
    );
  }

  // Allowed UI imports — must ONLY be the three validation display components
  for (const file of ALLOWED_PRINT_VALIDATION_UI_IMPORTS) {
    const source = readSource(file);
    if (!source) {
      assert(`Allowed UI import exists: ${file}`, false, "file missing");
      continue;
    }
    const imports = findPrintValidationImports(source);
    importReport.push({ file, imports });
    assert(
      `UI validation consumer: ${file}`,
      imports.length > 0,
      imports.length > 0 ? imports.join("; ") : "expected print-validation import",
    );
  }

  // Validation must NOT import designer-defaults (all entry points)
  const validationEntryFiles = [
    "lib/print-validation/validator.ts",
    "lib/print-validation/constants.ts",
    "lib/print-validation/index.ts",
    "lib/print-validation/score.ts",
    "lib/print-validation/factory-summary.ts",
  ];
  for (const file of validationEntryFiles) {
    const source = readSource(file);
    if (!source) continue;
    const imports = findDesignerDefaultsImports(source);
    if (imports.length > 0) importReport.push({ file, imports });
    assert(
      `Validation must not import designer-defaults: ${file}`,
      imports.length === 0,
      imports.length > 0 ? `ILLEGAL: ${imports.join("; ")}` : "clean",
    );
  }

  return {
    pass: checks.every((c) => c.pass),
    checks,
    importReport,
  };
}

// CLI entry
const isMain =
  typeof process !== "undefined" &&
  process.argv[1]?.includes("architecture-guard");

if (isMain) {
  const result = runArchitectureGuard();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
}
