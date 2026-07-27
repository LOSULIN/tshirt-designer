/**
 * UI-only visibility flags — 不影響 production / print / mockup / scale 邏輯。
 * 隱藏項目之元件與邏輯仍保留，日後可透過此處恢復。
 */
export const UI_VISIBILITY = {
  /** 「設計瀏覽」按鈕（DesignReviewModal 入口） */
  showDesignBrowseButton: false,
  /** 預覽畫布左側 Info Panel / Inspector（CanvasInfoPanel）— 選取物件時顯示尺寸 */
  showCanvasInfoPanel: true,
  /** 右側模特類型 / 模特選擇（ModelPanel） */
  showModelPanel: false,
  /** Phase 14.2：紫框／橘框／工程約束疊加層 */
  showEngineeringOverlays: false,
  /** Phase 77：Geometry Runtime 工程疊加（factory origin、collar、safe area 等） */
  showGeometryRuntimeDebugOverlay: false,
  /** Phase 77：Geometry Debug Console（開發用） */
  showGeometryDebugConsole: false,
  /** Phase 77：Runtime safe area 橘色虛線（工程用，非可印區） */
  showRuntimeSafeAreaOverlay: false,
  /** Phase 77：畫布中心多點十字 debug（Template / Shirt / Print area） */
  showCanvasCenterDebugMarkers: false,
  /** Phase 77：可印區中心十字準星（display only） */
  showPrintAreaCenterCrosshair: true,
  /** Phase 77：可印區中心垂直／水平導線 */
  showPrintAreaCenterGuides: true,
  /** Phase 77：可印區尺寸標籤（cm） */
  showPrintAreaSizeLabel: true,
} as const;
