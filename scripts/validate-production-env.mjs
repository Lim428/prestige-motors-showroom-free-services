const isVercelProduction =
  process.env.VERCEL_ENV?.trim().toLowerCase() === "production";

if (!isVercelProduction) {
  console.log(
    "[production-env] Skipped: VERCEL_ENV is not production. Local, Preview, and CI builds are unchanged."
  );
  process.exit(0);
}

const issues = [];
const warnings = [];

const placeholderPatterns = [
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /(?:^|[./@:_-])example(?:[./@:_-]|$)/i,
  /\.example\.(?:com|org|net)(?:[/:]|$)/i,
  /\.(?:local|invalid|test)(?:[/:]|$)/i,
  /^(?:default|fake|sample|test)(?:[-_\s]|$)/i,
  /replace[-_\s]?with/i,
  /change[-_\s]?this/i,
  /your[-_\s]?(?:verified[-_\s]?)?(?:domain|email|key|secret|password|value|cloud|name|address|hours)/i,
  /placeholder/i,
  /dummy/i,
  /postgres:postgres/i
];

function configured(name) {
  return process.env[name]?.trim() ?? "";
}

function addIssue(name, message) {
  issues.push({ name, message });
}

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function requireValue(name, description) {
  const value = configured(name);

  if (!value) {
    addIssue(name, `is required for ${description}.`);
    return null;
  }

  if (isPlaceholder(value)) {
    addIssue(name, "must not use a localhost, example, default, or placeholder value.");
    return null;
  }

  return value;
}

function validateSecret(name, minimumLength, description) {
  const value = requireValue(name, description);

  if (!value) {
    return false;
  }

  if (value.length < minimumLength) {
    addIssue(name, `must be at least ${minimumLength} characters.`);
    return false;
  }

  if (new Set(value).size < 8) {
    addIssue(name, "must be a strong, unique value rather than repeated characters.");
    return false;
  }

  return true;
}

function invalidHost(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized.includes("example") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".invalid") ||
    normalized.endsWith(".test")
  );
}

function validateNeonUrl(name, { pooled }) {
  const value = requireValue(name, "the Neon database connection");

  if (!value) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    addIssue(name, "must be a valid PostgreSQL connection URL.");
    return null;
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    addIssue(name, "must use the postgresql:// protocol.");
  }

  if (
    !parsed.hostname ||
    invalidHost(parsed.hostname) ||
    !parsed.hostname.toLowerCase().endsWith(".neon.tech")
  ) {
    addIssue(name, "must point to a Neon host ending in .neon.tech.");
  }

  if (!parsed.username || !parsed.password) {
    addIssue(name, "must include the Neon database user and password.");
  }

  if (!parsed.pathname || parsed.pathname === "/") {
    addIssue(name, "must include the Neon database name.");
  }

  if (parsed.searchParams.get("sslmode") !== "require") {
    addIssue(name, "must include sslmode=require.");
  }

  const usesPooler = parsed.hostname.toLowerCase().includes("-pooler.");

  if (pooled && !usesPooler) {
    addIssue(name, "must use the Neon pooled hostname for application traffic.");
  }

  if (!pooled && usesPooler) {
    addIssue(name, "must use the Neon direct (non-pooler) hostname for migrations.");
  }

  return parsed;
}

function validateHttpsOrigin(name) {
  const value = requireValue(name, "the public production origin");

  if (!value) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    addIssue(name, "must be a valid absolute HTTPS URL.");
    return null;
  }

  if (parsed.protocol !== "https:") {
    addIssue(name, "must use https:// in Production.");
  }

  if (!parsed.hostname || invalidHost(parsed.hostname)) {
    addIssue(name, "must use the real public production hostname.");
  }

  if (parsed.username || parsed.password) {
    addIssue(name, "must not contain embedded credentials.");
  }

  if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    addIssue(name, "must be an origin only, without a path, query, or fragment.");
  }

  return parsed;
}

function extractEmail(value, allowDisplayName) {
  if (!allowDisplayName) {
    return value;
  }

  const displayMatch = value.match(/^\s*[^<>]+\s*<([^<>]+)>\s*$/);
  return displayMatch?.[1]?.trim() ?? value;
}

