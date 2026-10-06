import "server-only";
import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Member, Org, Role } from "./types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Resolves the signed-in user and their (single) org. Redirects if either is missing. */
export const getContext = cache(async () => {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, user_id, role, email, full_name, orgs(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) redirect("/onboarding");
  const { orgs, ...m } = member as unknown as Member & { orgs: Org };
  return {
    supabase,
    user,
    member: m as Member,
    org: orgs,
    role: m.role as Role,
    displayName: m.full_name || user.email?.split("@")[0] || "Seller",
  };
});

export type Ctx = Awaited<ReturnType<typeof getContext>>;

export function canManage(role: Role) {
  return role === "owner" || role === "manager";
}

export async function audit(
  ctx: Ctx,
  kind: string,
  entity?: { type: string; id: string },
  details: Record<string, unknown> = {},
) {
  await ctx.supabase.from("audit_events").insert({
    org_id: ctx.org.id,
    actor_id: ctx.user.id,
    kind,
    entity_type: entity?.type ?? null,
    entity_id: entity?.id ?? null,
    details,
  });
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Runs a server action body, converting thrown errors into a serializable result. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    unstable_rethrow(e);
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Throws on a Supabase error so `run` can report it. Data is non-null whenever a
 * `.select().single()` succeeds; for writes without a select the return value is unused.
 */
export function must<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}
