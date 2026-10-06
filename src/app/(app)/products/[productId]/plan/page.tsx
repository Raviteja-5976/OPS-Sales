import { getContext } from "@/lib/context";
import { loadFoundation } from "@/lib/loaders";
import { PlanStudio } from "./plan-studio";
import type { SalesPlanContent, SalesPlanInputs } from "@/lib/types";

export default async function PlanPage({ params, searchParams }: { params: Promise<{ productId: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { productId } = await params;
  const { plan: planParam } = await searchParams;
  const ctx = await getContext();
  const [{ data }, f] = await Promise.all([
    ctx.supabase.from("sales_plans").select("*").eq("product_id", productId).order("created_at", { ascending: false }),
    loadFoundation(ctx, productId),
  ]);
  const plans = (data ?? []) as { id: string; name: string; inputs: SalesPlanInputs; plan: SalesPlanContent; created_at: string }[];
  const selected = planParam === "new" ? null : plans.find((p) => p.id === planParam) ?? plans[0] ?? null;
  return (
    <PlanStudio
      key={selected?.id ?? "new"}
      productId={productId}
      plans={plans.map((p) => ({ id: p.id, name: p.name }))}
      plan={selected}
      foundationApproved={!!f.approved}
    />
  );
}
