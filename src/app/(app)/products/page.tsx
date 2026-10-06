import Link from "next/link";
import { getContext } from "@/lib/context";
import { loadProducts } from "@/lib/loaders";
import { Badge, Empty, PageHeader, fmtDate } from "@/components/ui";

export default async function ProductsPage() {
  const ctx = await getContext();
  const products = await loadProducts(ctx);
  const [{ data: foundations }, { data: deals }, { data: plans }] = await Promise.all([
    ctx.supabase.from("foundations").select("product_id, status, version, approved_at").neq("status", "archived"),
    ctx.supabase.from("deals").select("product_id, stage"),
    ctx.supabase.from("sales_plans").select("product_id"),
  ]);

  return (
    <div>
      <PageHeader
        title="Products & plans"
        subtitle={`${ctx.org.name} sells ${products.length} product${products.length === 1 ? "" : "s"}. Each product has its own Sales Foundation, proof library and sales plan.`}
        actions={
          <Link href="/products/new" className="btn btn-primary">
            Add product
          </Link>
        }
      />
      {products.length === 0 ? (
        <Empty title="No products yet" action={<Link href="/products/new" className="btn btn-primary">Add your first product</Link>}>
          Start with the guided intake. It takes about 15 minutes and produces a Sales Foundation you can approve.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((p) => {
            const f = (foundations ?? []).filter((x) => x.product_id === p.id);
            const approved = f.find((x) => x.status === "approved");
            const draft = f.find((x) => x.status === "draft");
            const open = (deals ?? []).filter((d) => d.product_id === p.id && !["won", "lost", "nurture"].includes(d.stage)).length;
            const won = (deals ?? []).filter((d) => d.product_id === p.id && d.stage === "won").length;
            const planCount = (plans ?? []).filter((x) => x.product_id === p.id).length;
            return (
              <Link key={p.id} href={`/products/${p.id}`} className="card card-pad block transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900">{p.name}</h2>
                    {p.one_liner && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.one_liner}</p>}
                  </div>
                  {approved ? (
                    <Badge tone="green">Foundation v{approved.version} approved</Badge>
                  ) : draft ? (
                    <Badge tone="amber">Foundation draft</Badge>
                  ) : (
                    <Badge>No foundation</Badge>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>{open} open deal{open === 1 ? "" : "s"}</span>
                  <span>{won} won</span>
                  <span>{planCount} plan{planCount === 1 ? "" : "s"}</span>
                  <span>Updated {fmtDate(p.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
