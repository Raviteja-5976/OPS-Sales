import { notFound } from "next/navigation";
import { getContext, canManage } from "@/lib/context";
import type { ChecklistTemplate } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { TemplateEditor } from "./editor";

export default async function TemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("checklist_templates").select("*").eq("id", templateId).maybeSingle();
  if (!data) notFound();
  const t = data as ChecklistTemplate;
  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: "/playbooks", label: "Playbooks" }} title={t.name} subtitle={t.built_in ? "Built-in checklist. Clone it to customize." : "Custom checklist — replaces the built-in version everywhere it's used."} />
      <TemplateEditor template={t} editable={!t.built_in && canManage(ctx.role)} />
    </div>
  );
}
