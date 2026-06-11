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
} as const;
