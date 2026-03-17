// Stripe Billing Portal API
// Requirements: 6.1, 6.8

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { config } from "@/lib/config";
import { getStripeClient, findStripeCustomerByEmail } from "@/lib/stripe";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  if (!config.stripe.isEnabled) {
    return NextResponse.json(
      { error: getErrorMessage("paymentUnavailable", locale) },
      { status: 503 }
    );
  }

  try {
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

    const customerEmail =
      typeof token.email === "string" && token.email.trim()
        ? token.email
        : null;

    if (!customerEmail) {
      return NextResponse.json(
        { error: getErrorMessage("billingPortalFailed", locale) },
        { status: 400 }
      );
    }

    const customer = await findStripeCustomerByEmail(customerEmail);
    if (!customer) {
      return NextResponse.json(
        { error: getErrorMessage("billingPortalFailed", locale) },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${config.nextauth.url}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal error:", error);
    return NextResponse.json(
      { error: getErrorMessage("billingPortalFailed", locale) },
      { status: 500 }
    );
  }
}
