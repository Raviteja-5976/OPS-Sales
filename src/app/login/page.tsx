"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ErrorText, Spinner } from "@/components/actions";
import { Logo } from "@/components/ui";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "Sign-in link was invalid or expired." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const next = params.get("next") || "/today";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      } else setNotice("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
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
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="label">Work email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
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
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>
        <button type="submit" className="btn btn-primary w-full py-2" disabled={busy}>
          {busy && <Spinner />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <ErrorText error={error} />
      {notice && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <Link href="/" className="inline-flex">
        <Logo size={36} wordmark />
      </Link>
      <h1 className="mt-10 text-[26px] font-semibold tracking-[-0.02em]">Welcome back</h1>
      <p className="muted mt-1">Sign in or create an account to set up your organization.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
