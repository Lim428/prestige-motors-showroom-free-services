import "server-only";

import { dealerEmail, dealerName, siteUrl } from "@/lib/utils";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey: string;
};

export type EmailDeliveryResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: "not_configured" | "provider_error" };

export async function sendTransactionalEmail(
  message: EmailMessage
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ALERT_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const result = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok) {
      console.error("Resend delivery failed:", result?.message ?? response.statusText);
      return { delivered: false, reason: "provider_error" };
    }

    return { delivered: true, id: result?.id ?? null };
  } catch (error) {
    console.error(
      "Resend delivery failed:",
      error instanceof Error ? error.message : "Unknown provider error"
    );
    return { delivered: false, reason: "provider_error" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

export async function sendDealerNotification(input: {
  subject: string;
  title: string;
  idempotencyKey: string;
  details: Array<{ label: string; value: string }>;
  actionPath?: string;
}) {
  const to = dealerEmail();

  if (!to) {
    return { delivered: false as const, reason: "not_configured" as const };
  }

  const actionUrl = input.actionPath
    ? new URL(input.actionPath, `${siteUrl()}/`).toString()
    : null;
  const textDetails = input.details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join("\n");
  const htmlDetails = input.details
    .map(
      (detail) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666">${escapeHtml(detail.label)}</td><td style="padding:6px 0;font-weight:700">${escapeHtml(detail.value)}</td></tr>`,
    )
    .join("");

  return sendTransactionalEmail({
    to,
    subject: input.subject,
    idempotencyKey: input.idempotencyKey,
    text: `${input.title}\n\n${textDetails}${actionUrl ? `\n\nOpen admin: ${actionUrl}` : ""}`,
    html: `<div style="font-family:Arial,sans-serif;color:#171714"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#9a5a31">${escapeHtml(dealerName().toUpperCase())}</p><h2>${escapeHtml(input.title)}</h2><table style="border-collapse:collapse">${htmlDetails}</table>${actionUrl ? `<p style="margin-top:24px"><a href="${escapeHtml(actionUrl)}" style="background:#0f5847;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open sales workspace</a></p>` : ""}</div>`,
  });
}
