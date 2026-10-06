import { getContext } from "@/lib/context";
import { loadProducts } from "@/lib/loaders";
import { PageHeader } from "@/components/ui";
import { NewCallForm } from "./form";

export default async function NewCallPage({ searchParams }: { searchParams: Promise<{ deal?: string; account?: string }> }) {
  const { deal, account } = await searchParams;
  const ctx = await getContext();
  const [products, { data: accounts }, { data: contacts }, { data: deals }] = await Promise.all([
    loadProducts(ctx),
    ctx.supabase.from("accounts").select("id, name").neq("status", "disqualified").order("name"),
    ctx.supabase.from("contacts").select("id, account_id, name, title").eq("opted_out", false).order("name"),
    ctx.supabase.from("deals").select("id, name, account_id, product_id").not("stage", "in", "(won,lost)").order("name"),
  ]);
  const preDeal = (deals ?? []).find((d) => d.id === deal);
  return (
    <div className="max-w-xl">
      <PageHeader back={{ href: "/calls", label: "Calls" }} title="Plan a call" subtitle="Choose the single objective for this conversation." />
      <NewCallForm
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        accounts={accounts ?? []}
        contacts={contacts ?? []}
        deals={deals ?? []}
        initialDeal={deal}
        initialAccount={preDeal?.account_id ?? account}
      />
    </div>
  );
}
