import { BRAND_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

interface SendPaymentEmailParams {
  to: string;
  type: "payment_success" | "payment_failed";
  plan?: string | null;
}

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailContent(params: SendPaymentEmailParams): {
  subject: string;
  html: string;
} {
  const safePlan = params.plan ? escapeHtml(params.plan) : "your plan";
  const pricingUrl = `${SITE_URL}/pricing`;
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  if (params.type === "payment_success") {
    return {
      subject: `Payment successful - ${BRAND_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 12px;">Payment successful</h2>
          <p>Thanks for your purchase. Your ${safePlan} access has been activated.</p>
          <p>You can continue at <a href="${pricingUrl}">${SITE_URL.replace("https://", "")}</a>.</p>
          <p>If you need billing help, contact <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            ${BRAND_NAME}
          </p>
        </div>
      `,
    };
  }

  return {
    subject: `Payment issue - ${BRAND_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">Payment failed</h2>
        <p>We could not process your latest payment for ${safePlan}.</p>
        <p>Please update your billing method and retry from the pricing page.</p>
        <p>
          <a href="${pricingUrl}">Open pricing page</a>
        </p>
        <p>If you need help, contact <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>
        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
          ${BRAND_NAME}
        </p>
      </div>
    `,
  };
}

export async function sendPaymentEmail(
  params: SendPaymentEmailParams
): Promise<void> {
  if (!isConfigured()) {
    console.warn(
      "Email skipped: missing RESEND_API_KEY or RESEND_FROM_EMAIL"
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.RESEND_FROM_EMAIL!;
  const { subject, html } = buildEmailContent(params);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      reply_to: SUPPORT_EMAIL,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Email send failed: ${response.status} ${details}`);
  }
}
