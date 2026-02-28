// Stripe Checkout API
// Requirements: 6.1, 6.2, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";
import { config } from "@/lib/config";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

const VALID_PLANS = ["pay_as_you_go", "professional"] as const;
type Plan = (typeof VALID_PLANS)[number];

function isValidPlan(plan: string): plan is Plan {
  return VALID_PLANS.includes(plan as Plan);
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  // Check if Stripe is enabled
  if (!config.stripe.isEnabled) {
    return NextResponse.json(
      { error: getErrorMessage("paymentUnavailable", locale) },
      { status: 503 }
    );
  }

  try {
    // Auth check (middleware handles this, but double-check)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan } = body as { plan?: string };

    if (!plan || !isValidPlan(plan)) {
      return NextResponse.json(
        { error: getErrorMessage("checkoutFailed", locale) },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const priceId =
      plan === "pay_as_you_go"
        ? config.stripe.priceIds.payAsYouGo
        : config.stripe.priceIds.professional;

    const mode = plan === "professional" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.nextauth.url}/pricing?success=true`,
      cancel_url: `${config.nextauth.url}/pricing?cancelled=true`,
      metadata: {
        userId: token.userId as string,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: getErrorMessage("checkoutFailed", locale) },
      { status: 500 }
    );
  }
}
