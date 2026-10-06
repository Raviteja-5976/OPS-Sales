import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadProducts } from "@/lib/loaders";
import { Empty, PageHeader } from "@/components/ui";
import { NewDealForm } from "./form";

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const ctx = await getContext();
  const [products, { data: accounts }] = await Promise.all([
    loadProducts(ctx),
    ctx.supabase.from("accounts").select("id, name").neq("status", "disqualified").order("name"),
  ]);
  return (
    <div className="max-w-xl">
      <PageHeader back={{ href: "/deals", label: "Deals" }} title="New deal" subtitle="A deal belongs to one account and one product." />
      {!products.length || !(accounts ?? []).length ? (
        <Empty title="You need a product and an account first">
          <div className="mt-3 flex justify-center gap-2">
            <Link className="btn" href="/products/new">Add product</Link>
            <Link className="btn" href="/accounts">Add account</Link>
          </div>
        </Empty>
      ) : (
        <NewDealForm products={products.map((p) => ({ id: p.id, name: p.name }))} accounts={accounts ?? []} initialAccount={account} />
      )}
    </div>
  );
}
