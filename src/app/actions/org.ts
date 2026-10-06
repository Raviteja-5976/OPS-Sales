"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext, getSession, run, must, audit, canManage } from "@/lib/context";
import { BUILT_IN_CHECKLISTS } from "@/lib/checklists";
import { assertCanAddMember } from "@/lib/billing";
import type { OrgSettings, Role } from "@/lib/types";

export async function createOrg(_: unknown, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  if (!name) return { ok: false as const, error: "Organization name is required." };

  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  const { data: orgId, error } = await supabase.rpc("create_org", {
    p_name: name,
    p_website: website,
    p_full_name: fullName,
  });
  if (error) return { ok: false as const, error: error.message };

  // Seed the canonical playbooks as editable org templates.
  const { error: seedErr } = await supabase.from("checklist_templates").insert(
    BUILT_IN_CHECKLISTS.map((t) => ({ ...t, org_id: orgId, built_in: true })),
  );
  if (seedErr) console.error("Checklist seed failed", seedErr);

  redirect("/products/new?welcome=1");
}

export async function acceptInvite(inviteId: string, fullName: string) {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("accept_invite", { p_invite: inviteId, p_full_name: fullName || null });
  if (error) return { ok: false as const, error: error.message };
  redirect("/today");
}

export async function updateOrg(input: { name: string; website: string; settings: OrgSettings }) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can change org settings.");
    must(
      await ctx.supabase
        .from("orgs")
        .update({ name: input.name, website: input.website || null, settings: { ...ctx.org.settings, ...input.settings } })
        .eq("id", ctx.org.id),
    );
    await audit(ctx, "org.settings_update", { type: "org", id: ctx.org.id }, { settings: input.settings });
    revalidatePath("/", "layout");
  });
}

export async function inviteMember(email: string, role: Exclude<Role, "owner">) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can invite.");
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error("Enter a valid email.");
    await assertCanAddMember(ctx);
    must(await ctx.supabase.from("org_invites").insert({ org_id: ctx.org.id, email: clean, role, invited_by: ctx.user.id }));
    await audit(ctx, "org.invite", undefined, { email: clean, role });
    revalidatePath("/settings");
  });
}

export async function revokeInvite(id: string) {
  return run(async () => {
    const ctx = await getContext();
    must(await ctx.supabase.from("org_invites").delete().eq("id", id));
    revalidatePath("/settings");
  });
}

export async function updateMemberRole(userId: string, role: Role) {
  return run(async () => {
    const ctx = await getContext();
    if (ctx.role !== "owner") throw new Error("Only the owner can change roles.");
    if (userId === ctx.user.id) throw new Error("You can't change your own role.");
    must(await ctx.supabase.from("org_members").update({ role }).eq("user_id", userId));
    await audit(ctx, "org.role_change", undefined, { user_id: userId, role });
    revalidatePath("/settings");
  });
}

export async function removeMember(userId: string) {
  return run(async () => {
    const ctx = await getContext();
    if (ctx.role !== "owner") throw new Error("Only the owner can remove members.");
    must(await ctx.supabase.from("org_members").delete().eq("user_id", userId));
    await audit(ctx, "org.member_remove", undefined, { user_id: userId });
    revalidatePath("/settings");
  });
}

export async function addSuppression(value: string, reason: string) {
  return run(async () => {
    const ctx = await getContext();
    const v = value.trim().toLowerCase();
    if (!v) throw new Error("Enter an email or domain.");
    must(
      await ctx.supabase
        .from("suppressions")
        .upsert({ org_id: ctx.org.id, value: v, reason: reason || null, created_by: ctx.user.id }, { onConflict: "org_id,value" }),
    );
    await audit(ctx, "compliance.suppress", undefined, { value: v, reason });
    revalidatePath("/settings");
  });
}

export async function removeSuppression(id: string) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can lift a suppression.");
    must(await ctx.supabase.from("suppressions").delete().eq("id", id));
    await audit(ctx, "compliance.unsuppress", undefined, { id });
    revalidatePath("/settings");
  });
}
