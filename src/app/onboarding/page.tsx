import { redirect } from "next/navigation";
import { getSession } from "@/lib/context";
import { OnboardingForms } from "./forms";
import { Logo } from "@/components/ui";

export default async function OnboardingPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).maybeSingle();
  if (member) redirect("/today");
  const { data: invites } = await supabase.rpc("my_invites");

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Logo size={36} wordmark />
      <div className="eyebrow mt-10">Step 1 of 2</div>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em]">Set up your organization</h1>
      <p className="muted mt-1">
        Each account belongs to one organization. Inside it you can add as many products as you sell — each gets its own Sales
        Foundation, plan and proof library.
      </p>
      <OnboardingForms
        email={user.email ?? ""}
        invites={(invites ?? []) as { id: string; org_name: string; role: string }[]}
      />
      <form action="/auth/signout" method="post" className="mt-8">
        <button className="text-xs text-slate-500 hover:text-slate-800">Sign out</button>
      </form>
    </main>
  );
}
