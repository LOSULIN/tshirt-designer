import type { ValidationCategory } from "./types";

/** Rule Set interface — future DTF / DTG / Screen / Embroidery switch point. */
export interface PrintRuleDefinition {
  ruleId: string;
  ruleName: string;
  version: string;
  category: ValidationCategory;
  reason: string;
  suggestion: string;
  minimumDisplay: string;
  recommendedDisplay: string;
}

export interface PrintRuleSet {
  id: string;
  version: string;
  name: string;
  printingMethod: string;
  industrySource: string;
  rules: Record<string, PrintRuleDefinition>;
}

export const PROFESSIONAL_PRINT_STANDARD_V1: PrintRuleSet = {
  id: "professional-print-v1",
  version: "1.0.0",
  name: "Professional Print Standard V1",
  printingMethod: "DTF",
  industrySource: "TIIIGO Print Standard V1",
  rules: {
    "PRINT-001": {
      ruleId: "PRINT-001",
      ruleName: "Blue Print Area Hard Limit",
      version: "1.0.0",
      category: "print-area",
      reason: "超出可印刷區無法製版送印。",
      suggestion: "將圖層移回藍色印刷區內。",
      minimumDisplay: "完全在藍框內",
      recommendedDisplay: "完全在藍框內",
    },
    "SAFE-001": {
      ruleId: "SAFE-001",
      ruleName: "Orange Safety Margin",
      version: "1.0.0",
      category: "safety",
      reason: "靠近裁切邊緣可能因裁切公差被切到。",
      suggestion: "建議保留至少 1.0 cm 安全邊距。",
      minimumDisplay: "0.5 cm",
      recommendedDisplay: "1.0 cm",
    },
    "TEXT-001": {
      ruleId: "TEXT-001",
      ruleName: "Minimum Font Size",
      version: "1.0.0",
      category: "text",
      reason: "DTF 細字容易糊掉。",
      suggestion: "建議使用 8 pt 以上字級。",
      minimumDisplay: "6 pt",
      recommendedDisplay: "8 pt",
    },
    "TEXT-002": {
      ruleId: "TEXT-002",
      ruleName: "Text Stroke Width",
      version: "1.0.0",
      category: "stroke",
      reason: "過細描邊在轉印後可能消失。",
      suggestion: "建議描邊至少 0.4 mm。",
      minimumDisplay: "0.3 mm",
      recommendedDisplay: "0.4 mm",
    },
    "LINE-001": {
      ruleId: "LINE-001",
      ruleName: "Line Thickness",
      version: "1.0.0",
      category: "line",
      reason: "過細線條在轉印後可能斷裂。",
      suggestion: "建議線條至少 0.4 mm。",
      minimumDisplay: "0.3 mm",
      recommendedDisplay: "0.4 mm",
    },
    "STROKE-001": {
      ruleId: "STROKE-001",
      ruleName: "Shape Stroke Width",
      version: "1.0.0",
      category: "stroke",
      reason: "過細描邊在轉印後可能消失。",
      suggestion: "建議描邊至少 0.4 mm。",
      minimumDisplay: "0.3 mm",
      recommendedDisplay: "0.4 mm",
    },
    "DPI-001": {
      ruleId: "DPI-001",
      ruleName: "Raster Resolution (Critical)",
      version: "1.0.0",
      category: "dpi",
      reason: "解析度過低會導致印刷模糊。",
      suggestion: "建議至少 300 DPI，理想 350 DPI 以上。",
      minimumDisplay: "300 DPI",
      recommendedDisplay: "350 DPI",
    },
    "DPI-002": {
      ruleId: "DPI-002",
      ruleName: "Raster Resolution (Warning)",
      version: "1.0.0",
      category: "dpi",
      reason: "解析度偏低，大圖印刷可能不夠銳利。",
      suggestion: "建議提升至 350 DPI 以上。",
      minimumDisplay: "300 DPI",
      recommendedDisplay: "350 DPI",
    },
  },
};

export const DEFAULT_RULE_SET = PROFESSIONAL_PRINT_STANDARD_V1;

export function getRule(
  ruleSet: PrintRuleSet,
  ruleId: string,
): PrintRuleDefinition {
  const rule = ruleSet.rules[ruleId];
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  return rule;
}
