"use client";

import { useRouter } from "next/navigation";
import { cloneTemplate } from "@/app/actions/checklists";
import { ActionButton } from "@/components/actions";

export function CloneButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ActionButton className="btn-sm" action={() => cloneTemplate(id)} onDone={(newId) => newId && router.push(`/playbooks/${newId}`)}>
      Clone & customize
    </ActionButton>
  );
}
