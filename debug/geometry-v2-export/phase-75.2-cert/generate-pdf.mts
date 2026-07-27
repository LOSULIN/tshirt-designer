/**
 * Phase 75.2 — Generate Submit PDF (production factory-proof path).
 * Run from repo root: npx tsx debug/geometry-v2-export/phase-75.2-cert/generate-pdf.mts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProofOrder } from "../../../lib/proof-engine/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "artifacts");
mkdirSync(OUT, { recursive: true });

const order = {
  order_id: "phase-75.2-cert",
  submission_no: "CERT-752",
  gender: "male",
  shirt_color: "white",
  size: "M",
  active_side: "front",
  layers_by_template: {
    male: {
      front: [
        {
          id: "cert-text",
          type: "text",
          visible: true,
          x: 0,
          y: 0,
          width: 20,
          height: 4,
          rotation: 0,
          text: "CERT752",
          fontFamily: "Inter",
          fontSize: 4.8,
          color: "#000000",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
      back: [],
    },
    female: { front: [], back: [] },
    "child-male": { front: [], back: [] },
    "child-female": { front: [], back: [] },
  },
  created_at: new Date().toISOString(),
} as ProofOrder;

const mockupPath = join(OUT, "submit-mockup.png");
if (!existsSync(mockupPath)) {
  throw new Error("submit-mockup.png required — run generate-artifacts.mjs first");
}
const mockupBytes = readFileSync(mockupPath);

const { generateProofPdfWithGeometryRuntime } = await import(
  "../../../lib/designer-geometry-v2/geometry-runtime-export-pdf.server.ts"
);

const pdfBytes = await generateProofPdfWithGeometryRuntime({
  order,
  version: 1,
  mockupImages: { front: mockupBytes },
  geometryVersion: "v1",
});

writeFileSync(join(OUT, "submit-pdf.pdf"), Buffer.from(pdfBytes));
console.log("Wrote submit-pdf.pdf", pdfBytes.length, "bytes");
