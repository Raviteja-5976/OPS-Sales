import { getContext } from "@/lib/context";
import { loadFoundation, loadProduct } from "@/lib/loaders";
import { FoundationWorkspace } from "./foundation-workspace";

export default async function FoundationPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const ctx = await getContext();
  const [product, f] = await Promise.all([loadProduct(ctx, productId), loadFoundation(ctx, productId)]);
  const interview = product.intake.interview ?? [];
  return (
    <FoundationWorkspace
      productId={productId}
      approved={f.approved}
      draft={f.draft}
      unanswered={interview.filter((q) => !q.answer?.trim()).length}
      interviewed={interview.length > 0}
    />
  );
}
