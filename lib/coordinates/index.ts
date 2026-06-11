/**
 * 三層座標系統（彼此獨立，僅透過 Production mm 在執行期投影）
 *
 * 1. Production — 真實印刷尺寸（350×500 mm），工廠 PNG/PDF 唯一真相
 * 2. Preview   — 設計器 UI（1024×1536 平面模板 + overlay）
 * 3. Mockup    — 模特／平面 mockup 預覽與匯出
 *
 * 規則：
 * - production.ts 不 import preview / mockup
 * - preview.ts  不 import mockup（可 import production 換算 mm）
 * - mockup.ts   不 import preview（可 import production 換算 mm）
 * - debug-print-area.ts 為除錯聚合，可讀取三層
 */

export * from "./production";
export * from "./ui-print-offset";
export * from "./ui-print-area";
export * from "./preview-position-mode";
export * from "./garment";
export * from "./preview";
export * from "./mockup";
export * from "./debug-print-area";
export * from "./mockup-calibration";
