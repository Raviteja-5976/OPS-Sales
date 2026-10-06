import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/context";
import { Logo } from "@/components/ui";

const JOURNEY = ["Fit", "Problem", "Value", "Decision", "Close"];

const LOOP = [
  { step: "Know", text: "A versioned Sales Foundation: ICP, positioning, offer, proof and objections. Every claim is labelled by source." },
  { step: "Ask", text: "Preparation briefs and a live copilot that surface the one question that fills the biggest unknown." },
  { step: "Capture", text: "A structured evidence record: current state, gap, roadblocks, cost of inaction, stakeholders." },
  { step: "Verify", text: "Buyer-confirmed facts are kept apart from hypotheses, so a polished proposal can't hide thin discovery." },
  { step: "Decide", text: "Stage gates that ask \"is this ready to advance?\" — and accept an override with a reason." },
  { step: "Act", text: "A next best action on every screen, always with its why. Outreach is drafted, checked and human-approved." },
];

const RAIL = [
  { s: "✓", c: "text-emerald-700", label: "Current problem", value: "17 hrs/week lost to manual reporting", note: "● Buyer confirmed", n: "text-emerald-700" },
  { s: "✓", c: "text-emerald-700", label: "Desired outcome", value: "Under 6 hrs/week by Q2", note: "● Buyer confirmed", n: "text-emerald-700" },
  { s: "◐", c: "text-amber-600", label: "Value", value: "$240k / yr estimated impact", note: "◐ Not buyer-confirmed", n: "text-amber-700" },
  { s: "○", c: "text-slate-400", label: "Decision process", value: "Missing", note: "○ Who signs, and how?", n: "text-slate-500" },
];

export default async function Landing() {
  const { user } = await getSession();
  if (user) redirect("/today");
  return (
    <main className="relative overflow-hidden">
      {/* Flowing ribbon: the logo's river as a quiet background gesture */}
      <svg className="pointer-events-none absolute -right-40 -top-24 h-[720px] w-[900px] opacity-[0.16]" viewBox="0 0 900 720" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFCB01" />
            <stop offset="0.38" stopColor="#F5A900" />
            <stop offset="0.68" stopColor="#E87932" />
            <stop offset="1" stopColor="#482311" />
          </linearGradient>
        </defs>
        <path d="M120 40 C 420 60, 260 220, 460 300 S 760 380, 620 520 S 520 700, 860 700" stroke="url(#ribbon)" strokeWidth="90" strokeLinecap="round" />
      </svg>

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between">
          <Logo size={34} wordmark />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="btn btn-dark">
              Get started
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 pb-20 pt-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="eyebrow text-brand-800">The evidence-led sales operating system</div>
            <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-[56px]">
              Know what to do next,
              <br />
              <span className="bg-clip-text text-transparent brand-gradient">and why.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              OpenRiverStack turns your company&apos;s product knowledge into a repeatable sales motion: who to sell to, how to prepare, what to ask live, and what the buyer has
              actually confirmed. Like a very smart sales leader sitting beside you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=signup" className="btn btn-primary px-4 py-2 text-[15px]">
                Build your sales foundation <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn px-4 py-2 text-[15px]">
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-500">The AI drafts, guides and recommends. A person approves every external message and runs every call.</p>
          </div>

          {/* Product illustration built from the real components */}
          <div className="space-y-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1.5">
              {JOURNEY.map((j, i) => (
                <div key={j} className="flex flex-1 items-center">
                  <span
                    className={
                      i === 2
                        ? "w-full rounded-md bg-gold px-2 py-1.5 text-center text-xs font-medium text-on-gold"
                        : i < 2
                          ? "w-full px-2 py-1.5 text-center text-xs font-medium text-slate-900"
                          : "w-full px-2 py-1.5 text-center text-xs font-medium text-slate-400"
                    }
                  >
                    {i < 2 && <span className="mr-1 text-emerald-700">✓</span>}
                    {j}
                  </span>
                  {i < JOURNEY.length - 1 && <span className={`h-px w-3 shrink-0 ${i < 2 ? "bg-gold" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-lg border border-brand-200 bg-surface-warm py-4 pl-5 pr-4">
              <div className="absolute inset-y-0 left-0 w-1 bg-gold" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-800">⚡ Next best action · Acme Corp</div>
              <p className="mt-1.5 text-[17px] font-semibold leading-snug text-slate-900">Ask about the approval path before sending the proposal.</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Why:</span> the economic buyer is identified, but how this gets signed is unknown.
              </p>
              <span className="btn btn-primary btn-sm mt-3">
                Prepare question <ArrowRight size={13} />
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex justify-between border-b border-slate-200 px-4 py-2.5">
                <span className="h-section">Deal evidence</span>
                <span className="num text-xs text-slate-500">3/4 established</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {RAIL.map((r) => (
                  <li key={r.label} className="flex gap-3 px-4 py-2.5">
                    <span className={`w-3 text-center text-sm font-semibold ${r.c}`}>{r.s}</span>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{r.label}</div>
                      <div className={r.value === "Missing" ? "text-sm text-slate-400" : "text-sm text-slate-900"}>{r.value}</div>
                      <div className={`text-xs ${r.n}`}>{r.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 py-16">
          <div className="eyebrow">How OpenRiverStack works</div>
          <h2 className="mt-2 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
            Know → ask → capture → verify → decide → act → learn.
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((l, i) => (
              <div key={l.step} className="border-t border-slate-200 pt-4">
                <div className="flex items-baseline gap-3">
                  <span className="num font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[15px] font-semibold text-slate-900">{l.step}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{l.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 overflow-hidden rounded-xl border border-white/5 bg-sidebar px-8 py-12 text-center">
          <Logo size={44} className="justify-center" />
          <p className="mx-auto mt-5 max-w-2xl text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[#fff8ed]">
            Not a CRM with AI. Not an AI copywriter. An operating system for making better sales decisions.
          </p>
          <Link href="/login?mode=signup" className="btn btn-primary mt-7 px-4 py-2">
            Get started <ArrowRight size={16} />
          </Link>
        </section>

        <footer className="flex items-center justify-between border-t border-slate-200 py-6 text-xs text-slate-500">
          <Logo size={20} wordmark />
          <span>Evidence before claims.</span>
        </footer>
      </div>
    </main>
  );
}
