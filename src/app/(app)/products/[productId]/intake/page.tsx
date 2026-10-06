import { getContext } from "@/lib/context";
import { loadProduct } from "@/lib/loaders";
import { IntakeEditor, InterviewEditor } from "./editors";

export default async function IntakePage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const ctx = await getContext();
  const product = await loadProduct(ctx, productId);
  return (
    <div className="space-y-8">
      <InterviewEditor key={(product.intake.interview ?? []).length} productId={productId} interview={product.intake.interview ?? []} />
      <IntakeEditor product={product} />
    </div>
  );
}