function validateEmail(name, description, { allowDisplayName = false } = {}) {
  const value = requireValue(name, description);

  if (!value) {
    return false;
  }

  const email = extractEmail(value, allowDisplayName);
  const match = email.match(/^([^\s@]+)@([^\s@]+)$/);

  if (
    !match ||
    !match[2].includes(".") ||
    invalidHost(match[2]) ||
    match[2].toLowerCase() === "resend.dev"
  ) {
    addIssue(name, "must contain a deliverable, non-placeholder email address.");
    return false;
  }

  return true;
}

function validatePhone(name, description) {
  const value = requireValue(name, description);

  if (!value) {
    return false;
  }

  const compact = value.replace(/[\s().-]/g, "");
  const digits = compact.replace(/^\+/, "");

  if (
    !/^\+?[1-9]\d{7,14}$/.test(compact) ||
    /^1?555\d{7}$/.test(digits) ||
    new Set(digits).size < 5
  ) {
    addIssue(name, "must contain 8 to 15 international phone digits.");
    return false;
  }

  return true;
}

function validateProductionOffFlag(name, purpose) {
  const value = configured(name).toLowerCase();

  if (value && value !== "false") {
    addIssue(name, `must be unset or false in customer Production so ${purpose}.`);
  }
}

function validateAiProvider() {
  const providerNames = [
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "AI_GATEWAY_API_KEY",
    "VERCEL_OIDC_TOKEN"
  ];
  const supplied = providerNames.filter((name) => configured(name));
  let hasValidProvider = false;

  for (const name of supplied) {
    const value = configured(name);

    if (isPlaceholder(value)) {
      addIssue(name, "must not use an example, default, or placeholder credential.");
      continue;
    }

    if (name === "GEMINI_API_KEY" || name === "GOOGLE_API_KEY") {
      // AI Studio now issues service-account-bound authorization keys (AQ.),
      // alongside legacy standard keys (AIza). Prefix checks must support both.
      // https://ai.google.dev/gemini-api/docs/api-key
      if (!/^(?:AIza[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9._~-]{20,})$/.test(value)) {
        addIssue(name, "must be a Google AI Studio authorization key (AQ.) or standard key (AIza), without quotes or whitespace.");
        continue;
      }
    } else if (name === "AI_GATEWAY_API_KEY") {
      if (value.length < 24) {
        addIssue(name, "must be a valid Vercel AI Gateway credential of at least 24 characters.");
        continue;
      }
    } else if (
      value.length < 60 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
    ) {
      addIssue(name, "must be the JWT supplied automatically by Vercel OIDC.");
      continue;
    }

    hasValidProvider = true;
  }

  if (supplied.length === 0) {
    addIssue(
      "GEMINI_API_KEY | GOOGLE_API_KEY | AI_GATEWAY_API_KEY | VERCEL_OIDC_TOKEN",
      "requires at least one configured Gemini or Vercel AI Gateway credential. Vercel normally injects VERCEL_OIDC_TOKEN automatically."
    );
  } else if (!hasValidProvider) {
    addIssue(
      "GEMINI_API_KEY | GOOGLE_API_KEY | AI_GATEWAY_API_KEY | VERCEL_OIDC_TOKEN",
      "does not contain a valid AI provider credential."
    );
  }

  const model = configured("GEMINI_MODEL");

  if (model && (isPlaceholder(model) || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/.test(model))) {
    addIssue("GEMINI_MODEL", "must be a valid Gemini or AI Gateway model identifier.");
  }
}

validateNeonUrl("DATABASE_URL", { pooled: true });
validateNeonUrl("DIRECT_URL", { pooled: false });

const nextAuthUrl = validateHttpsOrigin("NEXTAUTH_URL");
const publicSiteUrl = validateHttpsOrigin("NEXT_PUBLIC_SITE_URL");

if (nextAuthUrl && publicSiteUrl && nextAuthUrl.origin !== publicSiteUrl.origin) {
  addIssue(
    "NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL",
    "must use the same production origin so authentication callbacks and public links agree."
  );
}

validateSecret("NEXTAUTH_SECRET", 32, "NextAuth session signing");
validateEmail("ADMIN_EMAIL", "administrator provisioning");
validateSecret("ADMIN_PASSWORD", 16, "administrator provisioning");

const dealerName = requireValue("DEALER_NAME", "the public dealership identity");

