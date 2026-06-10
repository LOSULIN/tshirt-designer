import { PrintAreaPreviewPanel } from "@/components/designer/PrintAreaPreviewPanel";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "印刷區校驗 | TIIIGO",
  description: "檢視固定 UI mockup 可印刷區於衣服模板上的位置",
};

export default function PrintAreaPreviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <PrintAreaPreviewPanel />
    </div>
  );
}
