"use client";

import { SOURCE_LABELS } from "@/lib/types";
import { SourceBadge } from "./ui";

// Generic renderer/editor for structured AI documents (foundation, plans, briefs).
// Objects shaped {text, source} are treated as labelled claims.

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const humanize = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const isClaim = (v: unknown): v is { text: string; source: string } =>
  !!v && typeof v === "object" && !Array.isArray(v) && "text" in v && "source" in v && Object.keys(v).length === 2;

export function DocView({ value, depth = 0 }: { value: Json; depth?: number }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400 font-normal">—</span>;
  if (typeof value !== "object") return <span className="whitespace-pre-wrap leading-relaxed">{String(value)}</span>;
  
  if (isClaim(value)) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 leading-relaxed">
        <span className="whitespace-pre-wrap text-slate-800">{value.text || "—"}</span>
        <SourceBadge source={value.source} />
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-400 text-xs italic">None recorded</span>;
    const simple = value.every((x) => typeof x !== "object" || isClaim(x));
    
    if (simple) {
      return (
        <ul className="space-y-2 text-sm">
          {value.map((x, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <div className="min-w-0 flex-1 leading-relaxed">
                <DocView value={x} depth={depth + 1} />
              </div>
            </li>
          ))}
        </ul>
      );
    }

    // Array of objects (e.g. alternatives, buyer committee, account tiers, differentiators)
    return (
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-2">
        {value.map((item, i) => {
          if (typeof item !== "object" || item === null) {
            return (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <DocView value={item} depth={depth + 1} />
              </div>
            );
          }

          // Check if item looks like an Alternative, Buyer persona, Account tier, etc.
          const obj = item as Record<string, Json>;
          const title = obj.name || obj.role || (obj.tier ? `Tier ${obj.tier}` : null) || obj.title || obj.statement || `Item ${i + 1}`;
          const badge = obj.type || (obj.tier ? `Tier ${obj.tier}` : null);
          const howWeDiffer = obj.how_we_differ;
          const pains = obj.pains;
          const caresAbout = obj.cares_about;
          const definition = obj.definition;
          const researchDepth = obj.research_depth;

          // If it matches common sales schema patterns, render custom styled card
          if (howWeDiffer || pains || caresAbout || (definition && researchDepth)) {
            return (
              <div key={i} className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <span className="text-[14px] font-bold text-slate-900 tracking-tight">{String(title)}</span>
                    {badge && (
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        {String(badge)}
                      </span>
                    )}
                  </div>

                  {definition && (
                    <div className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      {String(definition)}
                    </div>
                  )}

                  {researchDepth && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 rounded-md p-2 border border-slate-100">
                      <span className="font-semibold text-slate-700">Research depth: </span>{String(researchDepth)}
                    </div>
                  )}

                  {pains && (
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">Key Pains</div>
                      <div className="text-xs text-slate-700 pl-0.5">
                        <DocView value={pains} depth={depth + 1} />
                      </div>
                    </div>
                  )}

                  {caresAbout && (
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">Cares About</div>
                      <div className="text-xs text-slate-700 pl-0.5">
                        <DocView value={caresAbout} depth={depth + 1} />
                      </div>
                    </div>
                  )}
                </div>

                {howWeDiffer && (
                  <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5 text-xs text-amber-950">
                    <div className="font-bold text-amber-900 text-[10px] uppercase tracking-wider mb-0.5">✦ How we differ</div>
                    <DocView value={howWeDiffer} depth={depth + 1} />
                  </div>
                )}
              </div>
            );
          }

          // Fallback generic card for object in array
          return (
            <div key={i} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              {title && title !== `Item ${i + 1}` && (
                <div className="text-[13.5px] font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-2.5">
                  {String(title)}
                </div>
              )}
              <dl className="space-y-2 text-xs">
                {Object.entries(obj).map(([k, v]) => {
                  if (k === "name" || k === "title") return null;
                  return (
                    <div key={k} className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                      <dt className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">{humanize(k)}</dt>
                      <dd className="text-slate-800"><DocView value={v} depth={depth + 1} /></dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          );
        })}
      </div>
    );
  }

  const entries = Object.entries(value);

  // Top level sections (depth === 0)
  if (depth === 0) {
    return (
      <div className="space-y-5">
        {entries.map(([k, v]) => {
          const isEditorial = ["one_liner", "narrative", "positioning_statement", "summary", "overview"].includes(k.toLowerCase());

          if (isEditorial && (typeof v === "string" || isClaim(v))) {
            return (
              <div key={k} className="rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50/60 via-[#fffcf4] to-white p-4.5 shadow-[0_1px_3px_rgba(245,169,0,0.08)]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                  <span>✦</span> {humanize(k)}
                </div>
                <div className="text-[14.5px] font-medium leading-relaxed text-slate-900">
                  <DocView value={v} depth={depth + 1} />
                </div>
              </div>
            );
          }

          return (
            <div key={k} className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-700">
                  {humanize(k)}
                </h4>
              </div>
              <div className="text-sm text-slate-800">
                <DocView value={v} depth={depth + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Nested definition list (depth > 0)
  return (
    <dl className="space-y-3">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-slate-50/60 p-2.5 border border-slate-100">
          <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {humanize(k)}
          </dt>
          <dd className="text-sm text-slate-800">
            <DocView value={v} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function blankLike(sample: Json | undefined): Json {
  if (sample === undefined || sample === null) return "";
  if (typeof sample === "string") return "";
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  if (Array.isArray(sample)) return [];
  if (isClaim(sample)) return { text: "", source: "company-provided" };
  return Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blankLike(v)]));
}

export function DocEditor({ value, onChange, depth = 0 }: { value: Json; onChange: (v: Json) => void; depth?: number }) {
  if (value === null || typeof value === "string") {
    const long = (value ?? "").length > 60;
    return long ? (
      <textarea className="input min-h-[64px]" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (typeof value === "number")
    return <input className="input w-32" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />;
  if (typeof value === "boolean")
    return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />;
  if (isClaim(value))
    return (
      <div className="flex flex-col gap-1.5 sm:flex-row">
        <textarea
          className="input min-h-[40px] flex-1"
          rows={Math.min(4, Math.ceil((value.text?.length ?? 0) / 80) || 1)}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
        <select className="input sm:w-44" value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value })}>
          {SOURCE_LABELS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    );
  if (Array.isArray(value))
    return (
      <div className="space-y-2">
        {value.map((x, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={typeof x === "object" && x !== null && !isClaim(x) ? "flex-1 rounded-md border border-slate-200 p-3" : "flex-1"}>
              <DocEditor value={x} depth={depth + 1} onChange={(nv) => onChange(value.map((y, j) => (j === i ? nv : y)))} />
            </div>
            <button type="button" className="btn btn-ghost btn-sm text-slate-400" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, blankLike(value[0] ?? "")])}>
          + Add
        </button>
      </div>
    );
  return (
    <div className="space-y-3">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <div className={depth === 0 ? "mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500" : "label"}>{humanize(k)}</div>
          <DocEditor value={v} depth={depth + 1} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        </div>
      ))}
    </div>
  );
}

export type { Json };
