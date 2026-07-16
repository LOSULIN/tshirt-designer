import type { CalibrationRect } from "./render-types";

export type RenderValidationCheck =
  | "width-height"
  | "center"
  | "offset"
  | "xy"
  | "safe-area"
  | "scale"
  | "alpha";

export interface TestArtworkContext {
  designerPrintRect: CalibrationRect;
  productPrintRect: CalibrationRect;
  garmentWidth: number;
  garmentHeight: number;
}

export interface RenderTestCaseDefinition {
  id: string;
  number: number;
  title: string;
  description: string;
  checks: RenderValidationCheck[];
  markerColor: string;
  createArtwork: (context: TestArtworkContext) => HTMLCanvasElement;
}

export const RENDER_VALIDATION_PRODUCT = "UA35001";
export const RENDER_VALIDATION_COLOR = "black";
export const RENDER_VALIDATION_SIDE = "front" as const;

export const PRINT_AREA_ASPECT = 35 / 50;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export const RENDER_TEST_CASES: RenderTestCaseDefinition[] = [
  {
    id: "test-01-full-bleed",
    number: 1,
    title: "滿版 Artwork",
    description: "驗證 Width / Height",
    checks: ["width-height"],
    markerColor: "#e11d48",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return canvas;
    },
  },
  {
    id: "test-02-center-cross",
    number: 2,
    title: "中心十字",
    description: "驗證 Center",
    checks: ["center"],
    markerColor: "#22c55e",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return canvas;
    },
  },
  {
    id: "test-03-left-chest",
    number: 3,
    title: "左胸 Logo",
    description: "驗證 Offset",
    checks: ["offset"],
    markerColor: "#2563eb",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const size = Math.round(Math.min(designerPrintRect.width, designerPrintRect.height) * 0.18);
      const offsetX = Math.round(designerPrintRect.width * 0.12);
      const offsetY = Math.round(designerPrintRect.height * 0.1);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(offsetX, offsetY, size, size);
      (canvas as HTMLCanvasElement & { __offset?: { x: number; y: number; size: number } }).__offset = {
        x: offsetX,
        y: offsetY,
        size,
      };
      return canvas;
    },
  },
  {
    id: "test-04-corners",
    number: 4,
    title: "四角定位",
    description: "驗證 X / Y",
    checks: ["xy"],
    markerColor: "#f59e0b",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dot = 10;
      const corners = [
        { x: 0, y: 0, color: "#ef4444" },
        { x: canvas.width - dot, y: 0, color: "#22c55e" },
        { x: 0, y: canvas.height - dot, color: "#3b82f6" },
        { x: canvas.width - dot, y: canvas.height - dot, color: "#f59e0b" },
      ];
      for (const corner of corners) {
        ctx.fillStyle = corner.color;
        ctx.fillRect(corner.x, corner.y, dot, dot);
      }
      return canvas;
    },
  },
  {
    id: "test-05-safe-area",
    number: 5,
    title: "安全區",
    description: "Artwork 是否超出 Print Area",
    checks: ["safe-area"],
    markerColor: "#d946ef",
    createArtwork: ({ designerPrintRect }) => {
      const margin = Math.round(
        Math.min(designerPrintRect.width, designerPrintRect.height) * 0.12,
      );
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#d946ef";
      ctx.fillRect(
        margin,
        margin,
        canvas.width - margin * 2,
        canvas.height - margin * 2,
      );
      return canvas;
    },
  },
  {
    id: "test-06-35x50",
    number: 6,
    title: "35×50 Artwork",
    description: "驗證 Scale",
    checks: ["scale"],
    markerColor: "#0ea5e9",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      return canvas;
    },
  },
  {
    id: "test-07-alpha",
    number: 7,
    title: "透明背景 Artwork",
    description: "PNG Alpha 是否保留",
    checks: ["alpha"],
    markerColor: "#14b8a6",
    createArtwork: ({ designerPrintRect }) => {
      const canvas = createCanvas(designerPrintRect.width, designerPrintRect.height);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#14b8a6";
      const radius = Math.round(
        Math.min(designerPrintRect.width, designerPrintRect.height) * 0.28,
      );
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    },
  },
];

export function getRenderTestCase(id: string): RenderTestCaseDefinition | undefined {
  return RENDER_TEST_CASES.find((test) => test.id === id);
}
