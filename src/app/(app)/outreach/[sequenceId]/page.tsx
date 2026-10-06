import { notFound } from "next/navigation";
import Link from "next/link";
import { getContext } from "@/lib/context";
import type { Contact, Sequence } from "@/lib/types";
import { Badge, PageHeader, fmtDate } from "@/components/ui";
import { SequenceEditor } from "./sequence-editor";

const TONE = { draft: "amber", approved: "blue", active: "green", rejected: "red", stopped: "slate", completed: "slate" } as const;

export default async function SequencePage({ params }: { params: Promise<{ sequenceId: string }> }) {
  const { sequenceId } = await params;
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("sequences").select("*, accounts(id, name), contacts(*), products(name)").eq("id", sequenceId).maybeSingle();
  if (!data) notFound();
  const seq = data as Sequence & { accounts: { id: string; name: string }; contacts: Contact | null; products: { name: string } };

  return (
    <div>
      <PageHeader
        back={{ href: "/outreach", label: "Outreach" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {seq.contacts?.name ?? "No contact"} <span className="font-normal text-slate-400">at</span> {seq.accounts.name}
            <Badge tone={TONE[seq.status]}>{seq.status}</Badge>
          </span>
        }
        subtitle={
          <>
            {seq.products.name} · <span className="capitalize">{seq.objective}</span> objective · created {fmtDate(seq.created_at)}
            {seq.approved_at && ` · approved ${fmtDate(seq.approved_at, true)}`} ·{" "}
            <Link className="link" href={`/accounts/${seq.accounts.id}`}>
              Account
            </Link>
          </>
        }
      />
      <SequenceEditor key={seq.content ? JSON.stringify(seq.content).length : 0} seq={seq} contact={seq.contacts} />
    </div>
  );
}
