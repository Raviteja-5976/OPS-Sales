import { getContext } from "@/lib/context";
import { loadChecklist } from "@/lib/loaders";
import { Checklist } from "@/components/checklist";
import { Card } from "@/components/ui";

export default async function ProductChecklistPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const ctx = await getContext();
  const [foundation, plan] = await Promise.all([
    loadChecklist(ctx, "foundation", "product", productId),
    loadChecklist(ctx, "sales_plan", "product", productId),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <Checklist data={foundation} entityType="product" entityId={productId} />
      </Card>
      <Card>
        <Checklist data={plan} entityType="product" entityId={productId} />
      </Card>
    </div>
  );
}
