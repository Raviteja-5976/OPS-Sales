"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/** Wraps a server action returning ActionResult with pending + error state and a router refresh. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  function exec<T>(fn: () => Promise<Result<T>>, onOk?: (data: T | undefined) => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res) return; // redirected
      if (res.ok) {
        onOk?.(res.data);
        router.refresh();
      } else setError(res.error);
    });
  }
  return { pending, error, setError, exec };
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-3.5 w-3.5 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
}

/** One-click server action with spinner and inline error. */
export function ActionButton<T>({
  action,
  children,
  className,
  pendingText,
  confirmText,
  onDone,
}: {
  action: () => Promise<Result<T>>;
  children: ReactNode;
  className?: string;
  pendingText?: string;
  confirmText?: string;
  onDone?: (data: T | undefined) => void;
}) {
  const { pending, error, exec } = useAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <span className="inline-flex flex-col items-start">
      {confirming ? (
        <span className="inline-flex items-center gap-2 text-sm">
          <span className="text-slate-600">{confirmText}</span>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              setConfirming(false);
              exec(action, onDone);
            }}
          >
            Confirm
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          className={clsx("btn", className)}
          disabled={pending}
          onClick={() => (confirmText ? setConfirming(true) : exec(action, onDone))}
        >
          {pending && <Spinner />}
          {pending && pendingText ? pendingText : children}
        </button>
      )}
      <ErrorText error={error} />
    </span>
  );
}

export function SubmitButton({ children, className, pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={clsx("btn", className)} disabled={pending}>
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
