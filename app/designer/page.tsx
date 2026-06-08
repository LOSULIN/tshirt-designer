import { DesignerApp } from "@/components/designer/DesignerApp";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "服飾客製化設計器",
  description: "線上服飾設計平台 MVP",
};

export default function DesignerPage() {
  return (
    <div className="flex h-screen flex-col">
      <LandingNav />
      <div className="min-h-0 flex-1">
        <DesignerApp />
      </div>
    </div>
  );
}
