import { MockupCalibrationPanel } from "@/components/designer/MockupCalibrationPanel";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "Mockup Calibration | TIIIGO",
  description: "比對 Editor / Flat Shirt / Model Mockup 印刷區視覺錨點",
};

export default function MockupCalibrationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <MockupCalibrationPanel />
    </div>
  );
}
