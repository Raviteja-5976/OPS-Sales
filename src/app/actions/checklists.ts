"use server";

import { revalidatePath } from "next/cache";
import { getContext, run, must, audit, canManage } from "@/lib/context";
import type { ChecklistItem, ChecklistItemState } from "@/lib/types";

/** Upserts the run lazily on first interaction, so pages never write during render. */
export async function setChecklistItem(
  templateId: string,
  entityType: string,
  entityId: string,
  itemId: string,
  patch: ChecklistItemState,
  path?: string,
) {
  return run(async () => {
    const ctx = await getContext();
    const { data: existing } = await ctx.supabase
      .from("checklist_runs")
      .select("id, state")
      .eq("template_id", templateId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    const state = { ...((existing?.state as Record<string, ChecklistItemState>) ?? {}) };
    state[itemId] = { ...(state[itemId] ?? {}), ...patch, at: new Date().toISOString() };
    if (existing) {
      must(await ctx.supabase.from("checklist_runs").update({ state }).eq("id", existing.id));
    } else {
      must(
        await ctx.supabase
          .from("checklist_runs")
          .insert({ org_id: ctx.org.id, template_id: templateId, entity_type: entityType, entity_id: entityId, state }),
      );
    }
    if (patch.overridden) {
      await audit(ctx, "checklist.override", { type: entityType, id: entityId }, { item: itemId, reason: patch.override_reason });
    }
    if (path) revalidatePath(path);
  });
}

export async function saveTemplate(id: string, input: { name: string; description: string; items: ChecklistItem[] }) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can edit playbooks.");
    const items = input.items
      .filter((i) => i.text.trim())
      .map((i, idx) => ({ ...i, id: i.id || `i${Date.now()}${idx}` }));
    must(
      await ctx.supabase
        .from("checklist_templates")
        .update({ name: input.name, description: input.description, items })
        .eq("id", id),
    );
    await audit(ctx, "playbook.edit", { type: "checklist_template", id });
    revalidatePath("/playbooks", "layout");
  });
}

export async function cloneTemplate(id: string) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can clone playbooks.");
    const { data: tpl } = await ctx.supabase.from("checklist_templates").select("*").eq("id", id).single();
    if (!tpl) throw new Error("Template not found.");
    const { data } = await ctx.supabase
      .from("checklist_templates")
      .insert({
        org_id: ctx.org.id,
        key: tpl.key,
        name: `${tpl.name} (custom)`,
        description: tpl.description,
        scope: tpl.scope,
        items: tpl.items,
        built_in: false,
      })
      .select("id")
      .single();
    revalidatePath("/playbooks");
    return data?.id as string;
  });
}

export async function deleteTemplate(id: string) {
  return run(async () => {
    const ctx = await getContext();
    if (!canManage(ctx.role)) throw new Error("Only owners and managers can delete playbooks.");
    must(await ctx.supabase.from("checklist_templates").delete().eq("id", id).eq("built_in", false));
    revalidatePath("/playbooks");
  });
}
