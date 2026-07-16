import { CalibrationTool } from "@/components/render/CalibrationTool";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "Render Calibration | TIIIGO",
  description: "UA35001 商品素材印刷區校正工具",
};

export default function RenderCalibrationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <CalibrationTool />
    </div>
  );
}
