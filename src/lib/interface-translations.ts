import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AppLocale } from "@/i18n/config";

const defaultGeminiModel = "gemini-3.5-flash-lite";
let directGeminiUnavailable = false;

const languageNames: Record<Exclude<AppLocale, "en">, string> = {
  ms: "natural Malaysian Bahasa Melayu",
  zh: "natural Simplified Chinese used in Malaysia"
};

export async function translateInterfaceTexts(
  texts: string[],
  locale: Exclude<AppLocale, "en">
) {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  const configuredModel = process.env.GEMINI_MODEL?.trim() || defaultGeminiModel;
  const directModel = configuredModel.replace(/^google\//, "");
  const gatewayModel = configuredModel.includes("/")
    ? configuredModel
    : `google/${configuredModel}`;
  const request = {
    output: Output.object({
      schema: z.object({
        translations: z.array(z.string()).length(texts.length)
      })
    }),
    system: [
      `Translate interface copy for a professional Malaysian used-car dealership into ${languageNames[locale]}.`,
      "Return exactly one translation for every input string, in the same order.",
      "Keep Prestige Motors, vehicle brands, model names, stock codes, URLs, email addresses, phone numbers, RM amounts, and technical abbreviations unchanged.",
      "Preserve every {value} placeholder exactly and preserve punctuation where it carries meaning.",
      "Use concise, natural language suitable for buttons, form labels, accessibility labels, validation messages, and dealership copy."
    ].join(" "),
    prompt: JSON.stringify(texts),
    abortSignal: AbortSignal.timeout(18_000)
  };

  if (apiKey && !directGeminiUnavailable) {
    try {
      const google = createGoogle({ apiKey });
      const { output } = await generateText({ ...request, model: google(directModel) });
      return output.translations;
    } catch {
      directGeminiUnavailable = true;
      console.warn("Direct Gemini translation is unavailable; using Vercel AI Gateway instead.");
    }
  }

  const { output } = await generateText({
    ...request,
    model: gatewayModel,
    providerOptions: {
      gateway: {
        tags: ["feature:interface-translation"]
      }
    }
  });

  return output.translations;
}
