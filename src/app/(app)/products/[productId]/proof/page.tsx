import { getContext } from "@/lib/context";
import { loadProof, loadFoundation } from "@/lib/loaders";
import { ProofLibrary } from "./proof-library";

export default async function ProofPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const ctx = await getContext();
  const [proof, f] = await Promise.all([loadProof(ctx, productId), loadFoundation(ctx, productId)]);
  const gaps = f.current?.content.offer?.evidence_gaps ?? [];
  return <ProofLibrary productId={productId} proof={proof} gaps={gaps} />;
}
