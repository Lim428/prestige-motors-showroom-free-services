import assert from "node:assert/strict";
import { buildFallbackReply, getAssistantCars } from "../src/lib/assistant";

async function main() {
  process.env.SHOWROOM_PREVIEW = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "https://ci.example.invalid";

  const cars = await getAssistantCars();
  assert.ok(cars.length >= 3, "Preview inventory must contain enough cars for assistant checks.");

  const camryQuestion = "Tell me about the Toyota Camry";
  const camryReply = buildFallbackReply(camryQuestion, cars, "en");
  const audiReply = buildFallbackReply("Is the Audi available?", cars, "en");

  assert.match(camryReply, /Toyota Camry/i, "The named-car answer must reference the Camry.");
  assert.match(audiReply, /Audi RS6/i, "The availability answer must reference the Audi.");
  assert.notEqual(
    camryReply,
    audiReply,
    "Different inventory questions must not collapse to the same response."
  );

  const followUpReply = buildFallbackReply("What is its mileage?", cars, "en", [
    { role: "user", content: camryQuestion },
    { role: "assistant", content: camryReply }
  ]);

  assert.match(
    followUpReply,
    /Toyota Camry/i,
    "A pronoun follow-up must resolve the vehicle from recent history."
  );
  assert.match(followUpReply, /38,250 km/i, "The follow-up must use the stored mileage.");
  assert.doesNotMatch(
    followUpReply,
    /^I can help with current vehicles/i,
    "A contextual follow-up must not fall back to the generic capabilities response."
  );

  const noMatchReply = buildFallbackReply("Show me an SUV under RM 5,000", cars, "en");
  assert.match(
    noMatchReply,
    /couldn(?:'|’)t find an available listing/i,
    "An impossible request must be disclosed as a no-match."
  );
  assert.doesNotMatch(
    noMatchReply,
    /SUV[^\n]*(?:is|marked) available/i,
    "The fallback must not invent matching availability."
  );

  const malayReply = buildFallbackReply("Kereta automatik bawah RM 200000", cars, "ms");
  const chineseReply = buildFallbackReply("有自动挡汽车吗", cars, "zh");

  assert.match(malayReply, /Padanan semasa|pilihan semasa/i, "Malay fallback copy is missing.");
  assert.match(chineseReply, /目前|现货|选择/, "Chinese fallback copy is missing.");

  console.log(
    "Assistant smoke passed: distinct answers, contextual follow-up, grounded no-match, and en/ms/zh fallback coverage."
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Assistant smoke failed.");
  process.exitCode = 1;
});
