import { ProductPreview } from "@/components/products/ProductPreview";
import { ProductSelector } from "@/components/products/ProductSelector";
import { LandingNav } from "@/components/landing/LandingNav";
import { ProductRegistryPageClient } from "@/components/products/ProductRegistryPageClient";

export const metadata = {
  title: "Product Registry | TIIIGO",
  description: "商品平台 Registry 管理（RC-1）",
};

export default function ProductsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <ProductRegistryPageClient />
    </div>
  );
}
