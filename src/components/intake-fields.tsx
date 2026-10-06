import type { Product, ProductIntake } from "@/lib/types";

type FieldDef = { name: keyof ProductIntake | "name" | "one_liner" | "category" | "website"; label: string; placeholder?: string; long?: boolean; required?: boolean };

export const INTAKE_SECTIONS: { title: string; hint: string; fields: FieldDef[] }[] = [
  {
    title: "The basics",
    hint: "What is it, in plain words?",
    fields: [
      { name: "name", label: "Product or service name", required: true, placeholder: "e.g. Inbound Response Desk" },
      { name: "one_liner", label: "One-line description", placeholder: "We help [customer] [achieve outcome] by [mechanism]." },
      { name: "category", label: "Category", placeholder: "e.g. RevOps service, B2B SaaS, IT managed service" },
      { name: "website", label: "Website / product page", placeholder: "https://" },
    ],
  },
  {
    title: "Problem and outcome",
    hint: "Sell the measurable outcome, not the feature list.",
    fields: [
      { name: "problem", label: "What problem does it solve? What happens if the buyer does nothing?", long: true },
      { name: "outcomes", label: "Outcomes you deliver (with numbers where you have them)", long: true },
      { name: "mechanism", label: "How it works — the mechanism that produces the outcome", long: true },
    ],
  },
  {
    title: "Customers",
    hint: "Who is this for — and just as important, who isn't it for?",
    fields: [
      { name: "ideal_customers", label: "Ideal customers (describe your best 2–3 customers)", long: true },
      { name: "industries", label: "Industries" },
      { name: "company_size", label: "Company size", placeholder: "e.g. 50–500 employees, $5–50M revenue" },
      { name: "buyer_roles", label: "Who buys, who uses, who signs?", long: true },
      { name: "exclusions", label: "Who is NOT a fit (disqualifiers)", long: true },
      { name: "geography", label: "Target geography" },
    ],
  },
  {
    title: "Offer and delivery",
    hint: "Guardrails keep AI-drafted messages honest about price and capacity.",
    fields: [
      { name: "pricing", label: "Current pricing and pricing guardrails", long: true },
      { name: "delivery_model", label: "Delivery / onboarding model", long: true },
      { name: "capacity", label: "Capacity and constraints", placeholder: "e.g. max 4 new clients per month" },
      { name: "sales_cycle", label: "Typical sales cycle", placeholder: "e.g. 3–8 weeks, 2 calls + proposal" },
    ],
  },
  {
    title: "Differentiation and objections",
    hint: "The real competitor is often the status quo.",
    fields: [
      { name: "differentiators", label: "Why customers choose you over alternatives", long: true },
      { name: "competitors", label: "Competitors and alternatives (incl. doing it in-house)", long: true },
      { name: "objections", label: "Objections you hear most often", long: true },
    ],
  },
  {
    title: "Proof and collateral",
    hint: "Only proof you approve can be cited in outreach. Paste what you have.",
    fields: [
      { name: "proof", label: "Case studies, results, testimonials, references", long: true },
      { name: "collateral", label: "Other context: call notes, proposals, decks (paste text)", long: true },
    ],
  },
];

export function IntakeFields({ product }: { product?: Product }) {
  const value = (name: string) => {
    if (!product) return "";
    if (name in product && ["name", "one_liner", "category", "website"].includes(name)) {
      return (product as unknown as Record<string, string | null>)[name] ?? "";
    }
    return ((product.intake as Record<string, unknown>)[name] as string) ?? "";
  };
  return (
    <div className="space-y-6">
      {INTAKE_SECTIONS.map((s, idx) => (
        <section key={s.title} className="card card-pad">
          <div className="mb-4">
            <div className="num font-mono text-[11px] text-slate-400">{String(idx + 1).padStart(2, "0")}</div>
            <h2 className="h-section">{s.title}</h2>
            <p className="muted">{s.hint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => (
              <label key={f.name} className={f.long ? "block sm:col-span-2" : "block"}>
                <span className="label">
                  {f.label}
                  {f.required && " *"}
                </span>
                {f.long ? (
                  <textarea className="input min-h-[84px]" name={f.name} defaultValue={value(f.name)} placeholder={f.placeholder} />
                ) : (
                  <input className="input" name={f.name} defaultValue={value(f.name)} placeholder={f.placeholder} required={f.required} />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
