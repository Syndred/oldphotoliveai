// Stripe Subscription Status API
// Requirements: 6.1, 6.8

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { config } from "@/lib/config";
import {
  findProfessionalSubscriptionByCustomerId,
  findStripeCustomerByEmail,
} from "@/lib/stripe";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function GET(request: NextRequest) {
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
        {
          hasActiveSubscription: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        },
        { status: 200 }
      );
    }

    const customer = await findStripeCustomerByEmail(customerEmail);
    if (!customer) {
      return NextResponse.json(
        {
          hasActiveSubscription: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        },
        { status: 200 }
      );
    }

    const subscription = await findProfessionalSubscriptionByCustomerId(
      customer.id
    );

    if (!subscription) {
      return NextResponse.json(
        {
          hasActiveSubscription: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasActiveSubscription: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stripe subscription status error:", error);
    return NextResponse.json(
      { error: getErrorMessage("billingPortalFailed", locale) },
      { status: 500 }
    );
  }
}
