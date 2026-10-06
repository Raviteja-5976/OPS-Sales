"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Building2, CornerDownLeft, FileText, Layers, ListChecks, Phone, Plus, Search, Target, User } from "lucide-react";
import { searchAll, type SearchHit } from "@/app/actions/search";

type Command = { id: string; group: string; label: string; hint?: string; href: string; icon: typeof Search };

const COMMANDS: Command[] = [
  { id: "go-today", group: "Go to", label: "Today's actions", hint: "G T", href: "/today", icon: ArrowRight },
  { id: "go-accounts", group: "Go to", label: "Accounts", hint: "G A", href: "/accounts", icon: ArrowRight },
  { id: "go-deals", group: "Go to", label: "Opportunities", hint: "G D", href: "/deals", icon: ArrowRight },
  { id: "go-seq", group: "Go to", label: "Sequences", hint: "G S", href: "/outreach", icon: ArrowRight },
  { id: "go-calls", group: "Go to", label: "Calls", hint: "G C", href: "/calls", icon: ArrowRight },
  { id: "go-playbooks", group: "Go to", label: "Playbooks", hint: "G P", href: "/playbooks", icon: ArrowRight },
  { id: "go-insights", group: "Go to", label: "Insights", hint: "G I", href: "/insights", icon: ArrowRight },
  { id: "go-products", group: "Go to", label: "Products & foundations", href: "/products", icon: ArrowRight },
  { id: "go-settings", group: "Go to", label: "Settings", href: "/settings", icon: ArrowRight },
  { id: "new-account", group: "Create", label: "Create account", href: "/accounts?new=1", icon: Plus },
  { id: "new-deal", group: "Create", label: "Create opportunity", href: "/deals/new", icon: Plus },
  { id: "new-call", group: "Create", label: "Start call preparation", href: "/calls/new", icon: Plus },
  { id: "new-seq", group: "Create", label: "Compose sequence", href: "/outreach/new", icon: Plus },
  { id: "new-product", group: "Create", label: "Add product", href: "/products/new", icon: Plus },
];

const GO_KEYS: Record<string, string> = { t: "/today", a: "/accounts", d: "/deals", s: "/outreach", c: "/calls", p: "/playbooks", i: "/insights" };
const HIT_ICON = { account: Building2, deal: Target, contact: User, call: Phone, product: Layers, playbook: ListChecks } as const;

function typingInField(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const goPending = useRef<number | null>(null);

  // Global shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (typingInField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (goPending.current !== null) {
        const href = GO_KEYS[e.key.toLowerCase()];
        window.clearTimeout(goPending.current);
        goPending.current = null;
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key.toLowerCase() === "g") {
        goPending.current = window.setTimeout(() => (goPending.current = null), 900);
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQ("create ");
        setOpen(true);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("openriverstack:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("openriverstack:palette", onOpen);
    };
  }, [router]);

  useEffect(() => {
    if (open) {
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  // Debounced server search
  useEffect(() => {
    const term = q.replace(/^create\s*/i, "").trim();
    if (term.length < 2 || /^create/i.test(q)) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setHits(await searchAll(term));
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cmds = COMMANDS.filter((c) => !term || `${c.group} ${c.label}`.toLowerCase().includes(term.replace(/^create\s*$/, "create")));
    const results = hits.map((h) => ({ id: `${h.kind}-${h.id}`, group: "Results", label: h.title, hint: h.subtitle, href: h.href, icon: HIT_ICON[h.kind] ?? FileText }));
    return [...results, ...cmds];
  }, [q, hits]);

  useEffect(() => setSel(0), [items.length]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;
  const groups = [...new Set(items.map((i) => i.group))];
  let idx = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#241812]/40 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="floating w-full max-w-xl animate-rise overflow-hidden" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-4">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(items.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter" && items[sel]) {
                e.preventDefault();
                go(items[sel].href);
              }
            }}
            placeholder="Search accounts, opportunities, people, playbooks…"
            className="h-12 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          {loading && <span className="flow-line w-10" />}
          <kbd className="rounded border border-slate-200 px-1.5 font-mono text-[10px] text-slate-500">esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No matches.</p>}
          {groups.map((g) => (
            <div key={g} className="py-1">
              <div className="eyebrow px-4 py-1">{g}</div>
              {items
                .filter((i) => i.group === g)
                .map((i) => {
                  idx += 1;
                  const mine = idx;
                  const Icon = i.icon;
                  return (
                    <button
                      key={i.id}
                      onMouseEnter={() => setSel(mine)}
                      onClick={() => go(i.href)}
                      className={clsx("flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors", sel === mine ? "bg-brand-50 text-slate-900" : "text-slate-700")}
                    >
                      <Icon size={15} strokeWidth={1.75} className={sel === mine ? "text-brand-700" : "text-slate-400"} />
                      <span className="flex-1 truncate">{i.label}</span>
                      {i.hint && <span className="truncate text-xs text-slate-400">{i.hint}</span>}
                      {sel === mine && <CornerDownLeft size={13} className="text-slate-400" />}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="flex gap-4 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>G then A/D/C/S/P/I/T to jump</span>
          <span>N to create</span>
        </div>
      </div>
    </div>
  );
}
