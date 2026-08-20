import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const leadSummarySchema = z.object({
  summary: z.string().min(20).max(700),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  budgetMin: z.number().nonnegative().nullable(),
  budgetMax: z.number().nonnegative().nullable(),
  buyerIntent: z.string().min(3).max(160),
  recommendedFollowUp: z.string().min(3).max(240),
});

export type LeadAiSummary = z.infer<typeof leadSummarySchema>;

type LeadSummaryInput = {
  name: string;
  source: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  vehicleNames?: string[];
  transcript?: Array<{ role: "user" | "assistant"; content: string }>;
};

function fallbackSummary(input: LeadSummaryInput): LeadAiSummary {
  const vehicles = input.vehicleNames?.filter(Boolean).join(", ");
  const budget =
    input.budgetMin || input.budgetMax
      ? ` Budget: RM ${input.budgetMin ?? 0} to RM ${input.budgetMax ?? "open"}.`
      : "";
  const interest = vehicles ? ` Interested in ${vehicles}.` : "";

  return {
    summary: `${input.name} submitted a ${input.source.toLowerCase()} lead.${interest}${budget}`,
    priority: input.source === "AI_ASSISTANT" ? "HIGH" : "NORMAL",
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    buyerIntent: vehicles ? `Evaluate ${vehicles}` : "Discuss current vehicle options",
    recommendedFollowUp: "Contact the buyer within one business hour and confirm next steps.",
  };
}

export async function summarizeLead(input: LeadSummaryInput): Promise<LeadAiSummary> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallbackSummary(input);
  }

  const google = createGoogle({ apiKey });
  const transcript = input.transcript
    ?.slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  try {
    const result = await generateText({
      model: google(process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite"),
      output: Output.object({ schema: leadSummarySchema }),
      instructions:
        "You qualify dealership leads. Be concise, factual, and never invent a budget, vehicle, or commitment. URGENT means the buyer explicitly wants immediate contact or a same-day booking; HIGH means clear purchase intent; NORMAL is exploratory; LOW is vague or non-buying.",
      prompt: JSON.stringify({
        customerName: input.name,
        source: input.source,
        suppliedBudgetMin: input.budgetMin ?? null,
        suppliedBudgetMax: input.budgetMax ?? null,
        vehicles: input.vehicleNames ?? [],
        transcript: transcript ?? "No assistant transcript supplied.",
      }),
      abortSignal: AbortSignal.timeout(12_000),
    });

    return result.output;
  } catch (error) {
    console.error(
      "Gemini lead qualification failed:",
      error instanceof Error ? error.message : "Unknown provider error"
    );
    return fallbackSummary(input);
  }
}
