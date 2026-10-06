"use client";

import { useActionState } from "react";
import { createProduct } from "@/app/actions/products";
import { IntakeFields } from "@/components/intake-fields";
import { ErrorText, SubmitButton } from "@/components/actions";

export function NewProductForm() {
  const [state, action] = useActionState(createProduct, null);
  return (
    <form action={action}>
      <IntakeFields />
      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-canvas/95 py-4 backdrop-blur">
        <ErrorText error={state && !state.ok ? state.error : null} />
        <SubmitButton className="btn-primary" pendingText="Saving…">
          Save and continue to foundation →
        </SubmitButton>
      </div>
    </form>
  );
}
