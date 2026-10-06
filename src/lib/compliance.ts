import type { CheckResult, Contact, OrgSettings, ProofItem, SequenceContent } from "./types";

type Input = {
  content: SequenceContent;
  contact: Contact | null;
  suppressions: string[];
  settings: OrgSettings;
  approvedProof: ProofItem[];
  otherActiveSequences: number;
};

const DEFAULT_PROHIBITED = ["guaranteed results", "act now", "last chance", "risk-free", "100% guaranteed"];
const PRESSURE = ["only today", "limited spots", "expires", "final notice", "urgent", "don't miss out"];
const FAKE_FAMILIARITY = ["as we discussed", "following up on our conversation", "great catching up", "per our call", "as promised"];

/** Deterministic pre-send gate. AI review runs separately; this never relies on the model. */
export function runComplianceChecks({ content, contact, suppressions, settings, approvedProof, otherActiveSequences }: Input): CheckResult[] {
  const checks: CheckResult[] = [];
  const allText = [
    ...content.steps.map((s) => `${s.subject ?? ""}\n${s.body}`),
    content.call_opener,
    content.voicemail,
    content.linkedin_note,
  ]
    .join("\n")
    .toLowerCase();
  const emailSteps = content.steps.filter((s) => s.channel === "email");

  // Recipient eligibility
  if (!contact) {
    checks.push({ key: "recipient", label: "Recipient selected", status: "fail", detail: "Choose a contact before approval." });
  } else {
    const email = (contact.email ?? "").toLowerCase();
    const domain = email.split("@")[1] ?? "";
    const suppressed = suppressions.some((s) => {
      const v = s.toLowerCase().trim();
      return v === email || (domain && (v === domain || v === `@${domain}`));
    });
    checks.push(
      contact.opted_out || suppressed
        ? { key: "suppression", label: "Suppression / opt-out", status: "fail", detail: "This contact or domain is suppressed or has opted out. Do not contact." }
        : { key: "suppression", label: "Suppression / opt-out", status: "pass", detail: "Not on the suppression list." },
    );
    checks.push(
      contact.outreach_basis === "unverified"
        ? { key: "basis", label: "Outreach basis", status: "warn", detail: "Outreach basis is unverified. Record consent, legitimate interest, or existing relationship." }
        : { key: "basis", label: "Outreach basis", status: "pass", detail: `Basis: ${contact.outreach_basis.replace("_", " ")}.` },
    );
    checks.push(
      contact.jurisdiction
        ? { key: "jurisdiction", label: "Jurisdiction recorded", status: "pass", detail: contact.jurisdiction }
        : { key: "jurisdiction", label: "Jurisdiction recorded", status: "warn", detail: "Record the recipient's jurisdiction so regional rules can be applied." },
    );
    if (emailSteps.length && !contact.email)
      checks.push({ key: "email", label: "Email address", status: "fail", detail: "Sequence has email steps but the contact has no email." });
  }

  checks.push(
    otherActiveSequences > 0
      ? { key: "duplicate", label: "Duplicate contact protection", status: "warn", detail: `${otherActiveSequences} other approved/active sequence(s) for this contact.` }
      : { key: "duplicate", label: "Duplicate contact protection", status: "pass", detail: "No other active sequence for this contact." },
  );

  // Unsubscribe
  if (settings.require_unsubscribe !== false && emailSteps.length) {
    const missing = emailSteps.filter(
      (s) => !/unsubscribe|opt[ -]?out|won.t (follow up|reach out|contact you|email you)|reply .?no.?|not relevant/i.test(s.body),
    );
    checks.push(
      missing.length
        ? { key: "unsubscribe", label: "Opt-out language", status: "warn", detail: `${missing.length} email step(s) lack an opt-out line. Your sending tool may add one; confirm before sending.` }
        : { key: "unsubscribe", label: "Opt-out language", status: "pass", detail: "Each email offers a clear way to opt out." },
    );
  }

  // Prohibited claims and pressure
  const prohibited = [...new Set([...(settings.prohibited_phrases ?? DEFAULT_PROHIBITED)].map((p) => p.toLowerCase()))];
  const hitProhibited = prohibited.filter((p) => p && allText.includes(p));
  checks.push(
    hitProhibited.length
      ? { key: "prohibited", label: "Prohibited claims", status: "fail", detail: `Contains: ${hitProhibited.join(", ")}` }
      : { key: "prohibited", label: "Prohibited claims", status: "pass", detail: "No prohibited phrases." },
  );
  const hitPressure = PRESSURE.filter((p) => allText.includes(p));
  checks.push(
    hitPressure.length
      ? { key: "pressure", label: "Artificial urgency", status: "warn", detail: `Possible pressure language: ${hitPressure.join(", ")}` }
      : { key: "pressure", label: "Artificial urgency", status: "pass", detail: "No scarcity or pressure tactics detected." },
  );
  const hitFamiliar = FAKE_FAMILIARITY.filter((p) => allText.includes(p));
  checks.push(
    hitFamiliar.length
      ? { key: "familiarity", label: "Deceptive familiarity", status: "fail", detail: `Implies a prior relationship: ${hitFamiliar.join(", ")}` }
      : { key: "familiarity", label: "Deceptive familiarity", status: "pass", detail: "No implied prior relationship." },
  );

  // Numeric claims must trace to approved proof
  const numbers = allText.match(/\b\d+(\.\d+)?\s?(%|x\b|percent)/g) ?? [];
  const proofText = approvedProof.map((p) => `${p.title} ${p.body ?? ""}`.toLowerCase()).join(" ");
  const untraced = numbers.filter((n) => !proofText.includes(n.replace(/\s/g, "").replace("percent", "%")) && !proofText.includes(n));
  checks.push(
    untraced.length
      ? { key: "claims", label: "Claims trace to approved proof", status: "fail", detail: `Unverified figures: ${[...new Set(untraced)].join(", ")}. Remove or add approved proof.` }
      : { key: "claims", label: "Claims trace to approved proof", status: "pass", detail: numbers.length ? "All figures appear in approved proof." : "No numeric claims." },
  );

  // Length and CTA discipline
  const longSteps = emailSteps.filter((s) => s.body.split(/\s+/).length > 140);
  checks.push(
    longSteps.length
      ? { key: "length", label: "Concise", status: "warn", detail: `${longSteps.length} email(s) over 140 words.` }
      : { key: "length", label: "Concise", status: "pass", detail: "Emails are concise." },
  );
  const multiCta = emailSteps.filter((s) => (s.body.match(/\?/g) ?? []).length > 2);
  checks.push(
    multiCta.length
      ? { key: "cta", label: "One low-friction CTA", status: "warn", detail: `${multiCta.length} email(s) ask several questions; keep one clear CTA.` }
      : { key: "cta", label: "One low-friction CTA", status: "pass", detail: "Single CTA per message." },
  );

  // Cadence vs touch limit
  const perWeek = settings.max_touches_per_week ?? 3;
  const byWeek = new Map<number, number>();
  for (const s of content.steps) byWeek.set(Math.floor(s.day / 7), (byWeek.get(Math.floor(s.day / 7)) ?? 0) + 1);
  const over = [...byWeek.values()].some((n) => n > perWeek);
  checks.push(
    over
      ? { key: "cadence", label: "Touch frequency", status: "warn", detail: `More than ${perWeek} touches in a week.` }
      : { key: "cadence", label: "Touch frequency", status: "pass", detail: `Within ${perWeek} touches per week.` },
  );

  if (!content.stop_conditions?.length)
    checks.push({ key: "stop", label: "Stop conditions", status: "warn", detail: "Define when the sequence stops (reply, opt-out, meeting booked)." });

  return checks;
}

export function blockingFailures(checks: CheckResult[]) {
  return checks.filter((c) => c.status === "fail");
}
