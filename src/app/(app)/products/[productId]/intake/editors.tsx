"use client";

import { useActionState, useState } from "react";
import type { Product, ProductIntake } from "@/lib/types";
import { runInterview, saveInterviewAnswers, updateProduct } from "@/app/actions/products";
import { IntakeFields } from "@/components/intake-fields";
import { ActionButton, ErrorText, SubmitButton, useAction } from "@/components/actions";
import { Card } from "@/components/ui";

export function InterviewEditor({ productId, interview }: { productId: string; interview: NonNullable<ProductIntake["interview"]> }) {
  const [answers, setAnswers] = useState(interview);
  const { pending, error, exec } = useAction();
  const dirty = JSON.stringify(answers) !== JSON.stringify(interview);

  return (
    <div id="interview">
      <Card
        title="AI interview"
        actions={
          <ActionButton action={() => runInterview(productId)} pendingText="Reviewing…">
            {interview.length ? "Ask more questions" : "Start interview"}
          </ActionButton>
        }
      >
        {answers.length === 0 ? (
          <p className="muted">The foundation strategist reviews your intake and asks about gaps — missing outcomes, vague ICP, unproven claims.</p>
        ) : (
          <div className="space-y-4">
            {answers.map((q, i) => (
              <div key={i}>
                <div className="text-sm font-medium text-slate-800">{q.question}</div>
                {q.why && <div className="text-xs text-slate-500">Why it matters: {q.why}</div>}
                <textarea
                  className="input mt-1.5 min-h-[64px]"
                  value={q.answer}
                  placeholder="Your answer (leave blank if unknown — the AI will mark it as a gap)"
                  onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? { ...a, answer: e.target.value } : a)))}
                />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary" disabled={!dirty || pending} onClick={() => exec(() => saveInterviewAnswers(productId, answers))}>
                Save answers
              </button>
              <span className="text-xs text-slate-500">Then regenerate the foundation to use them.</span>
            </div>
            <ErrorText error={error} />
          </div>
        )}
      </Card>
    </div>
  );
}

export function IntakeEditor({ product }: { product: Product }) {
  const [state, action] = useActionState(updateProduct, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={product.id} />
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Company & offer intake</h2>
      <IntakeFields product={product} />
      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-canvas/95 py-4 backdrop-blur">
        {state?.ok && <span className="text-sm text-emerald-600">Saved.</span>}
        <ErrorText error={state && !state.ok ? state.error : null} />
        <SubmitButton className="btn-primary" pendingText="Saving…">
          Save intake
        </SubmitButton>
      </div>
    </form>
  );
}
