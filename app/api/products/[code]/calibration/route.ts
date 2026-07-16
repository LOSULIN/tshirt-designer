import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { parseProductCalibration, serializeProductCalibration } from "@/lib/render/calibration";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ code: string }>;
}

/** Dev calibration tool — persist mapping to public/products/{code}/calibration.json */
export async function PUT(request: Request, context: RouteContext) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Calibration save API is disabled in production" },
      { status: 403 },
    );
  }

  const { code } = await context.params;
  if (!/^[A-Z0-9_-]+$/i.test(code)) {
    return NextResponse.json({ error: "Invalid product code" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const calibration = parseProductCalibration(body);
    const json = serializeProductCalibration(calibration);
    const filePath = path.join(process.cwd(), "public", "products", code, "calibration.json");
    await writeFile(filePath, `${json}\n`, "utf8");
    return NextResponse.json({ ok: true, path: `public/products/${code}/calibration.json` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save calibration" },
      { status: 500 },
    );
  }
}
