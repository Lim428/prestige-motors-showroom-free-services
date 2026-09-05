import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const validator = fileURLToPath(new URL("./validate-production-env.mjs", import.meta.url));
const randomSecret = () => randomBytes(32).toString("hex");

// Synthetic format-only fixtures: no credentials are read and no network calls
// are made. Do not inherit developer or CI provider credentials into these tests.
const base = {
  VERCEL_ENV: "production",
  DATABASE_URL: `postgresql://release:${randomSecret()}@ep-release-pooler.ap-southeast-1.aws.neon.tech/showroom?sslmode=require`,
  DIRECT_URL: `postgresql://release:${randomSecret()}@ep-release.ap-southeast-1.aws.neon.tech/showroom?sslmode=require`,
  NEXTAUTH_URL: "https://showroom.vercel.app",
  NEXT_PUBLIC_SITE_URL: "https://showroom.vercel.app",
  NEXTAUTH_SECRET: randomSecret(),
  ADMIN_EMAIL: "owner@showroom.my",
  ADMIN_PASSWORD: randomSecret(),
  DEALER_NAME: "Prestige Motors",
  DEALER_PHONE: "60127270107",
  DEALER_WHATSAPP: "60127270107",
  DEALER_EMAIL: "team@showroom.my",
  CLOUDINARY_CLOUD_NAME: "showroom-media",
  CLOUDINARY_API_KEY: "746928351068294",
  CLOUDINARY_API_SECRET: randomSecret(),
  GEMINI_API_KEY: `AIza${randomSecret()}`,
  CRON_SECRET: randomSecret()
};

function run(overrides = {}) {
  const result = spawnSync(process.execPath, [validator], {
    env: { SystemRoot: process.env.SystemRoot, ...base, ...overrides },
    encoding: "utf8",
    timeout: 10_000
  });
  assert.ifError(result.error);
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

test("optional address, hours, and email produce warnings without blocking core deployment", () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.match(result.output, /address stays hidden/);
  assert.match(result.output, /opening hours stay hidden/);
  assert.match(result.output, /automated email delivery is unavailable/);
});

test("complete optional settings pass without warnings", () => {
  const result = run({
    DEALER_ADDRESS: "12 Jalan Showroom, Kuala Lumpur",
    DEALER_HOURS: "Monday to Saturday, 10am to 6pm",
    RESEND_API_KEY: `re_${randomSecret()}`,
    ALERT_FROM_EMAIL: "Prestige Motors <alerts@showroom.my>"
  });
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.output, /Warning:/);
});

test("Google authorization keys are accepted alongside legacy standard keys", () => {
  assert.equal(run({ GEMINI_API_KEY: `AQ.Ab_${randomSecret()}-${randomSecret()}` }).status, 0);
  assert.equal(run({ GEMINI_API_KEY: "", GOOGLE_API_KEY: `AQ.Ab_${randomSecret()}` }).status, 0);
});

test("malformed Google credentials remain blocked", () => {
  for (const key of ["AQ.short", "AIza-short", `AQ.${randomSecret()} injected`, `vck_${randomSecret()}`]) {
    assert.equal(run({ GEMINI_API_KEY: key }).status, 1);
  }
});

test("partially configured email fails regardless of which setting is missing", () => {
  for (const overrides of [
    { RESEND_API_KEY: `re_${randomSecret()}` },
    { ALERT_FROM_EMAIL: "Prestige Motors <alerts@showroom.my>" }
  ]) {
    assert.equal(run(overrides).status, 1);
  }
});

test("placeholder optional identity is rejected instead of displayed", () => {
  assert.equal(run({ DEALER_ADDRESS: "your-address-here" }).status, 1);
  assert.equal(run({ DEALER_HOURS: "placeholder" }).status, 1);
});

test("essential configuration and strong authentication remain mandatory", () => {
  for (const name of ["DATABASE_URL", "NEXTAUTH_SECRET", "ADMIN_PASSWORD", "GEMINI_API_KEY", "CLOUDINARY_API_SECRET", "CRON_SECRET"]) {
    assert.equal(run({ [name]: "" }).status, 1, `${name} must be required`);
  }
  assert.equal(run({ NEXTAUTH_SECRET: "short-secret" }).status, 1);
  assert.equal(run({ ADMIN_PASSWORD: "short-password" }).status, 1);
});

test("demo inventory and mismatched authentication origin cannot ship", () => {
  assert.equal(run({ SHOWROOM_PREVIEW: "true" }).status, 1);
  assert.equal(run({ SEED_DEMO_CARS: "true" }).status, 1);
  assert.equal(run({ NEXTAUTH_URL: "https://another-showroom.vercel.app" }).status, 1);
});

test("validation output never includes supplied secrets", () => {
  const password = "TooShort!7";
  const result = run({ ADMIN_PASSWORD: password });
  assert.equal(result.status, 1);
  for (const secret of [password, base.DATABASE_URL, base.NEXTAUTH_SECRET, base.GEMINI_API_KEY]) {
    assert.equal(result.output.includes(secret), false);
  }
});

test("non-production environments skip the gate", () => {
  const result = run({ VERCEL_ENV: "preview", DATABASE_URL: "", NEXTAUTH_SECRET: "" });
  assert.equal(result.status, 0);
  assert.match(result.output, /Skipped/);
});
