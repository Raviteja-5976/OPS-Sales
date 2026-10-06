"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Building2,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Layers,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./ui";

type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

// Product terminology reinforces the philosophy (design §17).
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Today", items: [{ href: "/today", label: "Command Center", icon: Gauge }] },
  {
    label: "Revenue",
    items: [
      { href: "/accounts", label: "Accounts", icon: Building2 },
      { href: "/deals", label: "Opportunities", icon: Target },
    ],
  },
  {
    label: "Execution",
    items: [
      { href: "/outreach", label: "Sequences", icon: Send },
      { href: "/calls", label: "Calls", icon: Phone },
      { href: "/playbooks", label: "Playbooks", icon: ListChecks },
    ],
  },
  { label: "Intelligence", items: [{ href: "/insights", label: "Insights", icon: LineChart }] },
];

export function openPalette() {
  window.dispatchEvent(new Event("openriverstack:palette"));
}

export function Sidebar({
  orgName,
  userName,
  role,
  products,
}: {
  orgName: string;
  userName: string;
  role: string;
  products: { id: string; name: string; status: string }[];
}) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("openriverstack:sidebar") === "collapsed");
    } catch {}
  }, []);
  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("openriverstack:sidebar", c ? "expanded" : "collapsed");
      } catch {}
      return !c;
    });
  }

  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const item = (n: NavItem) => {
    const active = isActive(n.href);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        title={collapsed ? n.label : undefined}
        className={clsx(
          "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
          active
            ? "bg-amber-500/10 text-slate-900 font-semibold shadow-2xs"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold" aria-hidden />}
        <Icon size={16} strokeWidth={active ? 2 : 1.75} className={clsx("shrink-0", active ? "text-amber-600" : "text-slate-400")} />
        <span className={clsx(collapsed && "lg:hidden")}>{n.label}</span>
      </Link>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <Logo size={26} wordmark />
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-sm" onClick={openPalette} aria-label="Search">
            <Search size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            <Menu size={16} />
          </button>
        </div>
      </div>
      <aside
        className={clsx(
          "z-30 w-full shrink-0 border-slate-200/90 bg-white text-slate-800 lg:sticky lg:border-r lg:top-0 lg:flex lg:h-screen lg:flex-col lg:transition-[width] lg:duration-200",
          collapsed ? "lg:w-[68px]" : "lg:w-[240px]",
          mobileOpen ? "flex flex-col" : "hidden",
        )}
      >
        <div className={clsx("hidden items-center gap-2.5 px-4 pb-3 pt-4 lg:flex", collapsed && "lg:justify-center lg:px-0")}>
          <Logo size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[14px] font-bold tracking-tight text-slate-900">
                OpenRiver<span className="text-amber-600">Stack</span>
              </div>
              <div className="truncate text-[11px] font-medium text-slate-500">{orgName}</div>
            </div>
          )}
        </div>

        <button
          onClick={openPalette}
          className={clsx(
            "mx-3 mb-2 mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900",
            collapsed && "lg:justify-center lg:px-0",
          )}
          title="Search (⌘K)"
        >
          <Search size={14} className="shrink-0 text-slate-400" />
          <span className={clsx("flex-1 text-left", collapsed && "lg:hidden")}>Search</span>
          <kbd className={clsx("rounded border border-slate-200 bg-white px-1 font-mono text-[10px] text-slate-400 shadow-2xs", collapsed && "lg:hidden")}>⌘K</kbd>
        </button>

        <nav className="flex-1 overflow-y-auto px-3 pb-3" onClick={() => setMobileOpen(false)}>
          {GROUPS.map((g) => (
            <div key={g.label} className="mt-3">
              <div className={clsx("mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400", collapsed && "lg:hidden")}>{g.label}</div>
              {collapsed && <div className="mx-auto mb-1 hidden h-px w-6 bg-slate-200 lg:block" />}
              <div className="space-y-0.5">{g.items.map(item)}</div>
            </div>
          ))}

          <div className="mt-3">
            <div className={clsx("mb-1 flex items-center justify-between px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400", collapsed && "lg:hidden")}>
              Foundation
              <Link href="/products/new" className="text-slate-400 hover:text-amber-600" title="Add product">
                <Plus size={13} />
              </Link>
            </div>
            {collapsed && <div className="mx-auto mb-1 hidden h-px w-6 bg-slate-200 lg:block" />}
            <div className="space-y-0.5">
              {item({ href: "/products", label: "Products", icon: Layers })}
              {!collapsed &&
                products.map((p) => {
                  const active = path.startsWith(`/products/${p.id}`);
                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className={clsx(
                        "ml-[22px] flex items-center justify-between gap-2 rounded-md border-l border-slate-200 py-1 pl-3 pr-2 text-[12.5px] transition-colors",
                        active ? "border-amber-500 font-semibold text-slate-900 bg-amber-500/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={clsx("text-[10px]", p.status === "active" ? "text-amber-600" : "text-slate-300")}
                        title={p.status === "active" ? "Foundation approved" : "Foundation not approved"}
                      >
                        {p.status === "active" ? "●" : "○"}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200/80 px-3 py-3">
          {item({ href: "/billing", label: "Billing", icon: CreditCard })}
          {item({ href: "/settings", label: "Settings", icon: Settings })}
          <div className={clsx("mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-2 border border-slate-200/60", collapsed && "lg:justify-center lg:p-1")}>
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-900 border border-amber-200">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className={clsx("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <div className="truncate text-[12.5px] font-semibold text-slate-900">{userName}</div>
              <div className="text-[11px] capitalize text-slate-500">{role}</div>
            </div>
            <form action="/auth/signout" method="post" className={clsx(collapsed && "lg:hidden")}>
              <button className="rounded p-1 text-slate-400 hover:text-slate-700" title="Sign out">
                <LogOut size={14} />
              </button>
            </form>
          </div>
          <button
            onClick={toggle}
            className="mt-2 hidden w-full items-center justify-center gap-1.5 rounded-md py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={14} /> : <><ChevronsLeft size={14} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}
