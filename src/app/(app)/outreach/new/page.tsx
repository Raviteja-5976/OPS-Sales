import { getContext } from "@/lib/context";
import { loadProducts } from "@/lib/loaders";
import type { Account, Contact } from "@/lib/types";
import { Empty, PageHeader } from "@/components/ui";
import { Composer } from "./composer";
import Link from "next/link";

export default async function NewOutreachPage({ searchParams }: { searchParams: Promise<{ account?: string; contact?: string }> }) {
  const { account, contact } = await searchParams;
  const ctx = await getContext();
  const [products, { data: accounts }, { data: contacts }] = await Promise.all([
    loadProducts(ctx),
    ctx.supabase.from("accounts").select("id, name, status, research_brief").neq("status", "disqualified").order("name"),
    ctx.supabase.from("contacts").select("id, account_id, name, title, opted_out, outreach_basis, email").order("name"),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: "/outreach", label: "Outreach" }}
        title="Compose outreach"
        subtitle="The objective is permission, relevance or a meeting — never to close in a cold message."
      />
      {!products.length ? (
        <Empty title="Add a product first" action={<Link className="btn btn-primary" href="/products/new">Add product</Link>} />
      ) : (
        <Composer
          products={products.map((p) => ({ id: p.id, name: p.name, approved: p.status === "active" }))}
          accounts={(accounts ?? []) as Pick<Account, "id" | "name" | "research_brief">[]}
          contacts={(contacts ?? []) as Pick<Contact, "id" | "account_id" | "name" | "title" | "opted_out" | "outreach_basis" | "email">[]}
          initialAccount={account}
          initialContact={contact}
        />
      )}
    </div>
  );
}
