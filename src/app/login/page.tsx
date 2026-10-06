"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ErrorText, Spinner } from "@/components/actions";
import { Logo } from "@/components/ui";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Sign-in link was invalid or expired." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const next = params.get("next") || "/today";

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError(null);
    setNotice(null);
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // On success the browser navigates to Google, so only errors land here.
    if (error) {
      setError(error.message);
      setGoogleBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else {
        router.replace(next);
        router.refresh();
      }
    } else {
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${site}/auth/callback?next=/onboarding` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace("/onboarding");
        router.refresh();
      } else
        setNotice("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="muted mt-1">
        {mode === "signin"
          ? "Sign in to pick up where you left off."
          : "Set up your organization and build your sales foundation."}
      </p>
      <div className="card card-pad mt-6">
        <div className="mb-4 flex rounded-md bg-slate-100 p-1 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${mode === m ? "bg-white text-slate-900 ring-1 ring-slate-200" : "text-slate-500"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="btn w-full justify-center py-2"
          disabled={googleBusy || busy}
        >
          {googleBusy ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or with email
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="label">Work email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary w-full py-2"
            disabled={busy}
          >
            {busy && <Spinner />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <ErrorText error={error} />
        {notice && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        )}
      </div>
    </>
  );
}

const POINTS = [
  {
    title: "Know",
    text: "A versioned Sales Foundation where every claim is labelled by source.",
  },
  {
    title: "Ask",
    text: "Briefs and a live copilot that surface the one question that matters next.",
  },
  {
    title: "Decide",
    text: "Stage gates built on what the buyer has actually confirmed.",
  },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brown-dark text-[#fff8ed] lg:flex lg:flex-col">
      {/* The logo's river as a background gesture */}
      <svg
        className="pointer-events-none absolute -bottom-40 -right-48 h-[760px] w-[760px] opacity-30"
        viewBox="0 0 900 720"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="login-ribbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFCB01" />
            <stop offset="0.38" stopColor="#F5A900" />
            <stop offset="0.68" stopColor="#E87932" />
            <stop offset="1" stopColor="#482311" />
          </linearGradient>
        </defs>
        <path
          d="M120 40 C 420 60, 260 220, 460 300 S 760 380, 620 520 S 520 700, 860 700"
          stroke="url(#login-ribbon)"
          strokeWidth="90"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex flex-1 flex-col justify-between px-12 py-10 xl:px-16">
        <Link href="/" className="inline-flex">
          <Logo size={36} wordmark tone="light" />
        </Link>

        <div className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-gold">
            The evidence-led sales operating system
          </div>
          <h2 className="mt-4 text-[40px] font-semibold leading-[1.08] tracking-[-0.03em]">
            Know what to do next, <span className="text-gold">and why.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="num mt-0.5 font-mono text-xs text-gold/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{p.title}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#fff8ed]/70">
                    {p.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="relative mt-10 overflow-hidden rounded-lg border border-white/10 bg-white/5 py-4 pl-5 pr-4 backdrop-blur-sm">
            <div className="absolute inset-y-0 left-0 w-1 bg-gold" />
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gold">
              ⚡ Next best action · Acme Corp
            </div>
            <p className="mt-1.5 text-[15px] font-semibold leading-snug">
              Ask about the approval path before sending the proposal.
            </p>
            <p className="mt-1 text-sm text-[#fff8ed]/70">
              Why: the economic buyer is identified, but how this gets signed is
              unknown.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#fff8ed]/50">
          The AI drafts and recommends. A person approves every external
          message.
        </p>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />
      <section className="flex flex-col px-6 py-10">
        <Link href="/" className="inline-flex lg:hidden">
          <Logo size={36} wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
