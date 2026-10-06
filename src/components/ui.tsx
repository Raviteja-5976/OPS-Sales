import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SourceLabel } from "@/lib/types";
import { READINESS_LABEL, type HealthComponent, type RailItem, type Readiness } from "@/lib/readiness";

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export function Logo({ size = 28, wordmark = false, className, tone = "ink" }: { size?: number; wordmark?: boolean; className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <Image src="/logo.png" alt="OpenRiverStack" width={size} height={size} priority className="shrink-0" style={{ width: size, height: "auto" }} />
      {wordmark && (
        <span className={clsx("text-[15px] font-semibold tracking-tight", tone === "light" ? "text-[#fff8ed]" : "text-slate-900")}>
          OpenRiver<span className={tone === "light" ? "text-gold" : "text-brand-700"}>Stack</span>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 lg:mb-8">
      {back && (
        <Link href={back.href} className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      {eyebrow && <div className="eyebrow mb-1.5 text-brand-800">{eyebrow}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{title}</h1>
          {subtitle && <div className="mt-1.5 max-w-4xl text-[13.5px] sm:text-sm leading-relaxed text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/** A clean, elevated surface card with segregated header. */
export function Card({ title, actions, children, className, pad = true, id }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section id={id} className={clsx("card overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="h-section">{title}</div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={clsx(pad && "card-pad")}>{children}</div>
    </section>
  );
}

/** Editorial section with clear header and spacing. */
export function Section({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("card overflow-hidden p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold text-slate-900 tracking-[-0.01em]">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  slate: "bg-slate-100/80 text-slate-700 ring-slate-200/80",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/70",
  red: "bg-red-50 text-red-700 ring-red-200/70",
  blue: "bg-brand-50 text-brand-900 ring-brand-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70",
} as const;
export type Tone = keyof typeof TONES;

export const ACCOUNT_STATUS_TONE: Record<string, Tone> = {
  target: "slate",
  engaged: "blue",
  customer: "green",
  nurture: "violet",
  disqualified: "red",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset tracking-wide", TONES[tone], className)}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Provenance (design §5): subtle symbol + label, never louder than the fact.
// ---------------------------------------------------------------------------

const PROVENANCE: Record<SourceLabel, { symbol: string; label: string; cls: string }> = {
  "buyer-confirmed": { symbol: "●", label: "Buyer confirmed", cls: "text-emerald-700" },
  "company-provided": { symbol: "●", label: "Company provided", cls: "text-brand-900 dark:text-brand-800" },
  "public-research": { symbol: "◐", label: "Public research", cls: "text-violet-700" },
  "ai-hypothesis": { symbol: "○", label: "AI hypothesis", cls: "text-amber-700" },
};

export function SourceBadge({ source }: { source: SourceLabel | string }) {
  const p = PROVENANCE[(source in PROVENANCE ? source : "ai-hypothesis") as SourceLabel];
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium", p.cls)}>
      <span aria-hidden>{p.symbol}</span>
      {p.label}
    </span>
  );
}

const READINESS_STYLE: Record<Readiness, { symbol: string; cls: string }> = {
  ready: { symbol: "●", cls: "text-emerald-700" },
  caution: { symbol: "◐", cls: "text-amber-700" },
  missing: { symbol: "○", cls: "text-red-600" },
};

export function ReadinessBadge({ status }: { status: Readiness }) {
  const s = READINESS_STYLE[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium", s.cls)}>
      <span aria-hidden>{s.symbol}</span>
      {READINESS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Signature components
// ---------------------------------------------------------------------------

/** WHAT → WHY → ACTION (design §8). Gold marks "OpenRiverStack has something useful for you here". */
export function NextBestAction({
  context,
  what,
  why,
  action,
  secondary,
  className,
}: {
  context?: ReactNode;
  what: ReactNode;
  why: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("relative animate-rise overflow-hidden rounded-xl border border-amber-300/80 bg-gradient-to-r from-[#fff9ea] via-[#fffdf5] to-white shadow-[0_2px_10px_-2px_rgba(245,169,0,0.15)] transition-all", className)}>
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-gold to-orange-brand" aria-hidden />
      <div className="py-4.5 pl-6 pr-5 sm:py-5 sm:pr-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-900">
            ⚡ Next best action
          </span>
          {context && <span className="truncate text-xs font-medium text-slate-500">· {context}</span>}
        </div>
        <p className="mt-2 text-[18px] sm:text-[19px] font-bold leading-snug tracking-[-0.01em] text-slate-900">{what}</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 max-w-3xl">
          <span className="font-semibold text-slate-700">Why: </span>
          {why}
        </p>
        {(action || secondary) && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {action}
            {secondary}
          </div>
        )}
      </div>
    </section>
  );
}

const RAIL_STYLE = {
  confirmed: { symbol: "✓", cls: "text-emerald-700", value: "text-slate-900" },
  partial: { symbol: "◐", cls: "text-amber-600", value: "text-slate-900" },
  missing: { symbol: "○", cls: "text-slate-400", value: "text-slate-400" },
} as const;

/** Evidence Rail (design §6): what we know, how we know it, what's missing. */
export function EvidenceRail({ items, title = "Deal evidence", footer }: { items: RailItem[]; title?: string; footer?: ReactNode }) {
  const known = items.filter((i) => i.state !== "missing").length;
  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h2 className="h-section">{title}</h2>
        <span className="num text-xs text-slate-500">
          {known}/{items.length} established
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => {
          const s = RAIL_STYLE[i.state];
          return (
            <li key={i.key} className="flex gap-3 px-4 py-2.5">
              <span className={clsx("mt-px w-3 shrink-0 text-center text-sm font-semibold", s.cls)} aria-label={i.state}>
                {s.symbol}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{i.label}</div>
                <div className={clsx("truncate text-sm", s.value)} title={i.value}>
                  {i.value}
                </div>
                {i.note && <div className={clsx("text-xs", i.state === "partial" ? "text-amber-700" : "text-slate-500")}>{i.note}</div>}
              </div>
            </li>
          );
        })}
      </ul>
      {footer && <div className="border-t border-slate-200 px-4 py-3">{footer}</div>}
    </section>
  );
}

/** Component confidence bars (design §24). Every score is explainable on hover/expand. */
export function HealthBars({ components }: { components: HealthComponent[] }) {
  return (
    <ul className="space-y-2.5">
      {components.map((c) => (
        <li key={c.key}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-slate-600">{c.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={clsx("block h-full rounded-full transition-[width] duration-300", c.score >= 70 ? "bg-gold" : c.score >= 40 ? "bg-amber-500" : "bg-red-500")}
                  style={{ width: `${Math.max(c.score, 2)}%` }}
                />
              </span>
              <span className="num w-9 shrink-0 text-right text-xs font-medium text-slate-700">{c.score}%</span>
            </summary>
            <div className="mt-1.5 grid gap-1 pl-[8.75rem] text-xs">
              {c.have.map((h) => (
                <div key={h} className="text-emerald-700">✓ {h}</div>
              ))}
              {c.missing.map((m) => (
                <div key={m} className="text-slate-500">○ {m}</div>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Supporting pieces
// ---------------------------------------------------------------------------

/** Empty states teach the product: what's missing, why it matters, what to do (design §31). */
export function Empty({ title, children, action, why }: { title: string; children?: ReactNode; action?: ReactNode; why?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow text-slate-700">{title}</p>
        {children && <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>}
        {why && <div className="mt-2 text-xs text-slate-500">{why}</div>}
        {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** A deliberate metric tile with its label and state. */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "amber" | "green" }) {
  return (
    <div className="card card-pad flex flex-col justify-between transition-all hover:border-slate-300">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
        <div
          className={clsx(
            "num mt-2 text-2xl sm:text-[28px] font-bold leading-none tracking-tight",
            tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-700" : "text-slate-900",
          )}
        >
          {value}
        </div>
      </div>
      {hint && <div className="mt-2 text-xs font-medium text-slate-400">{hint}</div>}
    </div>
  );
}

/** A grid of metric tiles, replacing flat text strips with modern KPI cards. */
export function Signals({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4", className)}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "green" | "amber" | "red" }) {
  const color = { brand: "bg-gold", green: "bg-emerald-600", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={clsx("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function List({ items, empty = "—" }: { items: ReactNode[]; empty?: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.map((x, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
          <span className="min-w-0 flex-1 leading-snug">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="mb-6 flex gap-1.5 overflow-x-auto border-b border-slate-200/90 pb-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={clsx(
              "whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-150",
              isActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function fmtMoney(n: number | null | undefined, currency = "USD") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
