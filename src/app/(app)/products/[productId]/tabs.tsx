"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

export function ProductTabs({ productId }: { productId: string }) {
  const path = usePathname();
  const base = `/products/${productId}`;
  const tabs = [
    { key: "foundation", label: "Sales Foundation", href: base },
    { key: "intake", label: "Intake & interview", href: `${base}/intake` },
    { key: "proof", label: "Proof library", href: `${base}/proof` },
    { key: "plan", label: "Sales Plan Studio", href: `${base}/plan` },
    { key: "checklist", label: "Checklists", href: `${base}/checklist` },
  ];
  const active = tabs.slice(1).find((t) => path.startsWith(t.href))?.key ?? "foundation";
  return <Tabs tabs={tabs} active={active} />;
}