if (dealerName && dealerName.length < 2) {
  addIssue("DEALER_NAME", "must contain the public dealership name.");
}

validatePhone("DEALER_PHONE", "the public dealership contact");
validatePhone("DEALER_WHATSAPP", "the public WhatsApp contact");
validateEmail("DEALER_EMAIL", "the public dealership contact");

// These details are hidden by the UI when not supplied. Do not invent a
// location or schedule, or block the core showroom on optional contact copy.
const dealerAddress = configured("DEALER_ADDRESS");

if (dealerAddress && (isPlaceholder(dealerAddress) || dealerAddress.length < 10)) {
  addIssue("DEALER_ADDRESS", "must contain a complete customer-facing showroom address.");
} else if (!dealerAddress) {
  warnings.push("DEALER_ADDRESS is not configured; the showroom address stays hidden.");
}

const dealerHours = configured("DEALER_HOURS");

if (dealerHours && (isPlaceholder(dealerHours) || dealerHours.length < 4)) {
  addIssue("DEALER_HOURS", "must contain customer-facing opening hours.");
} else if (!dealerHours) {
  warnings.push("DEALER_HOURS is not configured; opening hours stay hidden.");
}

validateProductionOffFlag("SHOWROOM_PREVIEW", "preview inventory cannot replace live stock");
validateProductionOffFlag("SEED_DEMO_CARS", "sample vehicles cannot be seeded accidentally");

const cloudName = requireValue("CLOUDINARY_CLOUD_NAME", "durable production image storage");

if (cloudName && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,62}$/.test(cloudName)) {
  addIssue("CLOUDINARY_CLOUD_NAME", "must be a valid Cloudinary cloud name.");
}

const cloudinaryApiKey = requireValue("CLOUDINARY_API_KEY", "Cloudinary uploads");

if (
  cloudinaryApiKey &&
  (!/^\d{10,}$/.test(cloudinaryApiKey) ||
    /(?:0123456789|1234567890)/.test(cloudinaryApiKey) ||
    new Set(cloudinaryApiKey).size < 5)
) {
  addIssue("CLOUDINARY_API_KEY", "must be a numeric Cloudinary API key.");
}

validateSecret("CLOUDINARY_API_SECRET", 16, "Cloudinary uploads");

const uploadFolder = configured("CLOUDINARY_UPLOAD_FOLDER");

if (
  uploadFolder &&
  (isPlaceholder(uploadFolder) ||
    uploadFolder.includes("..") ||
    !/^[A-Za-z0-9][A-Za-z0-9/_-]{0,127}$/.test(uploadFolder))
) {
  addIssue("CLOUDINARY_UPLOAD_FOLDER", "must be a safe Cloudinary folder path.");
}

validateAiProvider();
validateSecret("CRON_SECRET", 32, "the scheduled engagement endpoint");

const hasEmailConfiguration = configured("RESEND_API_KEY") || configured("ALERT_FROM_EMAIL");

if (hasEmailConfiguration) {
  const resendApiKey = requireValue("RESEND_API_KEY", "transactional email delivery");

  if (resendApiKey && !/^re_[A-Za-z0-9_-]{12,}$/.test(resendApiKey)) {
    addIssue("RESEND_API_KEY", "must be a valid Resend API key beginning with re_.");
  }

  validateEmail("ALERT_FROM_EMAIL", "transactional email delivery", {
    allowDisplayName: true
  });
} else {
  warnings.push(
    "Resend is not configured; submissions are saved, but automated email delivery is unavailable. Follow up through the admin workspace."
  );
}

for (const warning of warnings) {
  console.warn(`[production-env] Warning: ${warning}`);
}

if (issues.length > 0) {
  console.error(
    `[production-env] Validation failed with ${issues.length} configuration issue${issues.length === 1 ? "" : "s"}:`
  );

  for (const issue of issues) {
    console.error(`- ${issue.name}: ${issue.message}`);
  }

  console.error(
    "[production-env] Update the Production-scoped variables in Vercel Project Settings, then redeploy. Secret values were not printed."
  );
  process.exitCode = 1;
} else {
  console.log(
    "[production-env] Required configuration checks passed for Neon, authentication, dealer contacts, Cloudinary, AI, and cron. Configured email settings were also checked; provider connectivity is not tested here."
  );
}
