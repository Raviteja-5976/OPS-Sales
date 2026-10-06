import "server-only";
import OpenAI from "openai";
import type { z } from "zod";

let _client: OpenAI | null = null;

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export const GUARDRAILS = `You are an AI assistant inside OpenRiverStack, an evidence-led sales workbench for B2B founders and sales teams.

Non-negotiable rules:
1. Evidence before claims. Never invent customer results, statistics, case studies, integrations, pricing, quotes, names, or research. Use only facts present in the provided context. If something is unknown, say so or turn it into a question.
2. Label provenance. Wherever the output has a "source" field, use exactly one of:
   - "company-provided": stated in the company/product/proof input
   - "public-research": from a user-supplied public signal that has a source
   - "ai-hypothesis": your own inference — anything not directly stated
   - "buyer-confirmed": stated by the buyer in call notes or transcripts
   When unsure, use "ai-hypothesis".
3. Respect the buyer. No deceptive familiarity (never imply a prior relationship or conversation that did not happen), no artificial scarcity, no pressure tactics, no manipulation. Communication is honest, permission-based and peer-to-peer.
4. The seller stays in control. You draft, guide, summarize and recommend. You never send messages, make commitments on the seller's behalf, or silently change records.
5. Diagnose before prescribing. Favor questions that surface the buyer's current state, desired state, gap, roadblocks, decision process and cost of inaction over pitching features.
6. Be concrete and concise. No buzzwords, no flattery, no filler.

Respond with ONE JSON object matching the requested shape. No markdown fences, no commentary.`;

export type AIResult<T> = { data: T; model: string; tokens: number };

export async function generateJSON<T>(opts: {
  role: string;
  instructions: string;
  shape: string;
  context: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<AIResult<T>> {
  const res = await client().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    max_completion_tokens: opts.maxTokens ?? 2500,
    messages: [
      {
        role: "system",
        content: `${GUARDRAILS}\n\nYour role: ${opts.role}\n\n${opts.instructions}\n\nReturn JSON with this shape:\n${opts.shape}`,
      },
      { role: "user", content: opts.context },
    ],
  });

  const choice = res.choices[0];
  const text = choice?.message?.content ?? "";
  if (!text) {
    throw new Error(choice?.message?.refusal || "The AI returned an empty response. Please try again.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (choice?.finish_reason === "length") {
      throw new Error("The AI response was cut off. Try again with less input text.");
    }
    throw new Error("The AI returned malformed JSON. Please try again.");
  }
  const data = opts.schema.parse(parsed);
  return { data, model: res.model, tokens: res.usage?.total_tokens ?? 0 };
}
