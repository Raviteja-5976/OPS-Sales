import { getContext } from "@/lib/context";
import { loadFoundation, loadProduct } from "@/lib/loaders";
import { Badge, PageHeader } from "@/components/ui";
import { ProductTabs } from "./tabs";

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const ctx = await getContext();
  const [product, f] = await Promise.all([loadProduct(ctx, productId), loadFoundation(ctx, productId)]);
  return (
    <div>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {product.name}
            {f.approved ? <Badge tone="green">Foundation v{f.approved.version} approved</Badge> : <Badge tone="amber">Foundation not approved</Badge>}
          </span>
        }
        subtitle={product.one_liner}
      />
      <ProductTabs productId={productId} />
      {children}
    </div>
  );
}
